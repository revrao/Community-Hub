"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";
let client: ReturnType<typeof createBrowserClient> | undefined;
export function browserClient() {
  const { url, key } = supabaseConfig();
  return (client ??= createBrowserClient(url, key));
}
