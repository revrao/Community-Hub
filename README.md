# CommunityHub

A responsive Next.js, TypeScript and Tailwind website for local volunteering and community events. Supabase provides authentication, persistent data and database authorization; Mapbox displays real event locations. The original desktop and mobile designs are preserved in `design-reference/`.

## Run locally

Use Node.js 24 LTS (22.18+ also supports the test runner). Copy `.env.example` to `.env.local` and add your Supabase URL, publishable key and Mapbox public token. Existing `NEXT_PUBLIC_MAPBOX_TOKEN` values are also supported. Never commit `.env.local` or a service-role key.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. The three main destinations are Explore, Leaderboard and Profile. Organizer and admin tools are linked from Profile → Settings for authorized accounts.

## Database setup

Apply the versioned SQL files under `supabase/migrations/` in order. The project owner has applied the first five migrations manually in Supabase SQL Editor. Follow [hosted setup](docs/SUPABASE_SETUP.md) for teammate setup, auth redirects, initial admin assignment and CLI migration-history reconciliation. No real events or admin identities are seeded automatically.

## Checks

```sh
npm test
npm run build
npm run typecheck
npm run check:services
npm run test:hosted
```

Database tests use a disposable, embedded PostgreSQL instance and never modify hosted data. Hosted probes check public reads and anonymous access denial without creating accounts or records. Positive browser workflows require a confirmed account and an approved organizer/admin. See [MVP verification](docs/MVP_VERIFICATION.md) for tested flows and remaining limits.

## Participation and security

Event approval is required before public discovery. RSVP/cancel functions enforce capacity and uniqueness transactionally. Only authorized organizers/admins can confirm attendance after an event ends; self-verification is forbidden. Verified volunteering earns 50 points and community-event attendance earns 10. Unique attendance/point records prevent duplicate awards. RLS protects private data and role assignments; participants cannot directly edit points or attendance.

Device location is used only in browser memory for nearby discovery. Event addresses should be public venues. Monthly rankings use UTC calendar months and honor each member's visibility preference.

GitHub pushes and website deployments require the owner’s approval.

Account dropdown, private profile-photo storage, and Google OAuth setup are documented in [profile photos and Google sign-in](docs/PROFILE_PHOTOS_GOOGLE_SETUP.md). Google credentials belong only in the Supabase provider configuration.

For the initial Netlify pilot, see [deployment settings and manual setup](docs/NETLIFY_DEPLOYMENT.md). The repository is prepared for deployment; dashboard configuration and deployment require owner approval.
