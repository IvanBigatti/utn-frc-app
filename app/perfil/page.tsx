"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { getAvatarSrc, type AvatarConfig, type UnlockConditionType } from "@/app/components/avatars";
import "./perfil.css";

type Post = {
  id: number;
  titulo: string;
  created_at: string;
  vote_score: number;
  comment_count: number;
};

type Metrics = {
  posts: number;
  votes: number;
  archivos: number;
  upvotes_given: number;
  ratings_given: number;
};

function getUnlockProgress(av: AvatarConfig, metrics: Metrics): { unlocked: boolean; current: number; threshold: number } {
  if (av.is_free || !av.unlock_condition) return { unlocked: true, current: 0, threshold: 0 };
  const { type, threshold } = av.unlock_condition;
  const map: Record<UnlockConditionType, number> = {
    upload_files: metrics.archivos,
    rate_files: metrics.ratings_given,
    upvote_posts: metrics.upvotes_given,
    post_forum: metrics.posts,
  };
  const current = map[type] ?? 0;
  return { unlocked: current >= threshold, current, threshold };
}

export default function PerfilPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [avatarKey, setAvatarKey] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics>({ posts: 0, votes: 0, archivos: 0, upvotes_given: 0, ratings_given: 0 });
  const [posts, setPosts] = useState<Post[]>([]);
  const [saved, setSaved] = useState(false);
  const [isMod, setIsMod] = useState(false);
  const [avatarConfigs, setAvatarConfigs] = useState<AvatarConfig[]>([]);

  const fetchData = useCallback(async (uid: string) => {
    const [profileRes, postsCountRes, archivosRes, postsRes, upvotesRes, ratingsRes, avatarConfigsRes] = await Promise.all([
      supabase.from("profiles").select("avatar_key").eq("id", uid).maybeSingle(),
      supabase.from("foro_post").select("*", { count: "exact", head: true }).eq("auth_user_id", uid),
      supabase.from("archivos").select("*", { count: "exact", head: true }).eq("auth_user_id", uid),
      supabase
        .from("foro_post_summary")
        .select("id, titulo, created_at, vote_score, comment_count")
        .eq("auth_user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("foro_vote").select("*", { count: "exact", head: true }).eq("auth_user_id", uid).eq("value", 1),
      supabase.from("puntuaciones").select("*", { count: "exact", head: true }).eq("usuario_id", uid),
      supabase.from("avatar_configs").select("*").order("display_order"),
    ]);

    setAvatarKey(profileRes.data?.avatar_key ?? null);
    setAvatarConfigs((avatarConfigsRes.data ?? []) as AvatarConfig[]);

    const { data: votesData } = await supabase
      .from("foro_post_summary")
      .select("vote_score")
      .eq("auth_user_id", uid);

    const totalVotes = votesData?.reduce((acc, p) => acc + (p.vote_score ?? 0), 0) ?? 0;

    setMetrics({
      posts: postsCountRes.count ?? 0,
      votes: totalVotes,
      archivos: archivosRes.count ?? 0,
      upvotes_given: upvotesRes.count ?? 0,
      ratings_given: ratingsRes.count ?? 0,
    });

    setPosts((postsRes.data ?? []) as Post[]);

    const { data: modData } = await supabase.from("moderadores").select("user_id").eq("user_id", uid).maybeSingle();
    setIsMod(!!modData);

    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.replace("/login");
        return;
      }
      setUserId(session.user.id);
      setEmail(session.user.email ?? null);
      fetchData(session.user.id);
    });
  }, [fetchData, router]);

  const handleSelectAvatar = async (av: AvatarConfig) => {
    if (!userId) return;
    const { unlocked } = getUnlockProgress(av, metrics);
    if (!unlocked) return;
    setAvatarKey(av.key);
    await supabase.from("profiles").upsert({
      id: userId,
      avatar_key: av.key,
      avatar_src: av.src,
      updated_at: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const username = email?.split("@")[0] ?? "usuario";

  if (loading) {
    return <div className="perfil-loading" role="status" aria-live="polite">Cargando perfil...</div>;
  }

  return (
    <div className="perfil-page">

      {/* Header */}
      <div className="perfil-header">
        <div className="perfil-avatar-wrapper">
          <img
            src={getAvatarSrc(avatarKey)}
            alt="Avatar"
            className="perfil-avatar"
          />
        </div>
        <div className="perfil-info">
          <h1 className="perfil-username">
            {username}
            {isMod && <span className="mod-badge">Mod</span>}
          </h1>
          <p className="perfil-email">{email}</p>
        </div>
      </div>

      {/* Métricas */}
      <div className="perfil-section">
        <h2 className="perfil-section__title">Mis estadísticas</h2>
        <div className="perfil-metrics">
          <div className="perfil-metric-card">
            <div className="perfil-metric-card__value">{metrics.posts}</div>
            <div className="perfil-metric-card__label">Publicaciones</div>
          </div>
          <div className="perfil-metric-card">
            <div className="perfil-metric-card__value">{metrics.votes}</div>
            <div className="perfil-metric-card__label">Votos recibidos</div>
          </div>
          <div className="perfil-metric-card">
            <div className="perfil-metric-card__value">{metrics.archivos}</div>
            <div className="perfil-metric-card__label">Archivos subidos</div>
          </div>
        </div>
      </div>

      {/* Selector de avatar */}
      <div className="perfil-section">
        <h2 className="perfil-section__title">Elegí tu avatar</h2>
        <div className="perfil-avatar-grid">
          {avatarConfigs.map((av) => {
            const { unlocked, current, threshold } = getUnlockProgress(av, metrics);
            return (
              <button
                key={av.key}
                className={`perfil-avatar-option ${avatarKey === av.key ? "selected" : ""} ${!unlocked ? "locked" : ""}`}
                onClick={() => handleSelectAvatar(av)}
                title={unlocked ? av.name : av.unlock_condition?.description ?? "Bloqueado"}
                disabled={!unlocked}
              >
                <div className="perfil-avatar-img-wrapper">
                  <img src={av.src} alt={av.name} />
                  {!unlocked && (
                    <div className="perfil-avatar-lock-overlay" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                  )}
                </div>
                <span>{av.name}</span>
                {!unlocked && av.unlock_condition && (
                  <>
                    <span className="perfil-avatar-unlock-hint">{current}/{threshold}</span>
                    <span className="perfil-avatar-unlock-desc">{av.unlock_condition.description}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
        <div className="perfil-saved" style={{ opacity: saved ? 1 : 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Avatar guardado
        </div>
      </div>

      {/* Mis publicaciones */}
      <div className="perfil-section">
        <h2 className="perfil-section__title">Mis publicaciones en el foro</h2>
        {posts.length === 0 ? (
          <div className="perfil-empty">Todavía no publicaste nada en el foro.</div>
        ) : (
          <div className="perfil-posts">
            {posts.map((post) => (
              <button
                key={post.id}
                className="perfil-post-item"
                onClick={() => router.push(`/foro/${post.id}`)}
                aria-label={`Ver publicación: ${post.titulo}`}
              >
                <div className="perfil-post-item__score">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4l8 8H4z" />
                  </svg>
                  <span className={
                    post.vote_score > 0
                      ? "perfil-post-item__score--positive"
                      : post.vote_score < 0
                      ? "perfil-post-item__score--negative"
                      : ""
                  }>
                    {post.vote_score}
                  </span>
                </div>
                <div className="perfil-post-item__content">
                  <p className="perfil-post-item__title">{post.titulo}</p>
                  <div className="perfil-post-item__meta">
                    <span>
                      {new Date(post.created_at).toLocaleDateString("es-AR", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                    <span>💬 {post.comment_count}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
