"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import type { User } from "@supabase/supabase-js";
import { browserClient } from "@/lib/supabase/browser";
import { useAvatarUrls } from "@/hooks/use-avatar-urls";
import { databaseMessage } from "@/lib/auth";
export type ProfileRecord = {
  id: string;
  display_name: string;
  bio: string;
  location_area: string;
  interests: string[];
  leaderboard_visible: boolean;
  avatar_path?: string | null;
  google_avatar_url?: string | null;
};
type Session = {
  user: User | null;
  profile: ProfileRecord | null;
  role: string | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  avatarUrl: string | null;
};
const Context = createContext<Session | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const identity = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try {
      const db = browserClient();
      const { data, error: authError } = await db.auth.getUser();
      if (request !== generation.current) return;
      if (authError && !authError.message.includes("session missing")) {
        setError("Unable to verify your session. Please sign in again.");
      } else setError("");
      if (identity.current !== (data.user?.id ?? null)) {
        setProfile(null);
        setRole(null);
        identity.current = data.user?.id ?? null;
      }
      setUser(data.user);
      if (data.user) {
        const [p, r] = await Promise.all([
          db.from("profiles").select("*").eq("id", data.user.id).single(),
          db
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .maybeSingle(),
        ]);
        if (request !== generation.current) return;
        setProfile(p.data);
        setRole(r.data?.role ?? null);
        if (p.error) setError(databaseMessage(p.error.message));
      } else {
        setProfile(null);
        setRole(null);
      }
    } catch {
      if (request === generation.current)
        setError("Unable to connect to Supabase. Check your connection.");
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);
  const signOut = useCallback(async () => {
    const { error } = await browserClient().auth.signOut({ scope: "local" });
    if (error) throw new Error("Unable to sign out. Please try again.");
    generation.current++;
    identity.current = null;
    setUser(null);
    setProfile(null);
    setRole(null);
    setError("");
    setLoading(false);
  }, []);
  const photoUrls = useAvatarUrls(
    profile
      ? [
          {
            user_id: profile.id,
            avatar_path: profile.avatar_path ?? null,
            google_avatar_url: profile.google_avatar_url ?? null,
          },
        ]
      : [],
  );
  const avatarUrl = profile ? (photoUrls[profile.id] ?? null) : null;
  useEffect(() => {
    void refresh();
    const { data } = browserClient().auth.onAuthStateChange(() => {
      setTimeout(() => void refresh(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);
  return (
    <Context.Provider
      value={{
        user,
        profile,
        role,
        loading,
        error,
        refresh,
        signOut,
        avatarUrl,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("Session provider missing");
  return value;
}
