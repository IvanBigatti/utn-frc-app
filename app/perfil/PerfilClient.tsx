"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import { getAvatarSrc, type AvatarConfig, type UnlockConditionType } from "@/app/components/avatars";
import { banearUsuario, desbanearUsuario } from "@/app/actions/moderador";
import EliminarCuentaModal from "@/app/components/EliminarCuentaModal/EliminarCuentaModal";
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

export type PerfilData = {
  viewedUid: string;
  isOwnProfile: boolean;
  email: string | null;
  avatarKey: string | null;
  avatarSrc: string | null;
  username: string | null;
  metrics: Metrics;
  posts: Post[];
  avatarConfigs: AvatarConfig[];
  isMod: boolean;
  isViewedUserMod: boolean;
  targetIsBanned: boolean;
  targetBanReason: string;
};

export default function PerfilClient({ data }: { data: PerfilData }) {
  const supabase = createClient();
  const router = useRouter();

  // Todo esto llega resuelto desde el servidor, dentro del HTML. Antes se
  // pedía desde el navegador en cuatro tandas encadenadas: sesión, lote de
  // siete consultas, suma de votos y par de moderadores. Cada tanda era un
  // viaje Córdoba -> Virginia de ~200ms, así que el perfil tardaba casi un
  // segundo en mostrar algo. Desde el servidor las mismas consultas cuestan
  // ~2ms cada una porque corren al lado de la base.
  //
  // Siguen siendo estado y no props directas porque la pantalla las edita:
  // cambiar de avatar, guardar el nombre, banear.
  const userId = data.viewedUid;
  const isOwnProfile = data.isOwnProfile;
  const email = data.email;
  const metrics = data.metrics;
  const posts = data.posts;
  const avatarConfigs = data.avatarConfigs;
  const isMod = data.isMod;
  const isViewedUserMod = data.isViewedUserMod;
  const targetUid = data.isOwnProfile ? null : data.viewedUid;

  const [avatarKey, setAvatarKey] = useState<string | null>(data.avatarKey);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(data.avatarSrc);
  const [saved, setSaved] = useState(false);
  const [profileUsername, setProfileUsername] = useState<string | null>(data.username);
  const [usernameEdit, setUsernameEdit] = useState(data.username ?? "");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaved, setUsernameSaved] = useState(false);

  // Moderación de usuario ajeno
  const [targetIsBanned, setTargetIsBanned] = useState(data.targetIsBanned);
  const [targetBanReason, setTargetBanReason] = useState(data.targetBanReason);
  const [banInput, setBanInput] = useState("");
  const [banPending, setBanPending] = useState(false);
  const [banError, setBanError] = useState("");
  const [showEliminarModal, setShowEliminarModal] = useState(false);

  const handleSelectAvatar = async (av: AvatarConfig) => {
    if (!userId || !isOwnProfile) return;
    const { unlocked } = getUnlockProgress(av, metrics);
    if (!unlocked) return;
    setAvatarKey(av.key);
    setAvatarSrc(av.src);
    await supabase.from("profiles").upsert({
      id: userId,
      avatar_key: av.key,
      avatar_src: av.src,
      updated_at: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleBan = async () => {
    if (!targetUid) return;
    setBanPending(true);
    setBanError("");
    const result = await banearUsuario(targetUid, banInput);
    if (result.error) {
      setBanError(result.error);
    } else {
      setTargetIsBanned(true);
      setTargetBanReason(banInput);
      setBanInput("");
    }
    setBanPending(false);
  };

  const handleUnban = async () => {
    if (!targetUid) return;
    setBanPending(true);
    setBanError("");
    const result = await desbanearUsuario(targetUid);
    if (result.error) {
      setBanError(result.error);
    } else {
      setTargetIsBanned(false);
      setTargetBanReason("");
    }
    setBanPending(false);
  };

  const handleSaveUsername = async () => {
    if (!userId) return;
    const val = usernameEdit.trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,30}$/.test(val)) {
      setUsernameError("3–30 caracteres, solo letras minúsculas, números, _ o -");
      return;
    }
    setUsernameError("");
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      username: val,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setUsernameError(error.code === "23505" ? "Ese nombre ya está en uso" : "Error al guardar. Intentá de nuevo.");
      return;
    }
    setProfileUsername(val);
    setUsernameSaved(true);
    setTimeout(() => setUsernameSaved(false), 2000);
  };

  const displayName = profileUsername ?? (email?.split("@")[0] ?? "usuario");

  return (
    <div className="perfil-page">

      {/* Panel de moderación — solo visible para mods viendo un perfil ajeno */}
      {isMod && !isOwnProfile && targetUid && (
        <div className="perfil-mod-panel">
          <div className="perfil-mod-panel__header">
            <span className="mod-badge">Mod</span>
            <span className="perfil-mod-panel__title">Moderación de usuario</span>
            {targetIsBanned && (
              <span className="perfil-mod-panel__banned-badge">Baneado</span>
            )}
          </div>
          {targetIsBanned && targetBanReason && (
            <p className="perfil-mod-panel__reason">
              <strong>Motivo actual:</strong> {targetBanReason}
            </p>
          )}
          {!targetIsBanned && (
            <div className="perfil-mod-panel__ban-row">
              <input
                type="text"
                className="perfil-mod-panel__input"
                placeholder="Motivo del baneo (opcional)"
                value={banInput}
                onChange={(e) => setBanInput(e.target.value)}
                disabled={banPending}
              />
              <button
                className="perfil-mod-panel__btn perfil-mod-panel__btn--ban"
                onClick={handleBan}
                disabled={banPending}
              >
                {banPending ? "..." : "Banear"}
              </button>
            </div>
          )}
          {targetIsBanned && (
            <button
              className="perfil-mod-panel__btn perfil-mod-panel__btn--unban"
              onClick={handleUnban}
              disabled={banPending}
            >
              {banPending ? "..." : "Quitar baneo"}
            </button>
          )}
          {banError && <p className="perfil-mod-panel__error">{banError}</p>}
        </div>
      )}

      {/* Header */}
      <div className="perfil-header">
        <div className="perfil-avatar-wrapper">
          <img
            src={avatarSrc ?? getAvatarSrc(avatarKey)}
            alt=""
            className="perfil-avatar"
          />
        </div>
        <div className="perfil-info">
          <h1 className="perfil-username">
            {displayName}
            {isViewedUserMod && <span className="mod-badge">Mod</span>}
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

      {/* Selector de avatar — solo en perfil propio */}
      {isOwnProfile && (
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
                  <img src={av.src} alt={av.name} loading="lazy" />
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
      )}

      {/* Editor de nombre de usuario — solo en perfil propio */}
      {isOwnProfile && (
        <div className="perfil-section">
          <h2 className="perfil-section__title">Tu nombre visible</h2>
          <div className="perfil-username-editor">
            <div className="perfil-username-editor__row">
              <input
                type="text"
                className="perfil-username-editor__input"
                value={usernameEdit}
                onChange={(e) => { setUsernameEdit(e.target.value); setUsernameError(""); }}
                placeholder={email?.split("@")[0] ?? "tu nombre"}
                maxLength={30}
                spellCheck={false}
                autoComplete="off"
              />
              <button
                className="perfil-username-editor__btn"
                onClick={handleSaveUsername}
              >
                Guardar
              </button>
            </div>
            {usernameError && <p className="perfil-username-editor__error">{usernameError}</p>}
            <p className="perfil-username-editor__hint">3–30 caracteres · solo letras minúsculas, números, _ o -</p>
            <div className="perfil-saved" style={{ opacity: usernameSaved ? 1 : 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Nombre guardado
            </div>
          </div>
        </div>
      )}

      {/* Mis publicaciones */}
      <div className="perfil-section">
        <h2 className="perfil-section__title">Mis publicaciones en el foro</h2>
        {posts.length === 0 ? (
          <div className="perfil-empty">
            <p style={{ margin: '0 0 12px' }}>Todavía no publicaste nada en el foro.</p>
            <Link href="/foro" className="btn-primary" style={{ textDecoration: 'none', fontSize: '13px', padding: '7px 16px' }}>
              Ir al foro
            </Link>
          </div>
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

      {/* Zona peligrosa — solo en perfil propio */}
      {isOwnProfile && (
        <div className="perfil-section perfil-danger-zone">
          <h2 className="perfil-section__title perfil-danger-zone__title">Zona peligrosa</h2>
          <p className="perfil-danger-zone__desc">
            Eliminar tu cuenta borrará permanentemente todos tus datos: publicaciones, comentarios, archivos y progreso. Esta acción no se puede deshacer.
          </p>
          <button
            className="perfil-danger-zone__btn"
            onClick={() => setShowEliminarModal(true)}
          >
            Eliminar mi cuenta
          </button>
        </div>
      )}

      <EliminarCuentaModal
        isOpen={showEliminarModal}
        onClose={() => setShowEliminarModal(false)}
      />

    </div>
  );
}

