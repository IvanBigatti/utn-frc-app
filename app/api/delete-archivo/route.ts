import { createClient } from '@/app/lib/supabase/server'
import { deleteFromDrive } from '@/app/lib/googleDrive'

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Debés iniciar sesión.' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const archivoId = searchParams.get('archivoId')
  if (!archivoId) {
    return Response.json({ error: 'ID de archivo requerido.' }, { status: 400 })
  }

  // Verificar que el archivo pertenece al usuario
  const { data: archivo } = await supabase
    .from('archivos')
    .select('drive_file_id, auth_user_id')
    .eq('id', Number(archivoId))
    .single()

  if (!archivo) {
    return Response.json({ error: 'Archivo no encontrado.' }, { status: 404 })
  }

  if (archivo.auth_user_id !== user.id) {
    return Response.json({ error: 'No tenés permiso para eliminar este archivo.' }, { status: 403 })
  }

  if (archivo.drive_file_id) {
    try {
      await deleteFromDrive(archivo.drive_file_id)
    } catch (err) {
      console.error('[delete-archivo] Error al eliminar de Drive:', err instanceof Error ? err.message : err)
    }
  }

  await supabase.from('archivos').delete().eq('id', Number(archivoId))
  return Response.json({ ok: true })
}
