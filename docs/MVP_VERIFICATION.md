# CommunityHub MVP verification

## Implemented phases

1. Supabase email/password authentication, email confirmation, cookie sessions, persistent profiles/interests and protected roles. The owner created, confirmed and signed into their account; browser checks confirmed session persistence through full reloads. Profile bio and interests were changed, saved, reloaded and restored to their original values. Local-scope logout was verified; after logout, the admin route returned to login.
2. Database-backed discovery and event details, real Mapbox tiles/controls, stored venue coordinates, category/date/search filtering, map previews, mobile list mode and distance filtering from a selected map center. Map and list share the same filtered collection. Both volunteering and community-event listings were tested.
3. Atomic RSVP/cancel, saved opportunities, upcoming/past profile activity, organizer creation/editing/cancellation and participant lists. Hosted tests confirmed persistence through reload, cancellation releasing a spot, and an event with capacity one returning zero available places after registration. Editing a published event returns it to approval without losing registrations.
4. Post-event attendance verification, fixed server-derived points, leaderboard, organizer-request approval, event approval and report moderation. Hosted tests confirmed approval/reapproval, cancelled-event visibility, reporting/removal, and moderation history. Organizer self-verification was disabled even after the event ended. Real rankings stayed empty and profile points stayed zero for unverified registrations.
5. Reproducible local SQL security/lifecycle tests, application-logic tests, hosted anonymous-access probes, production builds, TypeScript checks and browser checks. Tests found and fixed an anonymous-test identity reset, accessible Mapbox marker roles, temporary activity empty states, coordinate-field editing, local-scope logout, unsafe auth return-path control characters and cancellation controls for already-cancelled events.

## Automated coverage

`npm test` creates an isolated embedded PostgreSQL database, applies the real migration files, simulates Supabase auth identities, and checks:

- Signup profile creation and persistence; private profile reads and owner-only edits.
- Protected IDs/timestamps and roles; signup metadata cannot grant admin access.
- RLS enabled on every application table.
- Pending/approved/cancelled event visibility and safe public directory access.
- Authenticated-only, capacity-checked registration, duplicate idempotency and cancellation.
- Organizer-only event creation, event ownership and attendee privacy.
- No points for RSVP, no participant writes to attendance/points, and no self-verification.
- Verification only after the event ends, only for registered participants, with duration-bounded volunteer minutes.
- Exactly-once attendance and point transactions when verification is repeated.
- Leaderboard totals and privacy opt-out.
- Organizer approval restricted to admins; event review and report moderation permissions; private audit history.

Application tests cover stored-timezone formatting, coordinate distance calculations, shared discovery filtering, hidden/completed listing exclusions and safe local auth return paths.

`npm run test:hosted` checks the real Supabase project with its publishable key: approved discovery and leaderboard reads succeed; anonymous reads of private tables and execution of privileged functions fail. It creates no data. The optional test-event UUID argument queries remaining capacity without a private session.

## Browser coverage and test records

The user authorized their authenticated in-app browser session for testing. Two clearly labeled TEST ONLY events were created: one short volunteering event and one future community event. Approval, edits, registrations, saved state, cancellation, map/filter behavior, profile persistence, participant views and moderation were exercised through the actual UI. The volunteering event ended naturally; no clock or database timing rules were bypassed.

Both events were cancelled after testing (one through organizer cancellation and one through report moderation). A historical, unverified test registration, cancelled registration and test audit records remain deliberately traceable. No real user records were deleted, no points were fabricated, and the owner's original profile bio/interests were restored. The saved test bookmark was removed.

Desktop (1440×1000) and mobile (390×844) layouts were inspected; test screenshots were kept outside the repository under `/tmp/communityhub-qa/`.

## Verification limits and next checks

The hosted browser session contains one confirmed administrator. A positive organizer-to-another-person attendance award, cross-account organizer approval, and normal-member authorization were exercised in local PostgreSQL role tests rather than two separate hosted browser accounts. Before a public pilot, replay the positive hosted journey with a second confirmed participant: register that participant for a short approved event, wait for its end, verify from the organizer account, then verify again and confirm the points and hours were awarded exactly once. Do not disable email confirmation or self-verification to shortcut this check.

The embedded SQL harness simulates Supabase identities; it is not a replacement for hosted JWT/session-expiry tests or concurrent multi-connection load testing. Live anonymous privileges were checked separately. Map-center discovery was tested; requesting the user's precise device location was intentionally left as an opt-in user action. Email delivery/SMTP, origin allowlists and public-pilot operational settings remain in the owner's Supabase/Mapbox dashboards.

No migrations beyond the four applied files are currently required. Testing did not deploy the website, reset the database, or delete real data. Publishing code is separate from database changes and website deployment.

## Updated attendance acceptance

The owner has reported successful completion of the two-account attendance verification test. This supersedes the outstanding two-account attendance step above. Recheck the journey on the deployed HTTPS site during pilot smoke testing. Other verification limitations are not automatically resolved by this report.
