import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { uploadToDrive } from '@/app/lib/googleDrive'

const MAX_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

export async function POST(request: NextRequest) {
  // Verificar autenticación
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const nombre = formData.get('nombre') as string
  const tipo = formData.get('tipo') as string
  const materiaId = formData.get('materia_id') as string
  const ingenieriaId = formData.get('ingenieria_id') as string
  const descripcion = formData.get('descripcion') as string | null

  // Validaciones
  if (!file) return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 })
  if (!nombre?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  if (!['resumen', 'parcial', 'tp'].includes(tipo)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  if (!materiaId) return NextResponse.json({ error: 'La materia es requerida' }, { status: 400 })
  if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: 'El archivo supera los 20 MB' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })

  // Subir a Google Drive
  const buffer = Buffer.from(await file.arrayBuffer())
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  const driveFileId = await uploadToDrive(buffer, safeName, file.type)

  // Insertar en Supabase
  const { data, error } = await supabase
    .from('archivos')
    .insert({
      nombre: nombre.trim(),
      tipo,
      materia_id: parseInt(materiaId),
      ingenieria_id: ingenieriaId ? parseInt(ingenieriaId) : null,
      drive_file_id: driveFileId,
      descripcion: descripcion?.trim() || null,
      auth_user_id: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ archivo: data })
}
