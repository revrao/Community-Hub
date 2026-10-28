// Read-only/negative-access probes only: no accounts, events, or registrations created.
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Supabase configuration is missing.");
let failures = 0;
async function probe(
  label,
  path,
  { method = "GET", body, allowed = [200] } = {},
) {
  try {
    const response = await fetch(new URL(path, url), {
      method,
      headers: { apikey: key, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const ok = allowed.includes(response.status);
    console.log(
      (ok ? "PASS" : "FAIL") + ": " + label + " (HTTP " + response.status + ")",
    );
    if (!ok) failures++;
  } catch {
    console.log("FAIL: " + label + " (connection failed)");
    failures++;
  }
}
await probe("Auth is reachable", "/auth/v1/settings");
await probe(
  "Approved event directory is publicly readable",
  "/rest/v1/event_list?select=id&limit=1",
);
await probe(
  "Private profiles deny anonymous reads",
  "/rest/v1/profiles?select=id&limit=1",
  { allowed: [401, 403] },
);
for (const table of [
  "user_roles",
  "registrations",
  "saved_events",
  "attendance",
  "point_transactions",
  "organizer_requests",
  "reports",
  "moderation_actions",
])
  await probe(
    table + " denies anonymous reads",
    "/rest/v1/" + table + "?select=*&limit=0",
    { allowed: [401, 403] },
  );
await probe(
  "Public leaderboard is readable",
  "/rest/v1/rpc/community_leaderboard",
  { method: "POST", body: { p_period: "all" } },
);
const id = "00000000-0000-4000-8000-000000000000";
for (const [name, args] of [
  ["register_for_event", { p_event_id: id }],
  ["cancel_registration", { p_event_id: id }],
  [
    "verify_attendance",
    { p_event_id: id, p_user_id: id, p_volunteer_minutes: 0 },
  ],
  [
    "review_event",
    { p_event_id: id, p_approve: true, p_reason: "Access test" },
  ],
  ["review_organizer", { p_user_id: id, p_approve: true }],
  ["admin_organizer_requests", {}],
  ["my_stats", {}],
])
  await probe(name + " denies anonymous execution", "/rest/v1/rpc/" + name, {
    method: "POST",
    body: args,
    allowed: [401, 403],
  });
await probe('Leaderboard photo lookup is available','/rest/v1/rpc/leaderboard_photos',{method:'POST',body:{p_user_ids:[]}});
await probe('Anonymous photo changes are denied','/rest/v1/rpc/set_profile_avatar',{method:'POST',body:{p_path:null},allowed:[401,403]});
await probe('Anonymous Google profile sync is denied','/rest/v1/rpc/sync_google_profile',{method:'POST',body:{},allowed:[401,403]});
console.log(
  "Hosted probes complete. No credentials or response bodies printed.",
);
process.exitCode = failures ? 1 : 0;

// Optional: verify the public capacity response for a caller-selected test event.
const eventId = process.argv[2];
if (eventId) {
  if (!/^[0-9a-f-]{36}$/i.test(eventId))
    throw new Error("Supply a UUID for the test event.");
  const response = await fetch(
    new URL("/rest/v1/rpc/event_availability", url),
    {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_event_id: eventId }),
      signal: AbortSignal.timeout(15000),
    },
  );
  const spots = await response.json();
  console.log(
    response.ok
      ? "PASS: Test event remaining capacity = " + spots
      : "FAIL: Test event capacity lookup",
  );
  if (!response.ok) process.exitCode = 1;
}
