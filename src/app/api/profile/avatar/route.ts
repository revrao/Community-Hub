import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET, isAvatarPathForUser } from "@/lib/avatars";
import { normalizeAvatar, readAvatarForm } from "@/lib/avatar-image";
import { sameOrigin } from "@/lib/request-origin";
export const runtime = "nodejs";
const response = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function changePicture(request: NextRequest, remove = false) {
  if (!sameOrigin(request))
    return response({ error: "This request is not allowed." }, 403);
  const db = await serverClient();
  const { data, error: authError } = await db.auth.getUser();
  if (authError || !data.user)
    return response(
      { error: "Please sign in again before changing your picture." },
      401,
    );
  const id = data.user.id;
  let path: string | null = null;
  if (!remove) {
    try {
      const file = await readAvatarForm(request);
      const bytes = await normalizeAvatar(
        new Uint8Array(await file.arrayBuffer()),
        file.type,
      );
      path = `${id}/${crypto.randomUUID()}.webp`;
      const { error } = await db.storage
        .from(AVATAR_BUCKET)
        .upload(path, bytes, {
          contentType: "image/webp",
          cacheControl: "60",
          upsert: false,
        });
      if (error)
        return response(
          {
            error:
              "Your picture could not be uploaded. Please try again; profile-photo Storage may need setup.",
          },
          503,
        );
    } catch (error) {
      return response(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unable to process this image.",
        },
        400,
      );
    }
  }
  const result = await db.rpc("set_profile_avatar", { p_path: path });
  if (result.error) {
    if (path) await db.storage.from(AVATAR_BUCKET).remove([path]);
    return response(
      {
        error:
          "Your picture could not be saved. Please try again; the profile-photo migration may need to be applied.",
      },
      503,
    );
  }
  const previous = result.data as string | null;
  let cleanupPending = false;
  if (previous && previous !== path && isAvatarPathForUser(previous, id)) {
    const cleanup = await db.storage.from(AVATAR_BUCKET).remove([previous]);
    cleanupPending = Boolean(cleanup.error);
  }
  return response({ ok: true, cleanupPending });
}
export async function POST(request: NextRequest) {
  try {
    return await changePicture(request);
  } catch {
    return response(
      { error: "Unable to change your picture. Please try again." },
      503,
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    return await changePicture(request, true);
  } catch {
    return response(
      { error: "Unable to remove your picture. Please try again." },
      503,
    );
  }
}
