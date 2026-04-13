import { createClient } from '@/app/lib/supabase/server'
import { deleteFromDrive } from '@/app/lib/googleDrive'

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const { data: mod } = await supabase
    .from('moderadores')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!mod) {
    return Response.json({ error: 'No tenés permisos de moderador.' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const archivoId = searchParams.get('archivoId')
  if (!archivoId) {
    return Response.json({ error: 'ID de archivo requerido.' }, { status: 400 })
  }

  const { data: archivo } = await supabase
    .from('archivos')
    .select('drive_file_id')
    .eq('id', Number(archivoId))
    .single()

  if (archivo?.drive_file_id) {
    try {
      await deleteFromDrive(archivo.drive_file_id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[mod-archivo] Error al eliminar de Drive:', msg)
      return Response.json({ error: `No se pudo eliminar el archivo de Drive: ${msg}` }, { status: 500 })
    }
  }

  await supabase.from('archivos').delete().eq('id', Number(archivoId))
  return Response.json({ ok: true })
}
