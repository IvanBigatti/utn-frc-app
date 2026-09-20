"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import FiltroPanel from "./FiltroPanel";
import "./foro.css";
import NuevoPostPanel from "./formForo";
import { getAvatarSrc } from "@/app/components/avatars";
import { eliminarPostMod, banearUsuario } from "@/app/actions/moderador";

type TipoPost = "Pregunta" | "Recurso" | "Debate" | "Aviso";

type Post = {
  id: number;
  titulo: string;
  contenido: string;
  created_at: string;
  auth_user_id: string;
  anonimo: boolean;
  ingenieria_id: number | null;
  ingenieria: { id: number; nombre: string } | null;
  anio: number | null;
  comision: { id: number; nombre: string } | null;
  materia: { id: number; nombre: string } | null;
  tipo: TipoPost | null;
  vote_score: number;
  comment_count: number;
};

type AuthorInfo = { name: string; avatarKey: string | null; avatarSrc: string | null; isMod: boolean };

type Filtros = {
  carreraId: number | null;
  anio: number | null;
  materiaId: number | null;
  comisionId: number | null;
  tipo: TipoPost | null;
};

type SortOrder = "recientes" | "votados";

// 20 entra en una pantalla y media. Suficiente para que casi nadie necesite
// pedir la segunda página, y chico para que la primera llegue rápido.
const PAGE_SIZE = 20;

export type ForoData = {
  posts: Post[];
  authorMap: Record<string, AuthorInfo>;
  userVotes: Record<number, 1 | -1>;
  hasMore: boolean;
  userId: string | null;
  esMod: boolean;
};

export default function ForoClient({ data }: { data: ForoData }) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // La primera página llega dentro del HTML. Antes el navegador la pedía
  // después de montar: sesión, chequeo de moderador, posts y autores, todo
  // desde Argentina a ~200ms por viaje. Las páginas siguientes y los cambios
  // de filtro SÍ siguen siendo del cliente, porque los dispara la persona.
  const [posts, setPosts] = useState<Post[]>(data.posts);
  // Ids tal como los devolvió la última consulta al servidor. Ver el efecto
  // de votos más abajo para por qué no se derivan de `posts`.
  const [fetchedIdsKey, setFetchedIdsKey] = useState(data.posts.map((p) => p.id).join(","));
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(data.hasMore);
  const [filtroOpen, setFiltroOpen] = useState(false);
  const [nuevoPostOpen, setNuevoPostOpen] = useState(false);
  const userId = data.userId;
  const esMod = data.esMod;
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    (searchParams.get("sort") as SortOrder | null) ?? "recientes"
  );
  const [userVotes, setUserVotes] = useState<Record<number, 1 | -1>>(data.userVotes);
  const [authorMap, setAuthorMap] = useState<Record<string, AuthorInfo>>(data.authorMap);

  const [filtros, setFiltros] = useState<Filtros>(() => ({
    carreraId: searchParams.get("carreraId") ? Number(searchParams.get("carreraId")) : null,
    anio: searchParams.get("anio") ? Number(searchParams.get("anio")) : null,
    materiaId: searchParams.get("materiaId") ? Number(searchParams.get("materiaId")) : null,
    comisionId: searchParams.get("comisionId") ? Number(searchParams.get("comisionId")) : null,
    tipo: (searchParams.get("tipo") as TipoPost | null) ?? null,
  }));
  const [confirmando, setConfirmando] = useState<{ id: number; tipo: "propio" | "mod" } | null>(null);
  const [votingPosts, setVotingPosts] = useState<Set<number>>(new Set());
  const votingPostsRef = useRef<Set<number>>(new Set());
  // Número de la última carga pedida. Ver cargarPagina.
  const pedidoRef = useRef(0);
  const [baneando, setBaneando] = useState<{ uid: string; postId: number } | null>(null);
  const [banReason, setBanReason] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((msg: string, type: "success" | "error" = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Sync filters + sort order to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filtros.carreraId) params.set("carreraId", String(filtros.carreraId));
    if (filtros.anio)      params.set("anio",      String(filtros.anio));
    if (filtros.materiaId) params.set("materiaId", String(filtros.materiaId));
    if (filtros.comisionId) params.set("comisionId", String(filtros.comisionId));
    if (filtros.tipo)      params.set("tipo",      filtros.tipo);
    if (sortOrder !== "recientes") params.set("sort", sortOrder);
    const qs = params.toString();
    // history.replaceState y no router.replace: replaceState se integra con el
    // router y sincroniza useSearchParams SIN pedirle nada al servidor. Con
    // router.replace, ahora que la página es un componente de servidor, cada
    // cambio de filtro dispararía un render del servidor ADEMÁS de la consulta
    // del cliente: la misma página traída dos veces.
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  }, [filtros, sortOrder, pathname]);

  // Trae UNA página. Antes traía la tabla entera: sin `.range()` el navegador
  // se bajaba todos los posts que existieran, con el cuerpo completo de cada
  // uno, por un cable de 150ms hasta Argentina.
  //
  // Y no era sólo lento: la consulta de autores de más abajo manda los uids en
  // la query string (`?id=in.(uuid,uuid,...)`). Con UUIDs de 36 caracteres,
  // ~200 autores distintos pasan los 8 KB que suele aceptar un proxy y la
  // petición empieza a fallar con 414. O sea que el foro se ROMPÍA al crecer,
  // no se degradaba. Con 20 por página el problema desaparece.
  const cargarPagina = useCallback(async (offset: number, modo: "reemplazar" | "agregar") => {
    // Sin esto: pedís "cargar más", cambiás el orden antes de que llegue, y la
    // respuesta vieja se AGREGA sobre la lista nueva. Quedan dos ordenamientos
    // mezclados y el offset siguiente sale mal. Cada llamada se queda con su
    // número; si dejó de ser la última, descarta lo que llegó.
    const idPedido = ++pedidoRef.current;
    const vigente = () => idPedido === pedidoRef.current;

    if (modo === "reemplazar") setLoading(true); else setLoadingMore(true);

    let query = supabase
      .from("foro_post_summary")
      .select(`
        id, titulo, contenido, created_at, auth_user_id, anonimo,
        ingenieria_id, anio, tipo, vote_score, comment_count,
        comision:comision_id ( id, nombre ),
        materia:materia_id ( id, nombre ),
        ingenieria:ingenieria_id ( id, nombre )
      `);

    if (filtros.carreraId) query = query.eq("ingenieria_id", filtros.carreraId);
    if (filtros.anio)       query = query.eq("anio", filtros.anio);
    if (filtros.materiaId)  query = query.eq("materia_id", filtros.materiaId);
    if (filtros.comisionId) query = query.eq("comision_id", filtros.comisionId);
    if (filtros.tipo)       query = query.eq("tipo", filtros.tipo);

    if (sortOrder === "votados") {
      query = query.order("vote_score", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Desempate estable: sin esto, dos posts con el mismo score pueden salir en
    // distinto orden entre página y página y aparecer repetidos o salteados.
    query = query.order("id", { ascending: false });

    // Se piden PAGE_SIZE + 1 y se muestra PAGE_SIZE. La fila sobrante es la
    // única forma de saber si hay más sin una consulta de conteo aparte: con
    // `length === PAGE_SIZE` no se distingue "hay otra página" de "justo
    // terminó", y con 20, 40 o 60 posts el botón aparecía para no traer nada.
    const { data, error } = await query.range(offset, offset + PAGE_SIZE);
    if (!vigente()) return;
    if (error || !data) { setLoading(false); setLoadingMore(false); return; }

    const filas = data as unknown as Post[];
    const pagina = filas.slice(0, PAGE_SIZE);
    setHasMore(filas.length > PAGE_SIZE);

    // Dos actualizaciones independientes. Meter una adentro del updater de la
    // otra no es confiable: React puede ejecutar ese updater más de una vez.
    //
    // Al agregar se descartan los ids que ya están en pantalla. Paginar por
    // offset no es inmune a que la lista se mueva debajo tuyo: si otra persona
    // publica mientras leés, todo baja un lugar y el offset siguiente devuelve
    // una fila que ya viste. El filtro la saca.
    setPosts((prev) => {
      if (modo === "reemplazar") return pagina;
      const yaEstan = new Set(prev.map((p) => p.id));
      return [...prev, ...pagina.filter((p) => !yaEstan.has(p.id))];
    });
    setFetchedIdsKey((prev) => {
      const nuevos = pagina.map((p) => p.id).join(",");
      if (modo === "reemplazar") return nuevos;
      return prev && nuevos ? `${prev},${nuevos}` : prev || nuevos;
    });

    // Info de autores: sólo la de ESTA página. Al agregar se fusiona con lo que
    // ya había en vez de reemplazarlo, o las páginas viejas perderían su autor.
    const uids = [...new Set(pagina.filter(p => !p.anonimo).map(p => p.auth_user_id))];
    if (uids.length > 0) {
      const [displayNamesRes, profilesRes, modsRes] = await Promise.all([
        supabase.rpc("get_user_display_names", { user_ids: uids }),
        supabase.from("profiles").select("id, avatar_key, avatar_src").in("id", uids),
        supabase.from("moderadores").select("user_id").in("user_id", uids),
      ]);
      const modSet = new Set((modsRes.data ?? []).map((m: { user_id: string }) => m.user_id));
      const map: Record<string, AuthorInfo> = {};
      uids.forEach(uid => { map[uid] = { name: "usuario", avatarKey: null, avatarSrc: null, isMod: modSet.has(uid) }; });
      (displayNamesRes.data ?? []).forEach((row: { id: string; display_name: string }) => {
        if (map[row.id]) map[row.id].name = row.display_name;
      });
      (profilesRes.data ?? []).forEach((p: { id: string; avatar_key: string | null; avatar_src: string | null }) => {
        if (map[p.id]) { map[p.id].avatarKey = p.avatar_key; map[p.id].avatarSrc = p.avatar_src; }
      });
      if (!vigente()) return;
      setAuthorMap((prev) => ({ ...prev, ...map }));
    }

    setLoading(false);
    setLoadingMore(false);
  }, [filtros, sortOrder]);

  // Cambiar filtros u orden arranca de cero, pero la combinación que el
  // servidor ya renderizó no se vuelve a pedir.
  //
  // No alcanza con un ref booleano de "primera vuelta". En desarrollo React
  // corre los efectos dos veces a propósito (monta, limpia, vuelve a montar) y
  // los refs sobreviven a eso, así que la primera vuelta se salteaba y la
  // segunda disparaba igual: el doble fetch volvía, sólo que invisible en
  // producción. Se guarda CUÁL combinación se trajo por última vez, arrancando
  // por la que mandó el servidor. Comparar valores es idempotente: correr el
  // efecto dos veces con la misma clave no cambia nada.
  const claveConsulta = JSON.stringify([filtros, sortOrder]);
  const ultimaClaveRef = useRef(claveConsulta);
  useEffect(() => {
    if (claveConsulta === ultimaClaveRef.current) return;
    ultimaClaveRef.current = claveConsulta;
    // Cargar en respuesta a un cambio de filtro es exactamente para lo que
    // existe este efecto; la regla apunta a otra cosa.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarPagina(0, "reemplazar");
  }, [claveConsulta, cargarPagina]);

  const cargarMas = () => {
    if (loadingMore || !hasMore) return;
    // El offset sale de posts.length a propósito, no de cuántas filas sirvió
    // el servidor. Borrar un post lo achica y publicar otra persona corre todo
    // hacia abajo, así que puede quedar por detrás del offset real — nunca por
    // delante. Quedarse corto hace que se repita alguna fila, y el filtro de
    // duplicados de cargarPagina la descarta. Pasarse, en cambio, saltearía un
    // post para siempre. Se elige el error que no pierde nada.
    cargarPagina(posts.length, "agregar");
  };

  // Qué votó ESTE usuario depende de quién es, no de cuáles son los posts.
  // Tenerlo adentro de fetchPosts metía `userId` en sus dependencias, y como
  // la sesión resuelve después del primer render, cambiar de null al uid real
  // volvía a disparar el efecto y re-pedía la lista entera de posts desde
  // cero. Todo usuario logueado pagaba el doble en cada carga del foro.
  //
  // La clave viene de lo que devolvió el SERVIDOR, no del estado `posts`.
  // Parece lo mismo y no lo es: `posts` también cambia por ediciones locales
  // —votar, borrar un post propio, banear a alguien— y derivar la clave de ahí
  // hacía que cada borrado disparara una consulta de votos al pedo. Atada a la
  // respuesta del servidor, sólo cambia cuando de verdad hay posts nuevos.
  // Mismo criterio que arriba: se recuerda para qué usuario y qué ids se
  // trajeron los votos, arrancando por lo que sembró el servidor. Un ref
  // booleano no sirve por el doble montaje de desarrollo.
  const claveVotos = `${userId ?? ""}|${fetchedIdsKey}`;
  const ultimaClaveVotosRef = useRef(claveVotos);
  useEffect(() => {
    if (claveVotos === ultimaClaveVotosRef.current) return;
    ultimaClaveVotosRef.current = claveVotos;
    // Limpiar los votos al desloguearse o quedarse sin posts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!userId || !fetchedIdsKey) { setUserVotes({}); return; }
    let cancelled = false;
    const run = async () => {
      const { data } = await supabase
        .from("foro_vote")
        .select("post_id, value")
        .eq("auth_user_id", userId)
        .in("post_id", fetchedIdsKey.split(",").map(Number));
      if (cancelled) return;
      const votesMap: Record<number, 1 | -1> = {};
      (data ?? []).forEach((v: { post_id: number; value: 1 | -1 }) => { votesMap[v.post_id] = v.value; });
      // Un voto que todavía está viajando no figura en lo que devolvió la base.
      // Reemplazar el mapa entero lo borraría de la pantalla aunque el voto sí
      // haya salido bien: votás y hacés "cargar más", y tu flecha se apaga
      // sola. Para los posts con voto en vuelo mandamos lo que hay en pantalla.
      setUserVotes((prev) => {
        const fusionado = { ...votesMap };
        votingPostsRef.current.forEach((postId) => {
          if (prev[postId] !== undefined) fusionado[postId] = prev[postId];
          else delete fusionado[postId];
        });
        return fusionado;
      });
    };
    run();
    return () => { cancelled = true; };
  }, [claveVotos, userId, fetchedIdsKey]);

  const handleVote = async (e: React.MouseEvent, postId: number, value: 1 | -1) => {
    e.stopPropagation();
    if (!userId || votingPostsRef.current.has(postId)) return;
    votingPostsRef.current.add(postId);
    setVotingPosts(new Set(votingPostsRef.current));

    const current = userVotes[postId] ?? null;
    const isUnvote = current === value;

    if (isUnvote) {
      setUserVotes((prev) => { const next = { ...prev }; delete next[postId]; return next; });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, vote_score: p.vote_score - value } : p));
      const { error } = await supabase.from("foro_vote").delete()
        .eq("post_id", postId).eq("auth_user_id", userId);
      if (error) {
        setUserVotes((prev) => ({ ...prev, [postId]: value }));
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, vote_score: p.vote_score + value } : p));
        showToast("No se pudo registrar el voto. Intentá de nuevo.");
      }
    } else {
      const delta = value - (current ?? 0);
      setUserVotes((prev) => ({ ...prev, [postId]: value }));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, vote_score: p.vote_score + delta } : p));
      const { error } = await supabase.from("foro_vote").upsert(
        { post_id: postId, auth_user_id: userId, value },
        { onConflict: "post_id,auth_user_id" }
      );
      if (error) {
        setUserVotes((prev) => {
          const next = { ...prev };
          if (current !== null) next[postId] = current; else delete next[postId];
          return next;
        });
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, vote_score: p.vote_score - delta } : p));
        showToast("No se pudo registrar el voto. Intentá de nuevo.");
      }
    }
    votingPostsRef.current.delete(postId);
    setVotingPosts(new Set(votingPostsRef.current));
  };

  const handleBanear = async (uid: string) => {
    setBaneando(null);
    const result = await banearUsuario(uid, banReason);
    setBanReason("");
    if (result.error) {
      showToast(result.error);
    } else {
      setPosts((prev) => prev.filter((p) => p.auth_user_id !== uid));
      showToast("Usuario baneado.", "success");
    }
  };

  const handleEliminar = (e: React.MouseEvent, postId: number) => {
    e.stopPropagation();
    setConfirmando({ id: postId, tipo: "propio" });
  };

  const handleConfirmarEliminar = async (e: React.MouseEvent, postId: number, tipo: "propio" | "mod") => {
    e.stopPropagation();
    setConfirmando(null);
    if (tipo === "propio") {
      const { error } = await supabase.from("foro_post").delete().eq("id", postId).eq("auth_user_id", userId);
      if (!error) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        showToast("No se pudo eliminar la publicación. Intentá de nuevo.");
      }
    } else {
      const result = await eliminarPostMod(postId);
      if (result.error) {
        showToast(result.error);
      } else {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    }
  };

  const hayFiltros = Object.values(filtros).some((v) => v !== null);
  const filtrosVacios: Filtros = { carreraId: null, anio: null, materiaId: null, comisionId: null, tipo: null };

  return (
    <div className="foro-page">
      <div className="foro-inner">

        {/* Header */}
        <div className="foro-header">
          <h1 className="foro-header__title">Foro</h1>
          <div className="foro-header__actions">
            <button
              className={`foro-filtro-btn ${hayFiltros ? "active" : ""}`}
              onClick={() => setFiltroOpen(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="11" y1="18" x2="13" y2="18" />
              </svg>
              Filtrar
              {hayFiltros && <span className="foro-filtro-btn__badge" />}
            </button>
            <button
              className="btn-primary"
              onClick={() => userId ? setNuevoPostOpen(true) : router.push('/login?next=/foro')}
            >
              + Publicar
            </button>
          </div>
        </div>

        {/* Sort */}
        <div className="foro-sort">
          <button
            className={`foro-sort__btn ${sortOrder === "recientes" ? "active" : ""}`}
            onClick={() => setSortOrder("recientes")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 11H11V7h2v6zm0 4H11v-2h2v2z"/></svg>
            Nuevo
          </button>
          <button
            className={`foro-sort__btn ${sortOrder === "votados" ? "active" : ""}`}
            onClick={() => setSortOrder("votados")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
            Top
          </button>
        </div>

        {/* Lista de posts */}
        {loading ? (
          <div className="foro-loading-state" role="status">Cargando publicaciones...</div>
        ) : posts.length === 0 ? (
          <div className="foro-empty">
            {hayFiltros ? (
              <>
                <svg className="foro-empty__icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
                  <line x1="18" y1="3" x2="22" y2="7" /><line x1="22" y1="3" x2="18" y2="7" />
                </svg>
                <p className="foro-empty__title">Sin resultados para esos filtros</p>
                <button className="btn-ghost" onClick={() => setFiltros(filtrosVacios)}>
                  Limpiar filtros
                </button>
              </>
            ) : (
              <>
                <svg className="foro-empty__icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p className="foro-empty__title">El foro todavía está vacío</p>
                <p className="foro-empty__body">
                  Preguntá sobre materias, compartí apuntes o avisá sobre un parcial. La comunidad te espera.
                </p>
                <button
                  className="btn-primary"
                  onClick={() => userId ? setNuevoPostOpen(true) : router.push('/login?next=/foro')}
                >
                  + Publicar
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="foro-list">
            {posts.map((post) => (
              <article key={post.id} className="foro-post-card" onClick={() => router.push(`/foro/${post.id}`)}>

                {/* Vote column */}
                <div className="foro-post-card__vote" onClick={(e) => e.stopPropagation()}>
                  <button
                    className={`foro-vote__btn foro-vote__btn--up ${userVotes[post.id] === 1 ? "active" : ""}`}
                    onClick={(e) => handleVote(e, post.id, 1)}
                    disabled={!userId || votingPosts.has(post.id)}
                    aria-label={userId ? `Votar positivo (puntaje actual: ${post.vote_score})` : "Iniciá sesión para votar"}
                    aria-pressed={userVotes[post.id] === 1}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4l8 8H4z"/></svg>
                  </button>
                  <span className={`foro-vote__score ${post.vote_score > 0 ? "foro-vote__score--positive" : post.vote_score < 0 ? "foro-vote__score--negative" : ""}`} aria-live="polite" aria-atomic="true">
                    {post.vote_score}
                  </span>
                  <button
                    className={`foro-vote__btn foro-vote__btn--down ${userVotes[post.id] === -1 ? "active" : ""}`}
                    onClick={(e) => handleVote(e, post.id, -1)}
                    disabled={!userId || votingPosts.has(post.id)}
                    aria-label={userId ? `Votar negativo (puntaje actual: ${post.vote_score})` : "Iniciá sesión para votar"}
                    aria-pressed={userVotes[post.id] === -1}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20l-8-8h16z"/></svg>
                  </button>
                </div>

                {/* Content column */}
                <div className="foro-post-card__body">
                  <div className="foro-post-card__meta">
                    {/* Autor */}
                    {post.anonimo ? (
                      <span className="foro-post-card__author foro-post-card__author--anon">
                        <span className="foro-post-card__author-avatar foro-post-card__author-avatar--anon">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z"/></svg>
                        </span>
                        Anónimo
                      </span>
                    ) : (
                      <Link
                        href={`/perfil?uid=${post.auth_user_id}`}
                        className="foro-post-card__author foro-post-card__author--link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="foro-post-card__author-avatar"
                          src={authorMap[post.auth_user_id]?.avatarSrc ?? getAvatarSrc(authorMap[post.auth_user_id]?.avatarKey)}
                          alt=""
                          loading="lazy"
                        />
                        {authorMap[post.auth_user_id]?.name ?? "usuario"}
                        {authorMap[post.auth_user_id]?.isMod && <span className="mod-badge">Mod</span>}
                      </Link>
                    )}
                    <span className="foro-post-card__sep">·</span>
                    {post.ingenieria?.nombre && (
                      <span className="foro-post-card__ingenieria">{post.ingenieria.nombre}</span>
                    )}
                    {post.ingenieria?.nombre && <span className="foro-post-card__sep">·</span>}
                    {post.tipo && (
                      <span className={`foro-post-card__tipo foro-post-card__tipo--${post.tipo.toLowerCase()}`}>
                        {post.tipo}
                      </span>
                    )}
                    {post.materia?.nombre && (
                      <span className="foro-post-card__tag">{post.materia.nombre}</span>
                    )}
                    {post.comision?.nombre && (
                      <span className="foro-post-card__comision">{post.comision.nombre}</span>
                    )}
                    <span className="foro-post-card__sep">·</span>
                    <span>{new Date(post.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>

                  <h2 className="foro-post-card__titulo">
                    <Link href={`/foro/${post.id}`} className="foro-post-card__titulo-link" onClick={(e) => e.stopPropagation()}>
                      {post.titulo}
                    </Link>
                  </h2>
                  <p className="foro-post-card__preview">{post.contenido}</p>

                  <div className="foro-post-card__footer">
                    <button className="foro-post-card__action-btn" onClick={(e) => { e.stopPropagation(); router.push(`/foro/${post.id}`); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      {post.comment_count} comentarios
                    </button>

                    {userId === post.auth_user_id && (
                      confirmando?.id === post.id && confirmando.tipo === "propio" ? (
                        <span className="foro-post-card__confirm" onClick={(e) => e.stopPropagation()}>
                          <span>¿Eliminar?</span>
                          <button className="foro-post-card__confirm-yes" onClick={(e) => handleConfirmarEliminar(e, post.id, "propio")}>Sí</button>
                          <button className="foro-post-card__confirm-no" onClick={(e) => { e.stopPropagation(); setConfirmando(null); }}>No</button>
                        </span>
                      ) : (
                        <button
                          className="foro-post-card__action-btn foro-post-card__action-btn--danger"
                          onClick={(e) => handleEliminar(e, post.id)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                          Eliminar
                        </button>
                      )
                    )}
                    {esMod && userId !== post.auth_user_id && (
                      confirmando?.id === post.id && confirmando.tipo === "mod" ? (
                        <span className="foro-post-card__confirm" onClick={(e) => e.stopPropagation()}>
                          <span>¿Eliminar (mod)?</span>
                          <button className="foro-post-card__confirm-yes" onClick={(e) => handleConfirmarEliminar(e, post.id, "mod")}>Sí</button>
                          <button className="foro-post-card__confirm-no" onClick={(e) => { e.stopPropagation(); setConfirmando(null); }}>No</button>
                        </span>
                      ) : (
                        <button
                          className="foro-post-card__action-btn foro-post-card__action-btn--danger"
                          onClick={(e) => { e.stopPropagation(); setConfirmando({ id: post.id, tipo: "mod" }); }}
                          aria-label="Eliminar publicación (mod)"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      )
                    )}
                    {esMod && userId !== post.auth_user_id && (
                      baneando?.postId === post.id ? (
                        <span className="foro-post-card__confirm" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            className="foro-post-card__ban-input"
                            placeholder="Motivo..."
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            autoFocus
                          />
                          <button className="foro-post-card__confirm-yes" onClick={(e) => { e.stopPropagation(); handleBanear(post.auth_user_id); }}>Banear</button>
                          <button className="foro-post-card__confirm-no" onClick={(e) => { e.stopPropagation(); setBaneando(null); setBanReason(""); }}>No</button>
                        </span>
                      ) : (
                        <button
                          className="foro-post-card__action-btn foro-post-card__action-btn--ban"
                          onClick={(e) => { e.stopPropagation(); setBaneando({ uid: post.auth_user_id, postId: post.id }); setConfirmando(null); }}
                          aria-label="Banear autor"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                          </svg>
                          Banear
                        </button>
                      )
                    )}
                  </div>
                </div>

              </article>
            ))}

            {/* aria-disabled y no disabled: el navegador saca el foco de un
                elemento que se deshabilita, así que a quien navega por teclado
                se le perdía el foco en CADA clic de "cargar más". */}
            {hasMore && (
              <button
                className="btn-ghost foro-cargar-mas"
                onClick={cargarMas}
                aria-disabled={loadingMore}
              >
                {loadingMore ? "Cargando..." : "Cargar más publicaciones"}
              </button>
            )}

            {/* Anuncia el resultado de "cargar más" a quien no ve la lista crecer. */}
            <p className="sr-only" aria-live="polite">
              {loadingMore
                ? "Cargando más publicaciones"
                : `${posts.length} publicaciones cargadas${hasMore ? "" : ", no hay más"}`}
            </p>
          </div>
        )}
      </div>

      {toast && (
        <div className={`foro-toast foro-toast--${toast.type}`} role="alert" aria-live="assertive">
          {toast.msg}
        </div>
      )}

      {/* Panel de filtros */}
      <FiltroPanel
        isOpen={filtroOpen}
        onClose={() => setFiltroOpen(false)}
        filtros={filtros}
        onChange={setFiltros}
      />

      <NuevoPostPanel
        isOpen={nuevoPostOpen}
        onClose={() => setNuevoPostOpen(false)}
        onPostCreado={() => {
          setNuevoPostOpen(false);
          // Vuelve a la primera página: el post recién creado va arriba de todo
          // en "recientes", y quedarse en la página 3 lo escondería.
          cargarPagina(0, "reemplazar");
        }}
      />
    </div>
  );
}

