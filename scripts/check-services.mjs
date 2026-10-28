import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const mapToken =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
console.log(
  "Supabase URL:",
  url?.startsWith("https://") ? "configured" : "missing/invalid",
);
console.log("Supabase publishable key:", key ? "configured" : "missing");
console.log(
  "Mapbox public token:",
  mapToken?.startsWith("pk.") ? "configured" : "missing/invalid",
);
if (url && key) {
  for (const [label, path] of [
    ["Auth", "/auth/v1/settings"],
    ["Profiles", "/rest/v1/profiles?select=id&limit=0"],
    ["Events", "/rest/v1/events?select=id&limit=0"],
  ]) {
    try {
      const res = await fetch(new URL(path, url), {
        headers: { apikey: key },
        signal: AbortSignal.timeout(15000),
      });
      console.log(label + ": HTTP " + res.status);
      if (label === "Auth" && res.ok) {
        const data = await res.json();
        console.log("Email auth enabled:", Boolean(data.external?.email));
        console.log("Google auth enabled:", Boolean(data.external?.google));
        console.log("Email confirmation required:", !data.mailer_autoconfirm);
      }
    } catch {
      console.log(label + ": connection failed");
    }
  }
}
// Mapbox is intentionally not probed: only explicit map viewing should use Map Loads.
