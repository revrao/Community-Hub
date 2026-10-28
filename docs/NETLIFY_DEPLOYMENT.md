# Netlify pilot deployment preparation

Prepared for deployment; **no site was deployed and no Supabase, Google, or Mapbox dashboard setting was changed**. Importing a Git repository into Netlify can immediately trigger a first deployment. Do the deployment steps below only after the owner approves. If the repository is already linked to a Netlify site, pause automatic publishing before pushing preparation changes when deployment is not authorized.

## Build settings

- Repository: existing Community-Hub repository; production branch `main`.
- Base directory: repository root (leave blank).
- Package directory: default/root (no monorepo override).
- Build command: `npm run build`.
- Publish directory: `.next`.
- Node.js: **24.x**, declared by `.nvmrc` and package engines. Local verification used Node 24.18.0.
- Package manager: npm, using committed `package-lock.json`; do not omit optional dependencies or development dependencies at build time. Netlify performs dependency installation; a clean local install uses `npm ci`.
- Use Netlify's automatically detected, current OpenNext adapter. Do not install/pin the legacy Next.js plugin, set a custom functions directory, add an SPA fallback rewrite, or export the app as static HTML.
- No `npm start` command is needed on Netlify. Netlify serves SSR and route handlers through its adapter.

`netlify.toml` records the build command and publish directory. `.netlify/` local link/build output is ignored. Nothing in this file contains application credentials.

Sources: [Next.js support and adapter](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), [build settings](https://docs.netlify.com/snippets/frameworks/nextjs-config-values/), [Node selection](https://docs.netlify.com/build/configure-builds/manage-dependencies/).

## Environment variable names

Set the following for the **Production** deploy context in Netlify's environment-variable UI. Never paste values into Git, this document, or chat.

- `NEXT_PUBLIC_SUPABASE_URL` — existing hosted Supabase URL; Builds and Functions scopes.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — existing public publishable key; Builds and Functions scopes.
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` — existing public Mapbox token; Builds scope (Functions is also safe). The existing alias `NEXT_PUBLIC_MAPBOX_TOKEN` is supported, but choose one name consistently.
- `APP_ORIGIN` — final canonical HTTPS origin, for example `https://YOUR_SITE.netlify.app`, with no trailing slash, path, query, or fragment; Functions scope (Builds and Functions is also safe).

The three `NEXT_PUBLIC_*` values are intentionally public in browser bundles. Changes require a new build. Server-side Supabase authentication still needs its public URL/key at runtime. `APP_ORIGIN` stabilizes callback URLs, secure OAuth return cookies and same-origin POST/DELETE checks when Netlify forwards a request through an internal HTTP host. It is server-only, not a secret. Leave it empty for local development.

Node selection normally also selects the Functions runtime. If explicitly overriding it in Netlify, use `AWS_LAMBDA_JS_RUNTIME=nodejs24.x` through the dashboard, not `netlify.toml`. No override is otherwise required. Remove any old `NODE_VERSION` setting that conflicts with `.nvmrc`, or set it to `24`.

Do **not** add a Supabase service-role key, database password/connection string, Google client secret, or Netlify access token to the application environment. No migration is run by the build. All five migrations are already applied.

Deploy previews on other origins intentionally fail the production origin check for Google-start/photo mutations. For the pilot, test authentication only on the canonical production origin; keep preview auto-publishing/auth testing disabled. A separate preview setup would need a context-specific origin and explicitly approved provider allowlists.

## Compatibility decisions

- Next.js SSR, route handlers, redirects, Supabase cookie sessions and the auth proxy remain enabled. The proxy imports no filesystem/native addon. Sharp is imported only by the Node.js profile-image route, not the proxy; no edge Sharp execution is required. Netlify's adapter builds on Linux and installs/bundles the matching native dependencies. This still needs an actual Netlify build/deployed upload smoke test before claiming platform verification.
- Photo selection still accepts JPG/PNG/WebP up to 5 MiB. Netlify's binary request overhead makes a raw 5 MiB multipart upload unsafe. Files above 4 MiB are resized in the browser to at most 1024 pixels and re-encoded as WebP under 4 MiB before transmission. Smaller inputs go through unchanged. The server independently validates/redecodes, strips metadata, and produces the final 512-pixel WebP as before. If browser preparation fails, the user gets an actionable error; no upload or profile change is attempted. Browser canvas WebP support is required for inputs above 4 MiB.
- The app never writes persistent images to a Netlify filesystem: images and profile pointers stay in Supabase Storage/Postgres with existing policies. Signed URLs and Google fallback remain unchanged.
- Mapbox rendering remains client-side for Map Loads only. All geocoding, autocomplete, Search Box and Autofill requests have been removed. Event addresses are typed manually and pins are placed by map click. No new map service or database schema is required.
- Application links use relative URLs; email signup uses the browser's current origin, and auth callbacks use `APP_ORIGIN` in production. No application callback is hardcoded to localhost. Local hostnames remain only in development scripts, fixtures, and local setup documentation.

Netlify references: [Functions runtime and binary payload limits](https://docs.netlify.com/build/functions/configuration/), [environment scopes](https://docs.netlify.com/build/environment-variables/overview/).

## Manual settings — perform only with owner approval

Choose the canonical Netlify/custom hostname first and use it consistently below. Do not authorize broad wildcard production callbacks.

1. **Netlify:** configure the build settings and environment variables above before approving the first build/deployment. Keep automatic deploys paused if you link the repo earlier. No CLI login/deploy was performed during preparation.
2. **Supabase → Authentication → URL Configuration:** set Site URL to `https://YOUR_SITE.netlify.app`; add the exact Redirect URL `https://YOUR_SITE.netlify.app/auth/callback`. Retain local callbacks only if local testing is still needed. The optional token-hash email template uses Site URL plus `/auth/confirm`; the existing email-code signup flow uses `/auth/callback`.
3. **Google Cloud OAuth web client:** add the canonical HTTPS origin to Authorized JavaScript origins. Google's Authorized redirect URI remains the **Supabase** callback shown in the Supabase Google-provider dashboard (`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`), not the Netlify URL. Keep the client ID/secret only in Supabase. Confirm the Google audience/test-user list permits the intended pilot users; publish/verification requirements depend on the configured audience and scopes.
4. **Mapbox token restrictions:** allow the exact production origin/site URL as appropriate in Mapbox's URL restriction UI, including your custom domain if used. Permanent Geocoding access is no longer needed by the application. Do not replace a public token with a secret token.
5. **Supabase email delivery:** confirm pilot recipients can receive confirmation emails with the existing provider/SMTP setup and rate limits. No SMTP configuration was changed.
6. After approval, deploy and smoke-test: signup/email confirmation, password login/logout, Google callback/session persistence, photo upload/replacement/removal (including a 4–5 MiB image), private-route protection, Mapbox tiles/manual location pins, event create/approval/discovery, RSVP/cancel/re-register, and the two-account attendance/leaderboard workflow on HTTPS. Check Netlify function logs for failures without copying session tokens or OAuth query parameters into reports.

Provider instructions: [Supabase redirects](https://supabase.com/docs/guides/auth/redirect-urls), [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

## Verification status

The owner reports the hosted two-account attendance verification test completed successfully. This is owner-confirmed local/hosted-backend acceptance, not a Netlify deployment test. Production HTTPS redirects, Netlify adapter packaging, native Sharp execution, and large upload transport can only be fully confirmed after the first approved deployment.

Readiness checks passed: `npm test` (database/RLS suite plus 22 logic/image tests), `npm run build`, and `npm run typecheck`. A local production server using a canonical HTTPS test origin redirected `/auth/confirm` to that origin and rejected a foreign-origin photo mutation with HTTP 403. Source scan found no hardcoded localhost application URLs; credential scan found no local configuration values or private-key/token patterns in tracked/new files. No Netlify adapter build or deployment was performed.
