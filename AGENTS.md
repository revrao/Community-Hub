# CommunityHub — Codex project instructions

Read `PROJECT_BRIEF.md` before making implementation decisions. Use the existing desktop and mobile HTML prototypes in `design-reference/` as the visual and interaction references. They are demos, not production-ready components or backend implementations.

## Working style
- Implement in small, working, testable milestones. Start with a plan and inspection of existing files, then make changes.
- Preserve the established visual direction: clean, uncrowded interface, prominent map, blue accents, green volunteering and purple community-event categories; three primary user-facing destinations: Explore, Leaderboard, Profile.
- Build one responsive website, not separate desktop and mobile applications.
- Prefer Next.js (App Router), TypeScript, Tailwind CSS, Supabase (Auth, Postgres, RLS), and Mapbox for the map.
- Use as few extra libraries as possible; explain any major dependency.
- Never hardcode credentials or commit `.env.local`, API secrets, or service-role keys. Use `.env.example` placeholders. Client-side Mapbox public tokens are allowed, but should be configuration values.
- Backend security matters: use Supabase Row Level Security; users may only edit their own profiles and registrations, organizers only their own events and authorized attendance confirmation, admins only administrative operations. Do not allow participants to modify their own points.
- Award points only for verified attendance; do not award points for an RSVP alone. Enforce uniqueness/idempotency for attendance and point transactions.
- Keep location privacy in mind, avoid collecting exact home addresses. Provide basic admin approval/reporting flows before a public launch.
- After implementing a milestone, run available checks, report what works, identify limitations, and describe what credentials or manual actions are needed.
- If a button appears in the UI, make it functional or clearly label it as not yet implemented; avoid fake success notifications.

## Scope guardrails
- MVP categories: Volunteering and Community Events only.
- In-scope: login/signup, interests/profile, map and listing discovery/filtering, event detail, RSVP/cancel, user upcoming/past events, organizer create/manage events and verify attendance, basic points/leaderboard, admin event approvals and moderation.
- Out of scope for first pilot: AI recommendations, private messaging, payments, local-service marketplace, advanced reward marketplace, elaborate badges and reviews, email campaigns.
- Work in short phases: 1. repository audit/planning and foundation; 2. database/auth; 3. discovery/map/listing creation; 4. RSVP and profile; 5. attendance/points and admin; 6. tests/deploy.
