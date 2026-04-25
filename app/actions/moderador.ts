'use server'

import { createClient } from '@/app/lib/supabase/server'

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

  const { error } = await supabase.from('foro_post').delete().eq('id', postId)
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

  const { error } = await supabase.from('foro_comment').delete().eq('id', comentarioId)
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

  const { error } = await supabase
    .from('profiles')
    .update({
      is_banned: true,
      banned_at: new Date().toISOString(),
      ban_reason: reason.trim() || null,
      banned_by: user.id,
    })
    .eq('id', targetUserId)

  if (error) return { error: 'Error al banear al usuario.' }
  return {}
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
