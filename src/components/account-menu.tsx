"use client";
import { AdminBadge } from "./admin-badge";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "./session-provider";
import { Avatar } from "./avatar";
import { Icon } from "./ui";
import { accountLinks } from "@/lib/profile-navigation";
export function AccountMenu() {
  const { user, profile, role, loading, signOut, avatarUrl } = useSession();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const openAt = useRef("first");
  const id = useId();
  const entries = () =>
    Array.from(
      menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    ).filter((el) => !el.hasAttribute("disabled"));
  useEffect(() => {
    setOpen(false);
    setError("");
  }, [path, user?.id]);
  useEffect(() => {
    if (!open) return;
    const list = entries();
    (openAt.current === "last" ? list.at(-1) : list[0])?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  if (loading)
    return (
      <span className="avatar" aria-label="Loading account">
        ○
      </span>
    );
  if (!user)
    return (
      <div className="guest-auth">
        <Link href="/login">Log In</Link>
        <Link href="/signup">Sign Up</Link>
      </div>
    );
  const name = profile?.display_name || "Community Member";
  return (
    <div
      className="account-control"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="account-trigger"
        aria-label="Open account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          openAt.current = "first";
          setOpen((value) => !value);
          setError("");
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openAt.current = event.key === "ArrowUp" ? "last" : "first";
            setOpen(true);
          }
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        <Avatar
          name={name}
          customUrl={avatarUrl}
          googleUrl={profile?.google_avatar_url}
        />
      </button>
      {open && (
        <div
          className="account-menu"
          ref={menu}
          id={id}
          role="menu"
          aria-label="Account menu"
          onKeyDown={(event) => {
            const list = entries();
            const index = list.indexOf(document.activeElement as HTMLElement);
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? list.length - 1
                    : (index +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        list.length) %
                      list.length;
              list[next]?.focus();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              trigger.current?.focus();
            } else if (event.key === "Tab") {
              setOpen(false);
              trigger.current?.focus();
            } else if (
              event.key.length === 1 &&
              event.key.trim() &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey
            ) {
              const rotated = [
                ...list.slice(index + 1),
                ...list.slice(0, index + 1),
              ];
              const match = rotated.find((el) =>
                el.textContent
                  ?.trim()
                  .toLowerCase()
                  .startsWith(event.key.toLowerCase()),
              );
              if (match) {
                event.preventDefault();
                match.focus();
              }
            }
          }}
        >
          <div className="account-menu-heading" role="none">
            <strong>{name}<AdminBadge role={role} /></strong>
            <span>{user.email}</span>
          </div>
          {accountLinks(role).map((item) => (
            <Link
              key={item.href}
              role="menuitem"
              tabIndex={-1}
              href={item.href}
              onClick={() => setOpen(false)}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
          <div className="account-menu-separator" role="separator" />
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            disabled={busy}
            className="account-signout"
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await signOut();
                setOpen(false);
                router.replace("/");
                router.refresh();
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Unable to sign out. Please try again.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Icon name="logout" />
            {busy ? "Signing out…" : "Sign Out"}
          </button>
          {error && (
            <p className="error-note" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
