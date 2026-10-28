import "server-only";
import { serverClient } from "./supabase/server";
import { eventFromRow } from "./data";
import { databaseMessage } from "./auth";
export async function getEvents() {
  try {
    const db = await serverClient();
    const { data, error } = await db
      .from("event_list")
      .select("*")
      .eq("status", "approved")
      .gt("ends_at", new Date().toISOString())
      .order("starts_at");
    return {
      events: error ? [] : (data ?? []).map(eventFromRow),
      error: error ? databaseMessage(error.message) : "",
    };
  } catch {
    return {
      events: [],
      error: "Unable to connect to the event database. Please try again.",
    };
  }
}
export async function getEvent(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return { event: null, error: "" };
  try {
    const db = await serverClient();
    const { data, error } = await db
      .from("event_list")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return {
      event: data ? eventFromRow(data) : null,
      error: error ? databaseMessage(error.message) : "",
    };
  } catch {
    return {
      event: null,
      error: "Unable to connect to the event database. Please try again.",
    };
  }
}
