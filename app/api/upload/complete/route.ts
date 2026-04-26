import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { verifyDriveFile, makeFilePublic } from '@/app/lib/googleDrive'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json() as {
    fileId: string
    nombre: string
    tipo: string
    materia_id: string
    ingenieria_id?: string
    descripcion?: string
  }

  const { fileId, nombre, tipo, materia_id, ingenieria_id, descripcion } = body

  if (!fileId) return NextResponse.json({ error: 'fileId requerido' }, { status: 400 })

  try {
    await verifyDriveFile(fileId)
    await makeFilePublic(fileId)

    const { data, error } = await supabase
      .from('archivos')
      .insert({
        nombre: nombre.trim(),
        tipo,
        materia_id: parseInt(materia_id),
        ingenieria_id: ingenieria_id ? parseInt(ingenieria_id) : null,
        drive_file_id: fileId,
        descripcion: descripcion?.trim() || null,
        auth_user_id: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ archivo: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
