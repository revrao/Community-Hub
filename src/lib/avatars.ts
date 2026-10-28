export const AVATAR_BUCKET = "avatars";
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type AvatarPhoto = {
  user_id: string;
  avatar_path: string | null;
  google_avatar_url: string | null;
};
export function safeGooglePhoto(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      (url.hostname === "googleusercontent.com" ||
        url.hostname.endsWith(".googleusercontent.com"))
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function isAvatarPathForUser(path: string, userId: string) {
  const parts = path.split("/");
  return (
    parts.length === 2 &&
    parts[0] === userId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/.test(
      parts[1],
    )
  );
}
export function avatarSources(
  customUrl: string | null | undefined,
  googleUrl: unknown,
) {
  return [customUrl || null, safeGooglePhoto(googleUrl)].filter(
    (value): value is string => Boolean(value),
  );
}
export function validateAvatarFile(file: Pick<File, "size" | "type">) {
  if (!AVATAR_MIME_TYPES.some((type) => type === file.type))
    return "Choose a JPG, PNG, or WebP image.";
  if (file.size === 0) return "This image is empty.";
  if (file.size > MAX_AVATAR_BYTES)
    return "Choose an image no larger than 5 MB.";
  return null;
}
