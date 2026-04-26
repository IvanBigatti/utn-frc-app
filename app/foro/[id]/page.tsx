"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { findUntrustedUrls } from "@/app/lib/contentSecurity";
import { reportarPost, reportarComentario, quitarReportePost, quitarReporteComentario } from "@/app/actions/reportar";
import Link from "next/link";
import { eliminarPostMod, eliminarComentarioMod, banearUsuario } from "@/app/actions/moderador";
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

type Confirmacion =
  | { tipo: "eliminar-post-propio" }
  | { tipo: "eliminar-post-mod" }
  | { tipo: "reportar-post" }
  | { tipo: "eliminar-comment"; id: number }
  | { tipo: "eliminar-comment-mod"; id: number }
  | { tipo: "reportar-comment"; id: number };

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);

function InlineConfirm({ label, onConfirm, onCancel }: { label: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <span className="foro-post-card__confirm">
      <span>{label}</span>
      <button className="foro-post-card__confirm-yes" onClick={onConfirm}>Sí</button>
      <button className="foro-post-card__confirm-no" onClick={onCancel}>No</button>
    </span>
  );
}

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
  const [modSet, setModSet] = useState<Set<string>>(new Set());
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const votingRef = useRef(false);
  const [baneando, setBaneando] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  const handleBanear = async (uid: string) => {
    setBaneando(null);
    const result = await banearUsuario(uid, banReason);
    setBanReason("");
    if (result.error) { showError(result.error); return; }
    setPost((p) => p?.auth_user_id === uid ? null : p);
    setComments((prev) => prev.filter((c) => c.auth_user_id !== uid));
    if (post?.auth_user_id === uid) router.push("/foro");
  };

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
    const { data } = await supabase.rpc("get_user_display_names", { user_ids: uids });
    const map: Record<string, string> = {};
    (data ?? []).forEach((row: { id: string; display_name: string }) => {
      map[row.id] = row.display_name;
    });
    return map;
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);

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

    const commentData = await fetchComments();
    setComments(commentData as Comment[]);

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

    if (postData) {
      const uids: string[] = [];
      if (!postData.anonimo) uids.push(postData.auth_user_id);
      (commentData as Comment[]).forEach((c) => {
        if (!c.anonimo && !uids.includes(c.auth_user_id)) uids.push(c.auth_user_id);
      });
      const [names, modsRes] = await Promise.all([
        fetchAuthorNames(uids),
        supabase.from("moderadores").select("user_id").in("user_id", uids),
      ]);
      setAuthorNames(names);
      setModSet(new Set((modsRes.data ?? []).map((m: { user_id: string }) => m.user_id)));
    }

    setLoading(false);
  }, [postId, userId, fetchComments, fetchAuthorNames]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleVote = async (value: 1 | -1) => {
    if (!userId || votingRef.current) return;
    votingRef.current = true;
    setVoting(true);

    const prev = userVote;
    const isUnvote = prev === value;

    if (isUnvote) {
      setUserVote(null);
      setPost((p) => p ? { ...p, vote_score: p.vote_score - value } : p);
      const { error } = await supabase.from("foro_vote").delete().eq("post_id", postId).eq("auth_user_id", userId);
      if (error) {
        setUserVote(prev);
        setPost((p) => p ? { ...p, vote_score: p.vote_score + value } : p);
      }
    } else {
      const delta = value - (prev ?? 0);
      setUserVote(value);
      setPost((p) => p ? { ...p, vote_score: p.vote_score + delta } : p);
      const { error } = await supabase.from("foro_vote").upsert(
        { post_id: postId, auth_user_id: userId, value },
        { onConflict: "post_id,auth_user_id" }
      );
      if (error) {
        setUserVote(prev);
        setPost((p) => p ? { ...p, vote_score: p.vote_score - delta } : p);
      }
    }

    votingRef.current = false;
    setVoting(false);
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
    if (!newCommentAnonimo) {
      const uids = [
        ...(post && !post.anonimo ? [post.auth_user_id] : []),
        ...(updatedComments as Comment[]).filter((c) => !c.anonimo).map((c) => c.auth_user_id).filter((u, i, arr) => arr.indexOf(u) === i),
      ];
      const names = await fetchAuthorNames(uids);
      setAuthorNames(names);
    }
    setPost((p) => p ? { ...p, comment_count: p.comment_count + 1 } : p);
    setSubmitting(false);
  };

  const handleConfirmar = async (conf: Confirmacion) => {
    setConfirmacion(null);
    if (conf.tipo === "eliminar-post-propio") {
      await supabase.from("foro_post").delete().eq("id", postId).eq("auth_user_id", userId);
      router.push("/foro");
    } else if (conf.tipo === "eliminar-post-mod") {
      const result = await eliminarPostMod(postId);
      if (result.error) { showError(result.error); return; }
      router.push("/foro");
    } else if (conf.tipo === "reportar-post") {
      setReportandoPost(true);
      const result = await reportarPost(postId);
      setReportandoPost(false);
      if (result.error) { showError(result.error); return; }
      if (result.deleted) { router.push("/foro"); return; }
      setPostReportado(true);
    } else if (conf.tipo === "eliminar-comment") {
      await supabase.from("foro_comment").delete().eq("id", conf.id).eq("auth_user_id", userId);
      setComments((prev) => prev.filter((c) => c.id !== conf.id));
      setPost((p) => p ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p);
    } else if (conf.tipo === "eliminar-comment-mod") {
      const result = await eliminarComentarioMod(conf.id);
      if (result.error) { showError(result.error); return; }
      setComments((prev) => prev.filter((c) => c.id !== conf.id));
      setPost((p) => p ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p);
    } else if (conf.tipo === "reportar-comment") {
      const result = await reportarComentario(conf.id);
      if (result.error) { showError(result.error); return; }
      if (result.deleted) {
        setComments((prev) => prev.filter((c) => c.id !== conf.id));
        setPost((p) => p ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p);
        return;
      }
      setComentariosReportados((prev) => new Set(prev).add(conf.id));
    }
  };

  const handleReportarPost = async () => {
    if (postReportado) {
      setReportandoPost(true);
      const result = await quitarReportePost(postId);
      setReportandoPost(false);
      if (result.error) { showError(result.error); return; }
      setPostReportado(false);
      return;
    }
    setConfirmacion({ tipo: "reportar-post" });
  };

  const handleReportarComentario = async (comentarioId: number) => {
    if (comentariosReportados.has(comentarioId)) {
      const result = await quitarReporteComentario(comentarioId);
      if (result.error) { showError(result.error); return; }
      setComentariosReportados((prev) => { const s = new Set(prev); s.delete(comentarioId); return s; });
      return;
    }
    setConfirmacion({ tipo: "reportar-comment", id: comentarioId });
  };

  const displayName = (uid: string, isAnon: boolean) =>
    isAnon ? "Anónimo" : (authorNames[uid] ?? "usuario");

  const isConfirming = (conf: Confirmacion) => {
    if (!confirmacion) return false;
    if (conf.tipo !== confirmacion.tipo) return false;
    if ("id" in conf && "id" in confirmacion) return conf.id === confirmacion.id;
    return true;
  };

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

        {errorMsg && (
          <p className="foro-error-msg" role="alert">{errorMsg}</p>
        )}

        {/* Post card */}
        <div className="foro-detail-card">

          {/* Vote column */}
          <div className="foro-detail-card__vote">
            <button
              className={`foro-vote__btn foro-vote__btn--up ${userVote === 1 ? "active" : ""}`}
              onClick={() => handleVote(1)}
              disabled={!userId || voting}
              aria-label={userId ? `Votar positivo (puntaje actual: ${post.vote_score})` : "Iniciá sesión para votar"}
              aria-pressed={userVote === 1}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4l8 8H4z"/></svg>
            </button>
            <span
              className={`foro-vote__score ${post.vote_score > 0 ? "foro-vote__score--positive" : post.vote_score < 0 ? "foro-vote__score--negative" : ""}`}
              aria-live="polite"
              aria-atomic="true"
            >
              {post.vote_score}
            </span>
            <button
              className={`foro-vote__btn foro-vote__btn--down ${userVote === -1 ? "active" : ""}`}
              onClick={() => handleVote(-1)}
              disabled={!userId || voting}
              aria-label={userId ? `Votar negativo (puntaje actual: ${post.vote_score})` : "Iniciá sesión para votar"}
              aria-pressed={userVote === -1}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20l-8-8h16z"/></svg>
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
              <span>publicado por{' '}
                {!post.anonimo ? (
                  <Link href={`/perfil?uid=${post.auth_user_id}`} className="foro-post-card__author--link" style={{ fontWeight: 600 }}>
                    {displayName(post.auth_user_id, post.anonimo)}
                    {modSet.has(post.auth_user_id) && <span className="mod-badge">Mod</span>}
                  </Link>
                ) : (
                  <strong>{displayName(post.auth_user_id, post.anonimo)}</strong>
                )}
              </span>
              <span className="foro-post-card__sep">·</span>
              <span>{new Date(post.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>

            <h1 className="foro-detail__title">{post.titulo}</h1>
            <p className="foro-detail__body">{post.contenido}</p>

            <div className="foro-detail__actions">
              <button className="foro-post-card__action-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {post.comment_count} comentarios
              </button>
              {!userId && (
                <span className="foro-detail__vote-hint">· Iniciá sesión para votar</span>
              )}
              {userId && post.auth_user_id !== userId && (
                isConfirming({ tipo: "reportar-post" }) ? (
                  <InlineConfirm
                    label="¿Reportar?"
                    onConfirm={() => handleConfirmar({ tipo: "reportar-post" })}
                    onCancel={() => setConfirmacion(null)}
                  />
                ) : (
                  <button
                    className="foro-post-card__action-btn"
                    onClick={handleReportarPost}
                    disabled={reportandoPost}
                    style={{ marginLeft: "auto" }}
                  >
                    {reportandoPost ? "..." : postReportado ? "⚑ Quitar reporte" : "⚑ Reportar"}
                  </button>
                )
              )}
              {userId && post.auth_user_id === userId && (
                isConfirming({ tipo: "eliminar-post-propio" }) ? (
                  <InlineConfirm
                    label="¿Eliminar publicación?"
                    onConfirm={() => handleConfirmar({ tipo: "eliminar-post-propio" })}
                    onCancel={() => setConfirmacion(null)}
                  />
                ) : (
                  <button
                    className="foro-post-card__action-btn foro-post-card__action-btn--danger"
                    onClick={() => setConfirmacion({ tipo: "eliminar-post-propio" })}
                  >
                    <TrashIcon />
                    Eliminar
                  </button>
                )
              )}
              {esMod && userId !== post.auth_user_id && (
                isConfirming({ tipo: "eliminar-post-mod" }) ? (
                  <InlineConfirm
                    label="¿Eliminar (mod)?"
                    onConfirm={() => handleConfirmar({ tipo: "eliminar-post-mod" })}
                    onCancel={() => setConfirmacion(null)}
                  />
                ) : (
                  <button
                    className="foro-post-card__action-btn foro-post-card__action-btn--danger"
                    onClick={() => setConfirmacion({ tipo: "eliminar-post-mod" })}
                    aria-label="Eliminar publicación (mod)"
                  >
                    <TrashIcon />
                  </button>
                )
              )}
              {esMod && userId !== post.auth_user_id && (
                baneando === post.auth_user_id ? (
                  <span className="foro-post-card__confirm">
                    <input
                      type="text"
                      className="foro-post-card__ban-input"
                      placeholder="Motivo..."
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      autoFocus
                    />
                    <button className="foro-post-card__confirm-yes" onClick={() => handleBanear(post.auth_user_id)}>Banear</button>
                    <button className="foro-post-card__confirm-no" onClick={() => { setBaneando(null); setBanReason(""); }}>No</button>
                  </span>
                ) : (
                  <button
                    className="foro-post-card__action-btn foro-post-card__action-btn--ban"
                    onClick={() => { setBaneando(post.auth_user_id); setConfirmacion(null); }}
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
                    {!c.anonimo ? (
                      <Link href={`/perfil?uid=${c.auth_user_id}`} className="foro-post-card__author--link">
                        {displayName(c.auth_user_id, c.anonimo)}
                        {modSet.has(c.auth_user_id) && <span className="mod-badge">Mod</span>}
                      </Link>
                    ) : (
                      <>{displayName(c.auth_user_id, c.anonimo)}</>
                    )}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="foro-comment-card__fecha">
                      {new Date(c.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {userId && userId !== c.auth_user_id && (
                      isConfirming({ tipo: "reportar-comment", id: c.id }) ? (
                        <InlineConfirm
                          label="¿Reportar?"
                          onConfirm={() => handleConfirmar({ tipo: "reportar-comment", id: c.id })}
                          onCancel={() => setConfirmacion(null)}
                        />
                      ) : (
                        <button
                          className="foro-comment-card__eliminar"
                          onClick={() => handleReportarComentario(c.id)}
                        >
                          {comentariosReportados.has(c.id) ? "Quitar reporte" : "Reportar"}
                        </button>
                      )
                    )}
                    {userId === c.auth_user_id && (
                      isConfirming({ tipo: "eliminar-comment", id: c.id }) ? (
                        <InlineConfirm
                          label="¿Eliminar?"
                          onConfirm={() => handleConfirmar({ tipo: "eliminar-comment", id: c.id })}
                          onCancel={() => setConfirmacion(null)}
                        />
                      ) : (
                        <button
                          className="foro-comment-card__eliminar"
                          onClick={() => setConfirmacion({ tipo: "eliminar-comment", id: c.id })}
                        >
                          Eliminar
                        </button>
                      )
                    )}
                    {esMod && userId !== c.auth_user_id && (
                      isConfirming({ tipo: "eliminar-comment-mod", id: c.id }) ? (
                        <InlineConfirm
                          label="¿Eliminar (mod)?"
                          onConfirm={() => handleConfirmar({ tipo: "eliminar-comment-mod", id: c.id })}
                          onCancel={() => setConfirmacion(null)}
                        />
                      ) : (
                        <button
                          className="foro-comment-card__eliminar"
                          style={{ color: "#991b1b" }}
                          onClick={() => setConfirmacion({ tipo: "eliminar-comment-mod", id: c.id })}
                          aria-label="Eliminar comentario (mod)"
                        >
                          <TrashIcon />
                        </button>
                      )
                    )}
                    {esMod && userId !== c.auth_user_id && (
                      baneando === c.auth_user_id ? (
                        <span className="foro-post-card__confirm">
                          <input
                            type="text"
                            className="foro-post-card__ban-input"
                            placeholder="Motivo..."
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            autoFocus
                          />
                          <button className="foro-post-card__confirm-yes" onClick={() => handleBanear(c.auth_user_id)}>Banear</button>
                          <button className="foro-post-card__confirm-no" onClick={() => { setBaneando(null); setBanReason(""); }}>No</button>
                        </span>
                      ) : (
                        <button
                          className="foro-comment-card__eliminar foro-post-card__action-btn--ban"
                          style={{ color: "#b45309" }}
                          onClick={() => { setBaneando(c.auth_user_id); setConfirmacion(null); }}
                          aria-label="Banear autor del comentario"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                          </svg>
                        </button>
                      )
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
                    className="btn-primary"
                    onClick={handleCommentSubmit}
                    disabled={submitting || !newComment.trim()}
                  >
                    {submitting ? "Enviando..." : "Comentar"}
                  </button>
                </div>
                {commentError && <p style={{ color: "#991b1b", fontSize: 13 }} role="alert">{commentError}</p>}
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
