"use server";
import { roleAccess } from "@/lib/access";
import { serverClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
export async function adminMembers(search: string, adminsOnly: boolean) {
  const { allowed } = await roleAccess("/admin", true);
  if (!allowed) return { data: [], error: "Administrator access required." };
  const db = await serverClient();
  const result = await db.rpc("admin_members", { p_search: search.slice(0, 100), p_admins_only: adminsOnly });
  return { data: result.data ?? [], error: result.error?.message ?? "" };
}
export async function changeAdministrator(userId: string, grant: boolean) {
  const { allowed } = await roleAccess("/admin", true);
  if (!allowed) return { error: "Administrator access required." };
  const db = await serverClient();
  const { error } = await db.rpc("set_administrator", { p_user_id: userId, p_grant: grant });
  if (!error) revalidatePath("/", "layout");
  return { error: error?.message ?? "" };
}
