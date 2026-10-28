"use client";
import { useState, useRef } from "react";
import { useSession } from "./session-provider";
import { Avatar } from "./avatar";
import { validateAvatarFile } from "@/lib/avatars";
export function ProfilePictureEditor() {
  const { profile, avatarUrl, refresh } = useSession();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const update = async (file?: File) => {
    setError("");
    setMessage("");
    if (file) {
      const problem = validateAvatarFile(file);
      if (problem) {
        setError(problem);
        return;
      }
    }
    setBusy(true);
    try {
      const body = file ? new FormData() : undefined;
      if (file) body!.set("photo", file);
      const result = await fetch("/api/profile/avatar", {
        method: file ? "POST" : "DELETE",
        body,
        credentials: "same-origin",
      });
      const data = await result.json();
      if (!result.ok) {
        setError(data.error || "Unable to change your picture.");
        return;
      }
      await refresh();
      setMessage(
        (file
          ? "Profile picture saved."
          : "Custom picture removed. Your Google photo or initials will appear.") +
          (data.cleanupPending
            ? " The old image file could not be removed; your profile change was saved."
            : ""),
      );
    } catch {
      setError(
        "Unable to confirm the change. Refresh your profile before trying again.",
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  if (!profile) return null;
  return (
    <section className="picture-editor" aria-label="Profile picture">
      <div className="row wrap">
        <Avatar
          name={profile.display_name}
          customUrl={avatarUrl}
          googleUrl={profile.google_avatar_url}
          className="large"
        />
        <div className="grow">
          <h3>Profile picture</h3>
          <p className="small muted">
            JPG, PNG, or WebP · Up to 5 MB. Photos are resized and photo
            metadata is removed. Changes are saved immediately.
          </p>
          <p className="small muted">
            Your photo is shared with your name when you appear in public
            rankings.
          </p>
          <div className="row wrap">
            <button
              type="button"
              className="btn outline"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              {busy ? "Updating…" : "Change Profile Picture"}
            </button>
            {profile.avatar_path && (
              <button
                type="button"
                className="btn ghost"
                disabled={busy}
                onClick={() => void update()}
              >
                Remove Custom Picture
              </button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Choose a profile picture"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void update(file);
        }}
      />
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="soft-note" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
