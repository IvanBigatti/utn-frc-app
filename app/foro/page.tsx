import { Suspense } from 'react'
import { createClient } from '@/app/lib/supabase/server'
import ForoClient, { type ForoData } from './ForoClient'

// Debe coincidir con el PAGE_SIZE del cliente: el servidor entrega la primera
// página y el cliente sigue desde ahí calculando el offset con posts.length.
const PAGE_SIZE = 20

type SearchParams = Promise<{
  carreraId?: string
  anio?: string
  materiaId?: string
  comisionId?: string
  tipo?: string
  sort?: string
}>

async function Foro({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('foro_post_summary')
    .select(`
      id, titulo, contenido, created_at, auth_user_id, anonimo,
      ingenieria_id, anio, tipo, vote_score, comment_count,
      comision:comision_id ( id, nombre ),
      materia:materia_id ( id, nombre ),
      ingenieria:ingenieria_id ( id, nombre )
    `)

  if (sp.carreraId)  query = query.eq('ingenieria_id', Number(sp.carreraId))
  if (sp.anio)       query = query.eq('anio', Number(sp.anio))
  if (sp.materiaId)  query = query.eq('materia_id', Number(sp.materiaId))
  if (sp.comisionId) query = query.eq('comision_id', Number(sp.comisionId))
  if (sp.tipo)       query = query.eq('tipo', sp.tipo)

  if (sp.sort === 'votados') {
    query = query.order('vote_score', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }
  // Mismo desempate que el cliente, o la página 2 no engancharía con la 1.
  query = query.order('id', { ascending: false })

  // PAGE_SIZE + 1 para saber si hay más, igual que en el cliente.
  const [{ data: filas }, modRes] = await Promise.all([
    query.range(0, PAGE_SIZE),
    user
      ? supabase.from('moderadores').select('user_id').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const todas = (filas ?? []) as unknown as ForoData['posts']
  const posts = todas.slice(0, PAGE_SIZE)

  const uids = [...new Set(posts.filter(p => !p.anonimo).map(p => p.auth_user_id))]
  const authorMap: ForoData['authorMap'] = {}
  if (uids.length > 0) {
    const [displayNamesRes, profilesRes, modsRes] = await Promise.all([
      supabase.rpc('get_user_display_names', { user_ids: uids }),
      supabase.from('profiles').select('id, avatar_key, avatar_src').in('id', uids),
      supabase.from('moderadores').select('user_id').in('user_id', uids),
    ])
    const modSet = new Set((modsRes.data ?? []).map((m: { user_id: string }) => m.user_id))
    uids.forEach(uid => { authorMap[uid] = { name: 'usuario', avatarKey: null, avatarSrc: null, isMod: modSet.has(uid) } })
    ;(displayNamesRes.data ?? []).forEach((row: { id: string; display_name: string }) => {
      if (authorMap[row.id]) authorMap[row.id].name = row.display_name
    })
    ;(profilesRes.data ?? []).forEach((p: { id: string; avatar_key: string | null; avatar_src: string | null }) => {
      if (authorMap[p.id]) { authorMap[p.id].avatarKey = p.avatar_key; authorMap[p.id].avatarSrc = p.avatar_src }
    })
  }

  // Los votos propios también salen de acá. Es el último viaje que le quedaba
  // al navegador en la carga inicial del foro.
  const userVotes: ForoData['userVotes'] = {}
  if (user && posts.length > 0) {
    const { data: votos } = await supabase
      .from('foro_vote')
      .select('post_id, value')
      .eq('auth_user_id', user.id)
      .in('post_id', posts.map(p => p.id))
    ;(votos ?? []).forEach((v: { post_id: number; value: 1 | -1 }) => { userVotes[v.post_id] = v.value })
  }

  const data: ForoData = {
    posts,
    authorMap,
    userVotes,
    hasMore: todas.length > PAGE_SIZE,
    userId: user?.id ?? null,
    esMod: !!modRes.data,
  }

  return <ForoClient data={data} />
}

export default function ForoPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="foro-loading-state" role="status">Cargando publicaciones...</div>}>
      <Foro searchParams={searchParams} />
    </Suspense>
  )
}
