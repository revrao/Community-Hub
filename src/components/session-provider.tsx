"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { User } from "@supabase/supabase-js";
import { browserClient } from "@/lib/supabase/browser";
import { databaseMessage } from "@/lib/auth";
export type ProfileRecord = {
  id: string;
  display_name: string;
  bio: string;
  location_area: string;
  interests: string[];
  leaderboard_visible: boolean;
};
type Session = {
  user: User | null;
  profile: ProfileRecord | null;
  role: string | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};
const Context = createContext<Session | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const db = browserClient();
      const { data, error: authError } = await db.auth.getUser();
      if (authError && !authError.message.includes("session missing")) {
        setError("Unable to verify your session. Please sign in again.");
      } else setError("");
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
        setProfile(p.data);
        setRole(r.data?.role ?? null);
        if (p.error) setError(databaseMessage(p.error.message));
      } else {
        setProfile(null);
        setRole(null);
      }
    } catch {
      setError("Unable to connect to Supabase. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const { data } = browserClient().auth.onAuthStateChange(() => {
      setTimeout(() => void refresh(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);
  return (
    <Context.Provider value={{ user, profile, role, loading, error, refresh }}>
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("Session provider missing");
  return value;
}
