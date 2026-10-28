# CommunityHub architecture and milestone plan

## Repository audit

The starting repository contains project guidance and two standalone interactive HTML prototypes. Both embed their own CSS, images, routing and simulated state. There is no production app, backend, or test infrastructure. The prototypes agree on the blue/green/purple palette and three public destinations. Desktop uses a filter/map/results layout; mobile uses a compact header, map/list switch and bottom navigation.

## Milestone 1: responsive frontend

Next.js App Router, TypeScript and Tailwind CSS 4. Semantic CSS preserves prototype geometry and visual tokens. React and Next.js are the only runtime dependencies; no icon/UI/state library is required. Prototype PNGs are extracted into public/reference; original references remain untouched. A code-native illustrative map background follows the reference palette and street layout without its baked-in decorative pins or fake zoom controls; only matching sample-event pins are interactive.

Routes implemented:

- `/`: Explore, search/category/date/distance filters, map pins and list from the same dataset.
- `/events/[id]`: event description, location, organizer, sample RSVP/cancel and save.
- `/leaderboard`: sample month/all-time rankings and participation explanation.
- `/profile`: overview, upcoming, past activity, saved, settings and preview profile editor.

Shared components: Shell/navigation, Icon, Category, EventCard, Stats, DemoProvider; feature components Explore, EventDetail, Leaderboard and Profile. Typed fixtures live in src/lib/data.ts. In-memory context survives client navigation but intentionally resets on reload. Sample RSVP never awards points. Dates and distances are explicit fixtures. The illustrative map has one pin per matching event; there are no pretend zoom controls. No real login, uploads, notifications or organizer/admin actions are presented as working.

## Future backend and routes

Use Supabase Auth, Postgres, RLS and Storage, with server-side auth checks. Supabase adapters will replace sample reads and DemoProvider mutations; do not use browser state for authorization. Mapbox GL JS will replace the illustrative map behind the same filtered event collection once a public token and pilot geography are supplied.

Supporting routes: `/login`, `/signup`, `/onboarding`, `/organizer/events`, `/organizer/events/new`, `/organizer/events/[id]`, `/admin/events`, `/admin/reports`, `/admin/organizers`. Organizer/admin routes are role-gated and stay outside primary navigation.

Proposed tables:

- profiles: id FK auth.users, display_name, bio, location_area, created_at. Public-safe profile projection for rankings; no email or precise home location.
- interests + profile_interests: normalized choices and unique profile/interest association.
- user_roles: user_id, role, assigned_by. Roles are admin-managed, never writable through profile edits.
- organizations: id, name, description, created_by, verification_status.
- organization_members: organization_id, user_id, role; explicit organizer membership.
- events: id, organizer_id, organization_id nullable, title, description, category enum (volunteering/community_event), starts_at/ends_at timestamptz, public venue/address, latitude/longitude, capacity, image_path, status (draft/pending/approved/rejected/cancelled), moderation notes/timestamps. Check end > start, capacity > 0 and coordinate bounds. Published visibility requires approval.
- registrations: id, event_id, user_id, status, created_at, cancelled_at; unique(event_id,user_id). Transactional RSVP locks event capacity and handles repeat/cancel requests idempotently.
- attendance: id, event_id, user_id, registration_id, verified_by, verified_at, volunteer_minutes; unique(event_id,user_id), nonnegative minutes. Only event owner or authorized organization member/admin can verify after event completion.
- point_transactions: id, user_id, attendance_id unique FK, points, created_at; server derives points. No participant write access. Attendance verification and point insert happen in one transaction; retries do not duplicate points.
- saved_events: user_id, event_id, created_at; composite primary key.
- reports: id, reporter_id, event_id or reported_user_id, reason, status, reviewed_by, reviewed_at. Explicit FKs and a check that exactly one target is set.
- moderation_actions: id, actor_id, target, action, reason, created_at; append-only admin audit trail.

Enable RLS on every table. Public visitors see approved listings and safe leaderboard projections. Members edit only their own permitted profile fields, saved items and registrations through capacity-checked operations. Event owners manage their own drafts/submissions and attendance; they cannot approve publication or edit awarded points. Admin-only functions handle roles, approvals and moderation. Leaderboard aggregates attendance-backed point transactions by a defined pilot timezone and period, excluding opted-out identities. Privileged functions use a fixed search_path, explicit auth/role checks and restricted execution grants; service-role keys never reach the client.

## Following milestones

2. Supabase schema, RLS policies and authenticated profile setup, with adversarial authorization tests.
3. Database discovery, Mapbox, organizer listing creation and approval workflow.
4. Transactional RSVP/cancel, profile activity and saved events.
5. Authorized attendance, idempotent points, leaderboard and moderation.
6. End-to-end, accessibility/security checks and deployment review. No push or deployment without user authorization.

## Needed before backend work

Supabase project URL and publishable key; Mapbox public token restricted to intended origins; pilot town/region and timezone. Configure credentials locally in .env.local from .env.example; do not share private/service-role keys in chat. Agree point rules and who initially holds organizer/admin roles. Set local Auth redirect URLs when auth is implemented. Schema migrations and policies will be reviewable before being applied.

## MVP implementation update

The follow-on implementation replaces the sample-data layer with Supabase Auth and persisted records, Mapbox GL JS, transactional registration/verification functions, and organizer/admin screens. The initial MVP keeps interests as a bounded profile array and assigns an approved organizer role per member; organization memberships and additional publishing teams can be added in a later forward migration when needed. See `SUPABASE_SETUP.md` for the actual four-file migration model and `MVP_VERIFICATION.md` for checks and remaining live multi-account verification. No service-role key is used by the app.
