"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";
import { safeNext } from "@/lib/auth";
import { useSession } from "./session-provider";
export function AuthForm({
  signup,
  next,
  error: initialError,
}: {
  signup?: boolean;
  next?: string;
  error?: string;
}) {
  const router = useRouter();
  const { refresh } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    initialError
      ? "The confirmation link could not be verified. Try signing in or request a new confirmation."
      : "",
  );
  const [message, setMessage] = useState("");
  const destination = safeNext(next);
  return (
    <div className="page auth-page">
      <form
        className="card card-pad"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setMessage("");
          const form = new FormData(e.currentTarget);
          try {
            const db = browserClient();
            const email = String(form.get("email")).trim();
            const password = String(form.get("password"));
            const result = signup
              ? await db.auth.signUp({
                  email,
                  password,
                  options: {
                    data: { display_name: String(form.get("name")).trim() },
                    emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
                  },
                })
              : await db.auth.signInWithPassword({ email, password });
            if (result.error) {
              setError(result.error.message);
              return;
            }
            if (signup && !result.data.session) {
              setMessage(
                "Check your email to confirm your account, then return here to sign in.",
              );
              return;
            }
            await refresh();
            router.push(destination);
            router.refresh();
          } catch {
            setError("Unable to connect. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1>{signup ? "Join CommunityHub" : "Welcome back"}</h1>
        <p className="muted about">
          {signup
            ? "Find your place in the community."
            : "Sign in to register for events and manage your profile."}
        </p>
        {signup && (
          <>
            <label className="field-label" htmlFor="name">
              Full name
            </label>
            <input
              name="name"
              id="name"
              required
              maxLength={80}
              pattern=".*\S.*"
              autoComplete="name"
            />
          </>
        )}
        <label className="field-label" htmlFor="email">
          Email
        </label>
        <input
          name="email"
          id="email"
          type="email"
          required
          autoComplete="email"
        />
        <label className="field-label" htmlFor="password">
          Password
        </label>
        <input
          name="password"
          id="password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete={signup ? "new-password" : "current-password"}
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
        <button className="btn full" disabled={busy}>
          {busy ? "Please wait…" : signup ? "Create account" : "Log in"}
        </button>
        <p className="muted about">
          {signup ? "Already a member?" : "New to CommunityHub?"}{" "}
          <Link
            href={`${signup ? "/login" : "/signup"}?next=${encodeURIComponent(destination)}`}
          >
            {signup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </form>
    </div>
  );
}
