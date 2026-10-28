"use client";
import { useState } from "react";
import { avatarSources } from "@/lib/avatars";
export function Avatar({
  name,
  customUrl,
  googleUrl,
  className = "",
}: {
  name: string;
  customUrl?: string | null;
  googleUrl?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const source = avatarSources(customUrl, googleUrl).find(
    (url) => !failed.includes(url),
  );
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "○";
  return (
    <span className={`avatar ${className}`} aria-hidden="true">
      {source ? (
        <img
          src={source}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed((a) => [...a, source])}
        />
      ) : (
        initials
      )}
    </span>
  );
}
