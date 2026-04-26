import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

const MAX_SIZE_BYTES = 20 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json() as {
    fileName: string
    mimeType: string
    fileSize: number
    nombre: string
    tipo: string
    materia_id: string
    ingenieria_id?: string
    descripcion?: string
  }

  const { fileName, mimeType, fileSize, nombre, tipo, materia_id } = body

  if (!nombre?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  if (!['resumen', 'parcial', 'tp'].includes(tipo)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  if (!materia_id) return NextResponse.json({ error: 'La materia es requerida' }, { status: 400 })
  if (!fileSize || fileSize > MAX_SIZE_BYTES) return NextResponse.json({ error: 'El archivo supera los 20 MB' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(mimeType)) return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })
  if (!fileName) return NextResponse.json({ error: 'Nombre de archivo requerido' }, { status: 400 })

  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const filePath = `temp/${safeName}`

  try {
    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin.storage
      .from('uploads-temp')
      .createSignedUploadUrl(filePath)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ signedUrl: data.signedUrl, filePath, mimeType })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
