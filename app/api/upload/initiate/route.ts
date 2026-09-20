import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { consumirLimite, mensajeLimite, LIMITES_SUBIDA } from '@/app/lib/rateLimit'

const MAX_SIZE_BYTES = 20 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // El límite se cobra ACÁ y no en /complete: si se cobrara al final, un
  // atacante podría pedir miles de URLs firmadas gratis y subir a Storage sin
  // pasar nunca por el cierre.
  const limite = await consumirLimite('subir', user.id, LIMITES_SUBIDA)
  if (!limite.permitido) {
    return NextResponse.json(
      { error: mensajeLimite(limite.reintentarEnSegundos) },
      { status: 429, headers: { 'Retry-After': String(limite.reintentarEnSegundos) } },
    )
  }

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

  // La ruta lleva el id del dueño adentro. Antes era `temp/<timestamp>-<nombre>`,
  // sin dueño, así que cualquier usuario autenticado que adivinara o viera una
  // ruta ajena podía cerrarla en /complete y quedarse con el archivo de otro.
  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const filePath = `temp/${user.id}/${safeName}`

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
