import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import ModClient, { type ModData } from './ModClient'

export default async function ModPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: modData } = await supabase
    .from('moderadores')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!modData) redirect('/')

  // El guard pasa a ser un redirect del servidor. Antes se resolvía en el
  // navegador, así que quien no era moderador veía el panel armarse antes de
  // que lo echaran.

  // TODO: estas dos traen las tablas de reportes ENTERAS para contar por id en
  // JS, sin filtro ni límite. Movidas al servidor ya no bajan al celular de
  // nadie, pero siguen creciendo sin techo. La salida es una vista que agrupe.
  const [{ data: postReportRows }, { data: commentReportRows }] = await Promise.all([
    supabase.from('foro_report').select('post_id'),
    supabase.from('foro_comment_report').select('comment_id'),
  ])

  const postCounts: Record<number, number> = {}
  postReportRows?.forEach((r: { post_id: number }) => { postCounts[r.post_id] = (postCounts[r.post_id] ?? 0) + 1 })
  const commentCounts: Record<number, number> = {}
  commentReportRows?.forEach((r: { comment_id: number }) => { commentCounts[r.comment_id] = (commentCounts[r.comment_id] ?? 0) + 1 })

  const reportedPostIds = Object.keys(postCounts).map(Number)
  const reportedCommentIds = Object.keys(commentCounts).map(Number)

  const [postsRes, commentsRes] = await Promise.all([
    reportedPostIds.length > 0
      ? supabase.from('foro_post_summary').select('id, titulo, contenido, auth_user_id, anonimo, created_at').in('id', reportedPostIds)
      : Promise.resolve({ data: [] as { id: number; titulo: string; contenido: string; auth_user_id: string; anonimo: boolean; created_at: string }[] }),
    reportedCommentIds.length > 0
      ? supabase.from('foro_comment_summary').select('id, contenido, post_id, auth_user_id, anonimo, created_at').in('id', reportedCommentIds)
      : Promise.resolve({ data: [] as { id: number; contenido: string; post_id: number; auth_user_id: string; anonimo: boolean; created_at: string }[] }),
  ])

  const reportedPosts: ModData['reportedPosts'] = (postsRes.data ?? []).map(p => ({
    postId: p.id,
    titulo: p.titulo,
    contenido: p.contenido,
    auth_user_id: p.auth_user_id,
    anonimo: p.anonimo,
    created_at: p.created_at,
    reportCount: postCounts[p.id] ?? 0,
  }))

  const reportedComments: ModData['reportedComments'] = (commentsRes.data ?? []).map(c => ({
    commentId: c.id,
    contenido: c.contenido,
    post_id: c.post_id,
    auth_user_id: c.auth_user_id,
    anonimo: c.anonimo,
    created_at: c.created_at,
    reportCount: commentCounts[c.id] ?? 0,
  }))

  const uids = [...new Set([
    ...reportedPosts.filter(p => !p.anonimo).map(p => p.auth_user_id),
    ...reportedComments.filter(c => !c.anonimo).map(c => c.auth_user_id),
  ])]

  const authorMap: Record<string, string> = {}
  if (uids.length > 0) {
    const { data: displayRes } = await supabase.rpc('get_user_display_names', { user_ids: uids })
    ;(displayRes ?? []).forEach((row: { id: string; display_name: string }) => {
      authorMap[row.id] = row.display_name
    })
  }

  return <ModClient data={{ reportedPosts, reportedComments, authorMap }} />
}
