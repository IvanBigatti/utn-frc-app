import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { uploadToDrive } from '@/app/lib/googleDrive'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json() as {
    filePath: string
    mimeType: string
    nombre: string
    tipo: string
    materia_id: string
    ingenieria_id?: string
    descripcion?: string
  }

  const { filePath, mimeType, nombre, tipo, materia_id, ingenieria_id, descripcion } = body

  if (!filePath) return NextResponse.json({ error: 'filePath requerido' }, { status: 400 })
  if (!mimeType) return NextResponse.json({ error: 'mimeType requerido' }, { status: 400 })

  const supabaseAdmin = createAdminClient()

  try {
    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from('uploads-temp')
      .download(filePath)

    if (downloadError) return NextResponse.json({ error: downloadError.message }, { status: 500 })

    const buffer = Buffer.from(await fileBlob.arrayBuffer())
    const safeName = filePath.split('/').pop() ?? filePath

    const driveFileId = await uploadToDrive(buffer, safeName, mimeType)

    const { data, error } = await supabase
      .from('archivos')
      .insert({
        nombre: nombre.trim(),
        tipo,
        materia_id: parseInt(materia_id),
        ingenieria_id: ingenieria_id ? parseInt(ingenieria_id) : null,
        drive_file_id: driveFileId,
        descripcion: descripcion?.trim() || null,
        auth_user_id: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin.storage.from('uploads-temp').remove([filePath])

    return NextResponse.json({ archivo: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
