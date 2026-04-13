import { createClient } from '@/app/lib/supabase/server'
import { deleteFromDrive } from '@/app/lib/googleDrive'

const REPORTES_PARA_ELIMINAR = 3

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Debés iniciar sesión para reportar.' }, { status: 401 })
  }

  const { archivoId } = await req.json()
  if (!archivoId) {
    return Response.json({ error: 'ID de archivo requerido.' }, { status: 400 })
  }

  const { error: insertError } = await supabase
    .from('archivo_report')
    .insert({ archivo_id: archivoId, auth_user_id: user.id })

  if (insertError?.code === '23505') {
    return Response.json({ error: 'Ya reportaste este archivo.' })
  }
  if (insertError) {
    return Response.json({ error: 'Error al reportar. Intentá de nuevo.' }, { status: 500 })
  }

  const { count } = await supabase
    .from('archivo_report')
    .select('*', { count: 'exact', head: true })
    .eq('archivo_id', archivoId)

  if ((count ?? 0) >= REPORTES_PARA_ELIMINAR) {
    const { data: archivo } = await supabase
      .from('archivos')
      .select('drive_file_id')
      .eq('id', archivoId)
      .single()

    if (archivo?.drive_file_id) {
      try {
        await deleteFromDrive(archivo.drive_file_id)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[report-archivo] Error al eliminar de Drive:', msg)
        return Response.json({ error: `No se pudo eliminar el archivo de Drive: ${msg}` }, { status: 500 })
      }
    }

    await supabase.from('archivos').delete().eq('id', archivoId)
    return Response.json({ deleted: true })
  }

  return Response.json({ ok: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const archivoId = searchParams.get('archivoId')
  if (!archivoId) {
    return Response.json({ error: 'ID de archivo requerido.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('archivo_report')
    .delete()
    .eq('archivo_id', Number(archivoId))
    .eq('auth_user_id', user.id)

  if (error) return Response.json({ error: 'Error al quitar el reporte.' }, { status: 500 })
  return Response.json({ ok: true })
}
