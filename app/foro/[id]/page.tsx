"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { findUntrustedUrls } from "@/app/lib/contentSecurity";
import { reportarPost, reportarComentario, quitarReportePost, quitarReporteComentario } from "@/app/actions/reportar";
import { eliminarPostMod, eliminarComentarioMod } from "@/app/actions/moderador";
import "../foro.css";

type TipoPost = "Pregunta" | "Recurso" | "Debate" | "Aviso";

type Post = {
  id: number;
  titulo: string;
  contenido: string;
  created_at: string;
  auth_user_id: string;
  anonimo: boolean;
  ingenieria: { id: number; nombre: string } | null;
  anio: number | null;
  comision: { id: number; nombre: string } | null;
  materia: { id: number; nombre: string } | null;
  tipo: TipoPost | null;
  vote_score: number;
  comment_count: number;
};

type Comment = {
  id: number;
  post_id: number;
  auth_user_id: string;
  contenido: string;
  anonimo: boolean;
  created_at: string;
};

type UserVote = 1 | -1 | null;

export default function PostDetailPage() {
  const supabase = createClient();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [userVote, setUserVote] = useState<UserVote>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const [newComment, setNewComment] = useState("");
  const [newCommentAnonimo, setNewCommentAnonimo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [reportandoPost, setReportandoPost] = useState(false);
  const [postReportado, setPostReportado] = useState(false);
  const [comentariosReportados, setComentariosReportados] = useState<Set<number>>(new Set());
  const [esMod, setEsMod] = useState(false);

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

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from("foro_comment")
      .select("id, post_id, auth_user_id, contenido, anonimo, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    return data ?? [];
  }, [postId]);

  const fetchAuthorNames = useCallback(async (uids: string[]) => {
    if (!uids.length) return {};
    const { data } = await supabase.rpc("get_user_emails", { user_ids: uids });
    const map: Record<string, string> = {};
    (data ?? []).forEach((row: { id: string; email: string }) => {
      map[row.id] = row.email.split("@")[0];
    });
    return map;
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    // Post
    const { data: postData } = await supabase
      .from("foro_post_summary")
      .select(`
        id, titulo, contenido, created_at, auth_user_id, anonimo,
        ingenieria_id, anio, tipo, vote_score, comment_count,
        comision:comision_id ( id, nombre ),
        materia:materia_id ( id, nombre ),
        ingenieria:ingenieria_id ( id, nombre )
      `)
      .eq("id", postId)
      .single();

    if (postData) setPost(postData as unknown as Post);

    // Comments
    const commentData = await fetchComments();
    setComments(commentData as Comment[]);

    // Current user's vote + reports
    if (userId) {
      const [{ data: voteData }, { data: postReportData }, { data: commentReportData }] = await Promise.all([
        supabase.from("foro_vote").select("value").eq("post_id", postId).eq("auth_user_id", userId).maybeSingle(),
        supabase.from("foro_report").select("id").eq("post_id", postId).eq("auth_user_id", userId).maybeSingle(),
        supabase.from("foro_comment_report").select("comment_id").eq("auth_user_id", userId),
      ]);
      setUserVote(voteData ? (voteData.value as UserVote) : null);
      setPostReportado(!!postReportData);
      if (commentReportData) {
        setComentariosReportados(new Set(commentReportData.map((r: { comment_id: number }) => r.comment_id)));
      }
    }

    // Author names (only for non-anonymous entries)
    if (postData) {
      const uids: string[] = [];
      if (!postData.anonimo) uids.push(postData.auth_user_id);
      (commentData as Comment[]).forEach((c) => {
        if (!c.anonimo && !uids.includes(c.auth_user_id)) uids.push(c.auth_user_id);
      });
      const names = await fetchAuthorNames(uids);
      setAuthorNames(names);
    }

    setLoading(false);
  }, [postId, userId, fetchComments, fetchAuthorNames]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleVote = async (value: 1 | -1) => {
    if (!userId) return;
    const isUnvote = userVote === value;

    if (isUnvote) {
      await supabase.from("foro_vote").delete()
        .eq("post_id", postId).eq("auth_user_id", userId);
      setUserVote(null);
      setPost((p) => p ? { ...p, vote_score: p.vote_score - value } : p);
    } else {
      const delta = value - (userVote ?? 0);
      await supabase.from("foro_vote").upsert(
        { post_id: postId, auth_user_id: userId, value },
        { onConflict: "post_id,auth_user_id" }
      );
      setUserVote(value);
      setPost((p) => p ? { ...p, vote_score: p.vote_score + delta } : p);
    }
  };

  const handleCommentSubmit = async () => {
    if (!userId || !newComment.trim()) return;

    const untrusted = findUntrustedUrls(newComment);
    if (untrusted.length > 0) {
      setCommentError(`Solo se permiten links de sitios conocidos (UTN, YouTube, GitHub, Wikipedia, etc.). Revisá: ${untrusted[0]}`);
      return;
    }

    setSubmitting(true);
    setCommentError("");

    const { error } = await supabase.from("foro_comment").insert({
      post_id: postId,
      auth_user_id: userId,
      contenido: newComment.trim(),
      anonimo: newCommentAnonimo,
    });

    if (error) {
      setCommentError("No se pudo enviar el comentario. Intentá de nuevo.");
      setSubmitting(false);
      return;
    }

    setNewComment("");
    const updatedComments = await fetchComments();
    setComments(updatedComments as Comment[]);

    // Refresh author names if new non-anon comment
    if (!newCommentAnonimo) {
      const uids = [
        ...(post && !post.anonimo ? [post.auth_user_id] : []),
        ...(updatedComments as Comment[])
          .filter((c) => !c.anonimo)
          .map((c) => c.auth_user_id)
          .filter((uid, i, arr) => arr.indexOf(uid) === i),
      ];
      const names = await fetchAuthorNames(uids);
      setAuthorNames(names);
    }

    setPost((p) => p ? { ...p, comment_count: p.comment_count + 1 } : p);
    setSubmitting(false);
  };

  const handleCommentDelete = async (commentId: number) => {
    const confirmar = window.confirm("¿Eliminar este comentario?");
    if (!confirmar) return;
    await supabase.from("foro_comment").delete().eq("id", commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setPost((p) => p ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p);
  };

  const handleReportarPost = async () => {
    if (postReportado) {
      setReportandoPost(true);
      const result = await quitarReportePost(postId);
      if (result.error) { alert(result.error); setReportandoPost(false); return; }
      setPostReportado(false);
      setReportandoPost(false);
      return;
    }
    if (!window.confirm("¿Querés reportar esta publicación como contenido inapropiado?")) return;
    setReportandoPost(true);
    const result = await reportarPost(postId);
    if (result.error) { alert(result.error); setReportandoPost(false); return; }
    if (result.deleted) { alert("La publicación fue eliminada por acumular demasiados reportes."); router.push("/foro"); return; }
    setPostReportado(true);
    setReportandoPost(false);
  };

  const handleReportarComentario = async (comentarioId: number) => {
    if (comentariosReportados.has(comentarioId)) {
      const result = await quitarReporteComentario(comentarioId);
      if (result.error) { alert(result.error); return; }
      setComentariosReportados((prev) => { const s = new Set(prev); s.delete(comentarioId); return s; });
      return;
    }
    if (!window.confirm("¿Querés reportar este comentario como contenido inapropiado?")) return;
    const result = await reportarComentario(comentarioId);
    if (result.error) { alert(result.error); return; }
    if (result.deleted) {
      setComments((prev) => prev.filter((c) => c.id !== comentarioId));
      setPost((p) => p ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p);
      return;
    }
    setComentariosReportados((prev) => new Set(prev).add(comentarioId));
  };

  const displayName = (uid: string, isAnon: boolean) =>
    isAnon ? "Anónimo" : (authorNames[uid] ?? "usuario");

  if (loading) {
    return (
      <div className="foro-detail-page">
        <div className="foro-detail-inner">
          <div className="foro-loading-state">Cargando publicación...</div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="foro-detail-page">
        <div className="foro-detail-inner">
          <button className="foro-detail-back" onClick={() => router.push("/foro")}>← Volver al foro</button>
          <div className="foro-empty"><p>Publicación no encontrada.</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="foro-detail-page">
      <div className="foro-detail-inner">

        <button className="foro-detail-back" onClick={() => router.push("/foro")}>
          ← Volver al foro
        </button>

        {/* Post card */}
        <div className="foro-detail-card">

          {/* Vote column */}
          <div className="foro-detail-card__vote">
            <button
              className={`foro-vote__btn foro-vote__btn--up ${userVote === 1 ? "active" : ""}`}
              onClick={() => handleVote(1)}
              disabled={!userId}
              title={userId ? "Upvote" : "Iniciá sesión para votar"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 8H4z"/></svg>
            </button>
            <span className={`foro-vote__score ${post.vote_score > 0 ? "foro-vote__score--positive" : post.vote_score < 0 ? "foro-vote__score--negative" : ""}`}>
              {post.vote_score}
            </span>
            <button
              className={`foro-vote__btn foro-vote__btn--down ${userVote === -1 ? "active" : ""}`}
              onClick={() => handleVote(-1)}
              disabled={!userId}
              title={userId ? "Downvote" : "Iniciá sesión para votar"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l-8-8h16z"/></svg>
            </button>
          </div>

          {/* Content */}
          <div className="foro-detail-card__body">
            <div className="foro-detail__meta">
              {post.ingenieria?.nombre && (
                <span className="foro-post-card__ingenieria">{post.ingenieria.nombre}</span>
              )}
              {post.tipo && (
                <span className={`foro-post-card__tipo foro-post-card__tipo--${post.tipo.toLowerCase()}`}>
                  {post.tipo}
                </span>
              )}
              {post.materia?.nombre && (
                <span className="foro-post-card__tag">{post.materia.nombre}</span>
              )}
              {post.comision?.nombre && (
                <span className="foro-post-card__comision">· Com. {post.comision.nombre}</span>
              )}
              <span className="foro-post-card__sep">·</span>
              <span>publicado por <strong>{displayName(post.auth_user_id, post.anonimo)}</strong></span>
              <span className="foro-post-card__sep">·</span>
              <span>{new Date(post.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>

            <h1 className="foro-detail__title">{post.titulo}</h1>
            <p className="foro-detail__body">{post.contenido}</p>

            <div className="foro-detail__actions">
              <button className="foro-post-card__action-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {post.comment_count} comentarios
              </button>
              {!userId && (
                <span className="foro-detail__vote-hint">· Iniciá sesión para votar</span>
              )}
              {userId && post.auth_user_id !== userId && (
                <button
                  className="foro-post-card__action-btn"
                  onClick={handleReportarPost}
                  disabled={reportandoPost}
                  style={{ marginLeft: "auto" }}
                >
                  {reportandoPost ? "..." : postReportado ? "⚑ Quitar reporte" : "⚑ Reportar"}
                </button>
              )}
              {userId && post.auth_user_id === userId && (
                <button
                  className="foro-post-card__action-btn foro-post-card__action-btn--danger"
                  onClick={async () => {
                    const ok = window.confirm("¿Eliminar esta publicación?");
                    if (!ok) return;
                    await supabase.from("foro_post").delete().eq("id", post.id);
                    router.push("/foro");
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                  </svg>
                  Eliminar
                </button>
              )}
              {esMod && userId !== post.auth_user_id && (
                <button
                  className="foro-post-card__action-btn foro-post-card__action-btn--danger"
                  onClick={async () => {
                    if (!window.confirm("¿Eliminar esta publicación como moderador?")) return;
                    const result = await eliminarPostMod(post.id);
                    if (result.error) { alert(result.error); return; }
                    router.push("/foro");
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="foro-comments-card">
          <div className="foro-comments">
            <h3 className="foro-comments__title">
              {comments.length} comentario{comments.length !== 1 ? "s" : ""}
            </h3>

            {comments.map((c) => (
              <div key={c.id} className="foro-comment-card">
                <div className="foro-comment-card__header">
                  <span className="foro-comment-card__author">
                    {displayName(c.auth_user_id, c.anonimo)}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="foro-comment-card__fecha">
                      {new Date(c.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {userId && userId !== c.auth_user_id && (
                      <button
                        className="foro-comment-card__eliminar"
                        onClick={() => handleReportarComentario(c.id)}
                      >
                        {comentariosReportados.has(c.id) ? "Quitar reporte" : "Reportar"}
                      </button>
                    )}
                    {userId === c.auth_user_id && (
                      <button className="foro-comment-card__eliminar" onClick={() => handleCommentDelete(c.id)}>
                        Eliminar
                      </button>
                    )}
                    {esMod && userId !== c.auth_user_id && (
                      <button
                        className="foro-comment-card__eliminar"
                        style={{ color: "#991b1b" }}
                        onClick={async () => {
                          if (!window.confirm("¿Eliminar este comentario como moderador?")) return;
                          const result = await eliminarComentarioMod(c.id);
                          if (result.error) { alert(result.error); return; }
                          setComments((prev) => prev.filter((x) => x.id !== c.id));
                          setPost((p) => p ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p);
                        }}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
                <p className="foro-comment-card__text">{c.contenido}</p>
              </div>
            ))}

            {userId ? (
              <div className="foro-new-comment">
                <textarea
                  className="foro-new-comment__textarea"
                  placeholder="Escribí un comentario..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  maxLength={2000}
                />
                <div className="foro-new-comment__footer">
                  <label className="foro-anonimo-check">
                    <input
                      type="checkbox"
                      checked={newCommentAnonimo}
                      onChange={(e) => setNewCommentAnonimo(e.target.checked)}
                    />
                    Comentar de forma anónima
                  </label>
                  <button
                    className="foro-new-comment__submit"
                    onClick={handleCommentSubmit}
                    disabled={submitting || !newComment.trim()}
                  >
                    {submitting ? "Enviando..." : "Comentar"}
                  </button>
                </div>
                {commentError && <p style={{ color: "#991b1b", fontSize: 13 }}>{commentError}</p>}
              </div>
            ) : (
              <p className="foro-login-hint">
                <a href="/login">Iniciá sesión</a> para comentar.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
