'use server'

import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { deleteFromDrive } from '@/app/lib/googleDrive'

export async function esModerador(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('moderadores')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return !!data
}

export async function eliminarPostMod(postId: number): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: mod } = await supabase
    .from('moderadores')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!mod) return { error: 'No tenés permisos de moderador.' }

  const admin = createAdminClient()
  const { error } = await admin.from('foro_post').delete().eq('id', postId)
  if (error) return { error: 'Error al eliminar la publicación.' }
  return {}
}

export async function eliminarComentarioMod(comentarioId: number): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: mod } = await supabase
    .from('moderadores')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!mod) return { error: 'No tenés permisos de moderador.' }

  const admin = createAdminClient()
  const { error } = await admin.from('foro_comment').delete().eq('id', comentarioId)
  if (error) return { error: 'Error al eliminar el comentario.' }
  return {}
}

export async function banearUsuario(targetUserId: string, reason: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  if (user.id === targetUserId) return { error: 'No podés banearte a vos mismo.' }

  const { data: mod } = await supabase
    .from('moderadores')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!mod) return { error: 'No tenés permisos de moderador.' }

  const uid = targetUserId
  const admin = createAdminClient()

  // Eliminar archivos de Google Drive del usuario
  const { data: archivos } = await supabase
    .from('archivos')
    .select('drive_file_id')
    .eq('auth_user_id', uid)

  if (archivos?.length) {
    await Promise.allSettled(archivos.map((a) => deleteFromDrive(a.drive_file_id)))
  }

  // Eliminar contenido del usuario en orden (respetando FK)
  await admin.from('foro_vote').delete().eq('auth_user_id', uid)
  await admin.from('foro_comment_report').delete().eq('auth_user_id', uid)
  await admin.from('foro_report').delete().eq('auth_user_id', uid)
  await admin.from('puntuaciones').delete().eq('usuario_id', uid)
  await admin.from('foro_comment').delete().eq('auth_user_id', uid)
  await admin.from('archivos').delete().eq('auth_user_id', uid)
  await admin.from('foro_post').delete().eq('auth_user_id', uid)
  await admin.from('progreso').delete().eq('user_id', uid)

  // Marcar el baneo en profiles
  const { error } = await admin
    .from('profiles')
    .update({
      is_banned: true,
      banned_at: new Date().toISOString(),
      ban_reason: reason.trim() || null,
      banned_by: user.id,
    })
    .eq('id', uid)

  if (error) return { error: 'Error al banear al usuario.' }
  return {}
}

export async function buscarUsuarios(query: string): Promise<{ id: string; email: string }[]> {
  if (!query.trim() || query.trim().length < 2) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: mod } = await supabase
    .from('moderadores')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!mod) return []

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error || !data?.users) return []

  const q = query.toLowerCase().trim()
  return data.users
    .filter(u => u.email?.toLowerCase().includes(q))
    .slice(0, 10)
    .map(u => ({ id: u.id, email: u.email! }))
}

export async function desbanearUsuario(targetUserId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: mod } = await supabase
    .from('moderadores')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!mod) return { error: 'No tenés permisos de moderador.' }

  const { error } = await supabase
    .from('profiles')
    .update({
      is_banned: false,
      banned_at: null,
      ban_reason: null,
      banned_by: null,
    })
    .eq('id', targetUserId)

  if (error) return { error: 'Error al desbanear al usuario.' }
  return {}
}
