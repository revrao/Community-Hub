import sharp from "sharp";
import { MAX_AVATAR_BYTES, validateAvatarFile } from "./avatars.ts";
export async function normalizeAvatar(bytes: Uint8Array, mimeType: string) {
  const validation = validateAvatarFile({
    size: bytes.byteLength,
    type: mimeType,
  });
  if (validation) throw new Error(validation);
  try {
    const image = sharp(bytes, {
      limitInputPixels: 16_777_216,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    const formats: Record<string, string> = {
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    if (
      !metadata.format ||
      formats[metadata.format] !== mimeType ||
      (metadata.pages ?? 1) > 1
    )
      throw new Error("Unsupported image");
    // Sharp strips EXIF/GPS metadata by default; rotate honors orientation before stripping.
    return await image
      .rotate()
      .resize(512, 512, { fit: "cover", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new Error(
      "This image cannot be processed. Choose a valid, static JPG, PNG, or WebP image up to 16 megapixels.",
    );
  }
}
export async function readAvatarForm(request: Request) {
  const limit = MAX_AVATAR_BYTES + 64 * 1024;
  if (Number(request.headers.get("content-length")) > limit)
    throw new Error("Choose an image no larger than 5 MB.");
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
    throw new Error("Choose an image to upload.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Choose an image to upload.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("Choose an image no larger than 5 MB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const form = await new Response(Buffer.concat(chunks), {
    headers: { "Content-Type": request.headers.get("content-type")! },
  }).formData();
  const file = form.get("photo");
  if (!(file instanceof File)) throw new Error("Choose an image to upload.");
  return file;
}
