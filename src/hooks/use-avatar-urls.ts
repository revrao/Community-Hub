"use client";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
import {
  AVATAR_BUCKET,
  type AvatarPhoto,
  isAvatarPathForUser,
} from "@/lib/avatars";
export function useAvatarUrls(photos: AvatarPhoto[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = JSON.stringify(photos.map((p) => [p.user_id, p.avatar_path]));
  useEffect(() => {
    let active = true;
    const entries = JSON.parse(key) as [string, string | null][];
    const paths = entries.filter((entry): entry is [string, string] =>
      Boolean(entry[1] && isAvatarPathForUser(entry[1], entry[0])),
    );
    const refresh = async () => {
      if (!paths.length) {
        if (active) setUrls({});
        return;
      }
      try {
        const { data, error } = await browserClient()
          .storage.from(AVATAR_BUCKET)
          .createSignedUrls(
            paths.map((p) => p[1]),
            300,
          );
        if (!active) return;
        if (error) {
          setUrls({});
          return;
        }
        setUrls(
          Object.fromEntries(
            paths.flatMap(([id, path]) => {
              const item = data?.find(
                (d: { path?: string; signedUrl?: string }) => d.path === path,
              );
              return item?.signedUrl ? [[id, item.signedUrl]] : [];
            }),
          ),
        );
      } catch {
        if (active) setUrls({});
      }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 240000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [key]);
  return urls;
}
