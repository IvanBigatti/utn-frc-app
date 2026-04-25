"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import FiltroPanel from "./FiltroPanel";
import "./foro.css";
import NuevoPostPanel from "./formForo";
import { getAvatarSrc } from "@/app/components/avatars";
import { eliminarPostMod } from "@/app/actions/moderador";

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

export default function ForoPage() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroOpen, setFiltroOpen] = useState(false);
  const [nuevoPostOpen, setNuevoPostOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [esMod, setEsMod] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    (searchParams.get("sort") as SortOrder | null) ?? "recientes"
  );
  const [userVotes, setUserVotes] = useState<Record<number, 1 | -1>>({});
  const [authorMap, setAuthorMap] = useState<Record<string, AuthorInfo>>({});

  const [filtros, setFiltros] = useState<Filtros>(() => ({
    carreraId: searchParams.get("carreraId") ? Number(searchParams.get("carreraId")) : null,
    anio: searchParams.get("anio") ? Number(searchParams.get("anio")) : null,
    materiaId: searchParams.get("materiaId") ? Number(searchParams.get("materiaId")) : null,
    comisionId: searchParams.get("comisionId") ? Number(searchParams.get("comisionId")) : null,
    tipo: (searchParams.get("tipo") as TipoPost | null) ?? null,
  }));
  const [confirmando, setConfirmando] = useState<{ id: number; tipo: "propio" | "mod" } | null>(null);
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
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filtros, sortOrder, pathname, router]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data } = await supabase.from("moderadores").select("user_id").eq("user_id", uid).maybeSingle();
        setEsMod(!!data);
      }
    });
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);

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

    const { data, error } = await query;
    if (error || !data) { setLoading(false); return; }

    const fetchedPosts = data as unknown as Post[];
    setPosts(fetchedPosts);

    // Cargar info de autores no anónimos
    const uids = [...new Set(fetchedPosts.filter(p => !p.anonimo).map(p => p.auth_user_id))];
    if (uids.length > 0) {
      const [emailsRes, profilesRes, modsRes] = await Promise.all([
        supabase.rpc("get_user_emails", { user_ids: uids }),
        supabase.from("profiles").select("id, avatar_key, avatar_src").in("id", uids),
        supabase.from("moderadores").select("user_id").in("user_id", uids),
      ]);
      const modSet = new Set((modsRes.data ?? []).map((m: { user_id: string }) => m.user_id));
      const map: Record<string, AuthorInfo> = {};
      uids.forEach(uid => { map[uid] = { name: "usuario", avatarKey: null, avatarSrc: null, isMod: modSet.has(uid) }; });
      (emailsRes.data ?? []).forEach((row: { id: string; email: string }) => {
        if (map[row.id]) map[row.id].name = row.email.split("@")[0];
      });
      (profilesRes.data ?? []).forEach((p: { id: string; avatar_key: string | null; avatar_src: string | null }) => {
        if (map[p.id]) { map[p.id].avatarKey = p.avatar_key; map[p.id].avatarSrc = p.avatar_src; }
      });
      setAuthorMap(map);
    }

    setLoading(false);
  }, [filtros, sortOrder]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Fetch user's votes for the current visible posts
  useEffect(() => {
    if (!userId || posts.length === 0) return;
    const postIds = posts.map((p) => p.id);
    supabase
      .from("foro_vote")
      .select("post_id, value")
      .eq("auth_user_id", userId)
      .in("post_id", postIds)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<number, 1 | -1> = {};
        data.forEach((v: { post_id: number; value: 1 | -1 }) => { map[v.post_id] = v.value; });
        setUserVotes(map);
      });
  }, [userId, posts]);

  const handleVote = async (e: React.MouseEvent, postId: number, value: 1 | -1) => {
    e.stopPropagation();
    if (!userId) return;

    const current = userVotes[postId] ?? null;
    const isUnvote = current === value;

    if (isUnvote) {
      // Optimistic
      setUserVotes((prev) => { const next = { ...prev }; delete next[postId]; return next; });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, vote_score: p.vote_score - value } : p));
      const { error } = await supabase.from("foro_vote").delete()
        .eq("post_id", postId).eq("auth_user_id", userId);
      if (error) {
        // Rollback
        setUserVotes((prev) => ({ ...prev, [postId]: value }));
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, vote_score: p.vote_score + value } : p));
        showToast("No se pudo registrar el voto. Intentá de nuevo.");
      }
    } else {
      const delta = value - (current ?? 0);
      // Optimistic
      setUserVotes((prev) => ({ ...prev, [postId]: value }));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, vote_score: p.vote_score + delta } : p));
      const { error } = await supabase.from("foro_vote").upsert(
        { post_id: postId, auth_user_id: userId, value },
        { onConflict: "post_id,auth_user_id" }
      );
      if (error) {
        // Rollback
        setUserVotes((prev) => {
          const next = { ...prev };
          if (current !== null) next[postId] = current; else delete next[postId];
          return next;
        });
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, vote_score: p.vote_score - delta } : p));
        showToast("No se pudo registrar el voto. Intentá de nuevo.");
      }
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
                    disabled={!userId}
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
                    disabled={!userId}
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
                      <span className="foro-post-card__author">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="foro-post-card__author-avatar"
                          src={authorMap[post.auth_user_id]?.avatarSrc ?? getAvatarSrc(authorMap[post.auth_user_id]?.avatarKey)}
                          alt=""
                        />
                        {authorMap[post.auth_user_id]?.name ?? "usuario"}
                        {authorMap[post.auth_user_id]?.isMod && <span className="mod-badge">Mod</span>}
                      </span>
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
                  </div>
                </div>

              </article>
            ))}
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
          fetchPosts();
        }}
      />
    </div>
  );
}
