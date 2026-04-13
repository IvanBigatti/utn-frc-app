'use server'

import { createClient } from '@/app/lib/supabase/server'

const REPORTES_PARA_ELIMINAR = 3

export async function reportarPost(postId: number): Promise<{ error?: string; deleted?: boolean; ok?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Debés iniciar sesión para reportar.' }

  const { error: insertError } = await supabase
    .from('foro_report')
    .insert({ post_id: postId, auth_user_id: user.id })

  if (insertError?.code === '23505') return { error: 'Ya reportaste esta publicación.' }
  if (insertError) return { error: 'Error al reportar. Intentá de nuevo.' }

  const { count } = await supabase
    .from('foro_report')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)

  if ((count ?? 0) >= REPORTES_PARA_ELIMINAR) {
    await supabase.from('foro_post').delete().eq('id', postId)
    return { deleted: true }
  }

  return { ok: true }
}

export async function reportarComentario(comentarioId: number): Promise<{ error?: string; deleted?: boolean; ok?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Debés iniciar sesión para reportar.' }

  const { error: insertError } = await supabase
    .from('foro_comment_report')
    .insert({ comment_id: comentarioId, auth_user_id: user.id })

  if (insertError?.code === '23505') return { error: 'Ya reportaste este comentario.' }
  if (insertError) return { error: 'Error al reportar. Intentá de nuevo.' }

  const { count } = await supabase
    .from('foro_comment_report')
    .select('*', { count: 'exact', head: true })
    .eq('comment_id', comentarioId)

  if ((count ?? 0) >= REPORTES_PARA_ELIMINAR) {
    await supabase.from('foro_comment').delete().eq('id', comentarioId)
    return { deleted: true }
  }

  return { ok: true }
}

export async function quitarReportePost(postId: number): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado.' }

  const { error } = await supabase
    .from('foro_report')
    .delete()
    .eq('post_id', postId)
    .eq('auth_user_id', user.id)

  if (error) return { error: 'Error al quitar el reporte.' }
  return { ok: true }
}

export async function quitarReporteComentario(comentarioId: number): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado.' }

  const { error } = await supabase
    .from('foro_comment_report')
    .delete()
    .eq('comment_id', comentarioId)
    .eq('auth_user_id', user.id)

  if (error) return { error: 'Error al quitar el reporte.' }
  return { ok: true }
}
