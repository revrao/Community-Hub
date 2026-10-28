import { validateAvatarFile } from "./avatars.ts";
// Leave room for multipart headers and Netlify's base64 binary-request overhead.
export const MAX_AVATAR_REQUEST_BYTES = 4 * 1024 * 1024;
export async function prepareAvatarUpload(file: File): Promise<File> {
  const validation = validateAvatarFile(file);
  if (validation) throw new Error(validation);
  if (file.size <= MAX_AVATAR_REQUEST_BYTES) return file;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    if (bitmap.width * bitmap.height > 16_777_216)
      throw new Error("Image dimensions are too large.");
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing unavailable.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.9),
    );
    if (
      !blob ||
      blob.size === 0 ||
      blob.size > MAX_AVATAR_REQUEST_BYTES ||
      blob.type !== "image/webp"
    )
      throw new Error("Image processing unavailable.");
    return new File([blob], "profile.webp", { type: "image/webp" });
  } catch {
    throw new Error(
      "This image could not be prepared for upload. Choose a smaller JPG, PNG, or WebP image.",
    );
  } finally {
    bitmap?.close();
  }
}
