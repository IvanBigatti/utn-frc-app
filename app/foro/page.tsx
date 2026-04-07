"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import FiltroPanel from "./FiltroPanel";
import "./foro.css";
import NuevoPostPanel from "./formForo";

type TipoPost = "Pregunta" | "Recurso" | "Debate" | "Aviso";

type Post = {
  id: number;
  titulo: string;
  contenido: string;
  created_at: string;
  auth_user_id: string;
  ingenieria_id: number | null;
  ingenieria: { id: number; nombre: string } | null;
  anio: number | null;
  comision: { id: number; nombre: string } | null;
  materia: { id: number; nombre: string } | null;
  tipo: TipoPost | null;
  vote_score: number;
  comment_count: number;
};

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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroOpen, setFiltroOpen] = useState(false);
  const [nuevoPostOpen, setNuevoPostOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("recientes");
  const [userVotes, setUserVotes] = useState<Record<number, 1 | -1>>({});

  const [filtros, setFiltros] = useState<Filtros>({
    carreraId: null, anio: null, materiaId: null, comisionId: null, tipo: null,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("foro_post_summary")
      .select(`
        id, titulo, contenido, created_at, auth_user_id,
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
    if (!error && data) setPosts(data as unknown as Post[]);
    setLoading(false);
  }, [filtros, sortOrder]);

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
      await supabase.from("foro_vote").delete()
        .eq("post_id", postId).eq("auth_user_id", userId);
      setUserVotes((prev) => { const next = { ...prev }; delete next[postId]; return next; });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, vote_score: p.vote_score - value } : p));
    } else {
      const delta = value - (current ?? 0);
      await supabase.from("foro_vote").upsert(
        { post_id: postId, auth_user_id: userId, value },
        { onConflict: "post_id,auth_user_id" }
      );
      setUserVotes((prev) => ({ ...prev, [postId]: value }));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, vote_score: p.vote_score + delta } : p));
    }
  };

  const handleEliminar = async (e: React.MouseEvent, postId: number) => {
    e.stopPropagation();
    const confirmar = window.confirm("¿Seguro que querés eliminar esta publicación?");
    if (!confirmar) return;

    const { error } = await supabase.from("foro_post").delete().eq("id", postId);
    if (!error) setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const hayFiltros = Object.values(filtros).some((v) => v !== null);
  const filtrosVacios: Filtros = { carreraId: null, anio: null, materiaId: null, comisionId: null, tipo: null };

  return (
    <div className="foro-page">

      {/* Header */}
      <div className="foro-header">
        <div>
          <h1 className="foro-header__title">Foro</h1>
          <p className="foro-header__subtitle">
            {hayFiltros ? `${posts.length} resultados con filtros aplicados` : `${posts.length} publicaciones`}
          </p>
        </div>

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

          <button className="foro-nuevo-btn" onClick={() => setNuevoPostOpen(true)}>
            + Publicar
          </button>
        </div>
      </div>

      {/* Sort */}
      <div className="foro-sort">
        {(["recientes", "votados"] as SortOrder[]).map((s) => (
          <button
            key={s}
            className={`foro-sort__btn ${sortOrder === s ? "active" : ""}`}
            onClick={() => setSortOrder(s)}
          >
            {s === "recientes" ? "Más recientes" : "Más votados"}
          </button>
        ))}
      </div>

      {/* Lista de posts */}
      {loading ? (
        <div className="foro-loading-state">Cargando publicaciones...</div>
      ) : posts.length === 0 ? (
        <div className="foro-empty">
          <p>No hay publicaciones todavía.</p>
          {hayFiltros && (
            <button className="foro-limpiar" onClick={() => setFiltros(filtrosVacios)}>
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="foro-list">
          {posts.map((post) => (
            <div key={post.id} className="foro-post-card" onClick={() => router.push(`/foro/${post.id}`)}>
              <div className="foro-post-card__meta">
                {post.tipo && (
                  <span className={`foro-post-card__tipo foro-post-card__tipo--${post.tipo.toLowerCase()}`}>
                    {post.tipo}
                  </span>
                )}
                {post.ingenieria?.nombre && (
                  <span className="foro-post-card__ingenieria">{post.ingenieria.nombre}</span>
                )}
                {post.materia?.nombre && (
                  <span className="foro-post-card__tag">{post.materia.nombre}</span>
                )}
                {post.comision?.nombre && (
                  <span className="foro-post-card__comision">Comisión {post.comision.nombre}</span>
                )}

                {userId === post.auth_user_id && (
                  <button
                    className="foro-post-card__eliminar"
                    onClick={(e) => handleEliminar(e, post.id)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                    Eliminar
                  </button>
                )}
              </div>

              <h2 className="foro-post-card__titulo">{post.titulo}</h2>
              <p className="foro-post-card__preview">
                {post.contenido.length > 160 ? post.contenido.slice(0, 160) + "..." : post.contenido}
              </p>

              <div className="foro-post-card__footer">
                <span className="foro-post-card__fecha">
                  {new Date(post.created_at).toLocaleDateString("es-AR", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </span>

                {/* Votes */}
                <div className="foro-vote" onClick={(e) => e.stopPropagation()}>
                  <button
                    className={`foro-vote__btn foro-vote__btn--up ${userVotes[post.id] === 1 ? "active" : ""}`}
                    onClick={(e) => handleVote(e, post.id, 1)}
                    disabled={!userId}
                    title={userId ? "Upvote" : "Iniciá sesión para votar"}
                  >▲</button>
                  <span className={`foro-vote__score ${post.vote_score > 0 ? "foro-vote__score--positive" : post.vote_score < 0 ? "foro-vote__score--negative" : ""}`}>
                    {post.vote_score}
                  </span>
                  <button
                    className={`foro-vote__btn foro-vote__btn--down ${userVotes[post.id] === -1 ? "active" : ""}`}
                    onClick={(e) => handleVote(e, post.id, -1)}
                    disabled={!userId}
                    title={userId ? "Downvote" : "Iniciá sesión para votar"}
                  >▼</button>
                </div>

                {/* Comment count */}
                <span className="foro-post-card__comments">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {post.comment_count}
                </span>
              </div>
            </div>
          ))}
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
