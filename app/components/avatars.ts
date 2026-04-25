const BASE = "https://api.dicebear.com/9.x";

export const AVATARS = [
  { key: "astro",   src: `${BASE}/pixel-art/svg?seed=Astro&backgroundColor=b6e3f4`,   label: "Astro" },
  { key: "luna",    src: `${BASE}/pixel-art/svg?seed=Luna&backgroundColor=ffd5dc`,    label: "Luna" },
  { key: "robot",   src: `${BASE}/bottts-neutral/svg?seed=Robot&backgroundColor=c0aede`, label: "Robot" },
  { key: "felix",   src: `${BASE}/pixel-art/svg?seed=Felix&backgroundColor=d1f4cc`,   label: "Felix" },
  { key: "mochi",   src: `${BASE}/pixel-art/svg?seed=Mochi&backgroundColor=ffeaa7`,   label: "Mochi" },
  { key: "zara",    src: `${BASE}/pixel-art/svg?seed=Zara&backgroundColor=fab1a0`,    label: "Zara" },
  { key: "cosmo",   src: `${BASE}/bottts-neutral/svg?seed=Cosmo&backgroundColor=a29bfe`, label: "Cosmo" },
  { key: "nova",    src: `${BASE}/pixel-art/svg?seed=Nova&backgroundColor=fd79a8`,    label: "Nova" },
] as const;

export type AvatarKey = typeof AVATARS[number]["key"];

export type UnlockConditionType = "upload_files" | "rate_files" | "upvote_posts" | "post_forum";

export type UnlockCondition = {
  type: UnlockConditionType;
  threshold: number;
  description: string;
};

export type AvatarConfig = {
  key: string;
  name: string;
  src: string;
  is_free: boolean;
  unlock_condition: UnlockCondition | null;
  display_order: number;
};

const DEFAULT_AVATAR_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e5e7eb'/%3E%3Ccircle cx='20' cy='16' r='7' fill='%239ca3af'/%3E%3Cellipse cx='20' cy='34' rx='11' ry='8' fill='%239ca3af'/%3E%3C/svg%3E`;

export function getAvatarSrc(key: string | null | undefined): string {
  if (!key) return DEFAULT_AVATAR_SVG;
  return AVATARS.find((a) => a.key === key)?.src ?? DEFAULT_AVATAR_SVG;
}
