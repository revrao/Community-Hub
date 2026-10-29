# Administrator management

Migration `supabase/migrations/202610280006_admin_management.sql` has been applied to hosted Supabase. Do not rerun it there. New environments should apply it once in migration order. This additive migration does not promote, demote or delete any existing account. It adds three restricted RPCs and one role-history column; it preserves existing RLS, accounts, profiles and Storage. No service-role credential is needed in Next.js.

After teammates sign up, an existing administrator opens **Admin Dashboard → Manage Admins**, searches by display name or account ID, checks the matching name/ID, selects **Make Admin**, and confirms. No private emails are needed. Duplicate display names can be distinguished by the account ID provided by the teammate.

To revoke access, select **Remove Admin** and confirm. The final administrator cannot be removed, including through direct RPC requests. Role changes are serialized by a database table lock, and authorization is rechecked after acquiring the lock. The caller's live database role is checked on every action; session metadata is never used for authorization.

The existing schema permits one role per user: admin includes organizer access. Promoting an organizer remembers their organizer role and restores it when admin access is removed. Removing a directly bootstrapped admin or a promoted ordinary member returns them to an ordinary member. Existing organizers/admins are not changed by applying the migration. Repeated grants/removals are no-ops rather than duplicate audit entries.

All actual changes record actor, target, action and timestamp in existing **Moderation History**. Only admins can search the member directory. The directory returns names, IDs and roles, never email addresses. Ordinary clients retain no INSERT/UPDATE/DELETE permission on `user_roles`, including administrators; privileged RPCs are the only app mutation path.

Badges use the trusted current `user_roles` record: own Profile, account dropdown and opted-in leaderboard participants. Public badge lookup exposes only administrator IDs for opted-in participants with participation points, never emails or private profiles. Badges are presentation only and grant no authority. Account menus refresh on window focus and auth changes; page and action checks still reject a revoked administrator even in a stale open tab.

Validation: `npm test` applies all migrations to isolated in-memory PGlite (no hosted data), exercises admin/member/anonymous authorization, promotion, revocation, organizer restoration, last-admin protection, direct-write denial and audit privacy. Existing event/attendance/photo RLS tests remain required. Run `npm run build` and `npm run typecheck` afterward.

Hosted read-only validation passed: the existing administrator can open the local dashboard and Manage Admins, the badge displays, and member search returns existing accounts by name and ID. The hosted ordinary-member role cannot read the admin directory or private audit data; signed-out dashboard requests redirect to login. Existing profile and role fingerprints match the prior inventory. Hosted role mutations were deliberately not exercised; promotion, removal, organizer restoration and last-admin safeguards passed in isolated tests. A separate ordinary-user browser login was not exercised. Do not alter production roles solely for testing.
