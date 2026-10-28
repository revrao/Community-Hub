import "server-only";
import { redirect } from "next/navigation";
import { serverClient } from "./supabase/server";
export async function roleAccess(next: string, admin = false) {
  const db = await serverClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) redirect("/login?next=" + encodeURIComponent(next));
  const result = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();
  return {
    allowed: admin
      ? result.data?.role === "admin"
      : ["organizer", "admin"].includes(result.data?.role ?? ""),
    user: data.user,
  };
}
