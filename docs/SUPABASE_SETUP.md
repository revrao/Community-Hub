# Hosted Supabase setup

The application uses only the project's public URL and publishable key. No service-role or database password is used by the app. Existing `.env.local` values remain private; both NEXT_PUBLIC_MAPBOX_TOKEN and NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN are supported. NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required.

## Apply migrations

The project owner chose to apply SQL manually in the Supabase SQL Editor. Read and execute each complete file once, in order:

1. `supabase/migrations/202610280001_profiles.sql` — profiles, protected roles, signup trigger; already applied by the owner.
2. `supabase/migrations/202610280002_events.sql` — events and approved public discovery.
3. `supabase/migrations/202610280003_registration_organizers.sql` — saved events, atomic RSVP/cancel, organizer functions.
4. `supabase/migrations/202610280004_attendance_admin.sql` — verified attendance, points, organizer requests, moderation and leaderboard.

Each migration is transactional and intentionally fails on preexisting object-name collisions. They do not drop/reset existing tables. Do not re-run a successful file or bypass a failure by deleting objects. If a collision occurs, report its object name so a forward migration can be prepared. Do not reset the hosted database.

For teammates using Supabase CLI on a new project: `supabase link --project-ref YOUR_PROJECT_REF`, then review `supabase db push --dry-run` before `supabase db push`. These commands require the owner's project access and database password through the CLI's secure prompts. On the manually migrated project, first use `supabase migration repair --status applied 202610280001 202610280002 202610280003 202610280004` to reconcile migration history; only mark versions actually applied successfully. Never use `db reset` against hosted data.

## Auth dashboard

Under Authentication → URL Configuration, set Site URL to the local origin you use (normally `http://127.0.0.1:3000`) and allow `http://127.0.0.1:3000/auth/callback` and `http://localhost:3000/auth/callback`. Use the same browser and local hostname when opening email confirmation links, since signup uses PKCE. If you confirm elsewhere, return to the app and log in with your password after confirming.

Email confirmation stays enabled. Sign up from `/signup` and confirm the email sent by Supabase. The app handles confirmation codes at `/auth/callback`. If using Supabase's token-hash email template instead, set its link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` (this optional endpoint verifies email confirmation tokens). Email delivery/SMTP and Supabase rate limits remain managed by the project owner. No OAuth or SMTP secret is needed by this app.

## First administrator

A browser user can never grant themselves an organizer/admin role. After creating and confirming your account, review `supabase/admin/bootstrap_admin.sql`, replace its email placeholder locally in SQL Editor, and run it once. This explicitly grants that confirmed account admin permissions. It is kept outside migrations so teammates never inherit a hardcoded admin identity. Log out/in or refresh Profile afterward. Administration is linked from Profile → Settings.

Other members request organizer access in Profile → Settings. Admins approve these requests in `/admin`; organizers use `/organizer` to create events, submit them for approval, view participants and verify attendance. Admins also have organizer access. An edit to a public event makes it pending again; registrations are retained. Cancelled/pending events disappear from public discovery while registered members retain history access.

## Real events and map

No fictional events are inserted into the hosted database. Create a real future opportunity with its public venue address, map coordinates, timezone and capacity, then approve it through Administration. Date/time input uses the organizer's device timezone; stored instants are UTC and event display uses the stored IANA zone. Map discovery supports search, category/date filters, approximate distances from device location or a chosen map center. A device position stays in browser memory and is not written to Supabase. Set Mapbox allowed origins to include your local origin. Attributions and built-in map controls remain visible.

## Participation rules

Organizers can verify registered participants only after an approved event ends. They cannot verify themselves. Volunteer minutes cannot exceed the event duration; community events record zero volunteer minutes. Verified volunteering earns 50 points per event; community-event participation earns 10. A unique attendance record and a unique attendance-backed points record make repeated verification idempotent. Participants have no direct write access to attendance/points. The monthly leaderboard uses UTC calendar months and respects profile visibility preferences.

## Local checks

- `npm run check:services`: validates configuration and performs read-only service probes; prints status codes and booleans, never credentials. HTTP 401 for anonymous profile reads is expected because profiles are private. HTTP 200 for events indicates the public table exists; an empty result before approval is normal.
- `npm run test:database`: applies all migrations to an isolated in-memory PostgreSQL engine, simulates Supabase auth identities, and exercises allow/deny policies and RPC workflows. This never writes to the hosted database.
- `npm test`: runs database and application logic tests.
- `npm run build` and `npm run typecheck`.

Use `npm ci` to install the committed dependency lock and `npm run dev` to start the local app. GitHub pushes and website deployments require the owner’s approval.
