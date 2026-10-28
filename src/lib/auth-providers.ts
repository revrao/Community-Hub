import "server-only";
import { supabaseConfig } from "./supabase/config";
export async function googleAvailability() {
  try {
    const { url, key } = supabaseConfig();
    const result = await fetch(new URL("/auth/v1/settings", url), {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!result.ok) return { enabled: false, checked: false };
    const data = await result.json();
    return { enabled: data.external?.google === true, checked: true };
  } catch {
    return { enabled: false, checked: false };
  }
}
