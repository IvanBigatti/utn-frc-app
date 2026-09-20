import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import type { AvatarConfig } from '@/app/components/avatars'
import PerfilClient, { type PerfilData } from './PerfilClient'

type SearchParams = Promise<{ uid?: string }>

export default async function PerfilPage({ searchParams }: { searchParams: SearchParams }) {
  const { uid: uidParam } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const currentUid = user.id
  const viewedUid = uidParam && uidParam !== currentUid ? uidParam : currentUid
  const isOwnProfile = viewedUid === currentUid

  // Una sola tanda. Todo esto depende sólo de los uids, que ya tenemos, así
  // que nada justifica encadenarlo. Antes el navegador lo pedía en cuatro
  // tandas: el par de moderadores esperaba al lote de siete sin necesitarlo.
  const [
    profileRes, postsCountRes, archivosRes, postsRes,
    upvotesRes, ratingsRes, avatarConfigsRes, votesRes,
    modRes, viewedModRes,
  ] = await Promise.all([
    supabase.from('profiles').select('avatar_key, avatar_src, username').eq('id', viewedUid).maybeSingle(),
    supabase.from('foro_post').select('*', { count: 'exact', head: true }).eq('auth_user_id', viewedUid),
    supabase.from('archivos').select('*', { count: 'exact', head: true }).eq('auth_user_id', viewedUid),
    supabase
      .from('foro_post_summary')
      .select('id, titulo, created_at, vote_score, comment_count')
      .eq('auth_user_id', viewedUid)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('foro_vote').select('*', { count: 'exact', head: true }).eq('auth_user_id', viewedUid).eq('value', 1),
    supabase.from('puntuaciones').select('*', { count: 'exact', head: true }).eq('usuario_id', viewedUid),
    supabase.from('avatar_configs').select('*').order('display_order'),
    // Suma los votos recibidos en TODOS los posts, no sólo en los 20 que se
    // listan. Sigue trayendo una fila por post para sumar acá; del lado del
    // servidor eso cuesta ~2ms, así que no justifica una RPC todavía.
    supabase.from('foro_post_summary').select('vote_score').eq('auth_user_id', viewedUid),
    supabase.from('moderadores').select('user_id').eq('user_id', currentUid).maybeSingle(),
    supabase.from('moderadores').select('user_id').eq('user_id', viewedUid).maybeSingle(),
  ])

  const isMod = !!modRes.data

  // Único encadenamiento que queda, y es real: sólo se consulta si quien mira
  // es moderador, y eso recién se sabe con la respuesta de arriba.
  let targetIsBanned = false
  let targetBanReason = ''
  if (isMod && !isOwnProfile) {
    const { data: banData } = await supabase
      .from('profiles')
      .select('is_banned, ban_reason')
      .eq('id', viewedUid)
      .maybeSingle()
    targetIsBanned = !!banData?.is_banned
    targetBanReason = banData?.ban_reason ?? ''
  }

  const data: PerfilData = {
    viewedUid,
    isOwnProfile,
    email: isOwnProfile ? user.email ?? null : null,
    avatarKey: profileRes.data?.avatar_key ?? null,
    avatarSrc: profileRes.data?.avatar_src ?? null,
    username: profileRes.data?.username ?? null,
    metrics: {
      posts: postsCountRes.count ?? 0,
      votes: (votesRes.data ?? []).reduce((acc, p) => acc + (p.vote_score ?? 0), 0),
      archivos: archivosRes.count ?? 0,
      upvotes_given: upvotesRes.count ?? 0,
      ratings_given: ratingsRes.count ?? 0,
    },
    posts: (postsRes.data ?? []) as PerfilData['posts'],
    avatarConfigs: (avatarConfigsRes.data ?? []) as AvatarConfig[],
    isMod,
    isViewedUserMod: !!viewedModRes.data,
    targetIsBanned,
    targetBanReason,
  }

  return <PerfilClient data={data} />
}
