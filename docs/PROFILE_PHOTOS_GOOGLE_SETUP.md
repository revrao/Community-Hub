# Account menu, profile pictures and Google sign-in

## Apply the new migration

Run `supabase/migrations/202610280005_profile_photos.sql` once in Supabase SQL Editor after migrations 001–004. It adds nullable photo columns, a dedicated private `avatars` Storage bucket, ownership policies, Google identity synchronization and a limited public-leaderboard photo RPC. It does not reset tables, change roles, overwrite edited names, or alter participation data. If an `avatars` bucket already exists, the transaction fails safely; do not delete an existing bucket to work around a collision—report the collision instead.

Uploads accept JPG, PNG and WebP up to 5 MiB (5,242,880 bytes). The server validates real image content, bounds dimensions, normalizes orientation, resizes to at most 512×512, outputs WebP and strips EXIF/GPS metadata. Sharp is now a direct runtime dependency for this processing; Next.js already used the library transitively. Storage therefore accepts only the normalized `image/webp` output. Original filenames and originals are not stored. Paths are `USER_UUID/RANDOM_UUID.webp`.

The private bucket uses RLS for owner-only insert/update/delete. Profiles can reference only a valid, existing image belonging to that user, through an authenticated RPC. Google photo fields are protected from direct profile edits. Other users can read only the current photo of a verified participant who opted into public rankings; private profiles are not exposed. The app issues five-minute signed URLs and renews them while in use. Previously issued links may remain valid until expiry when visibility changes. This follows Supabase’s [private-bucket model](https://supabase.com/docs/guides/storage/buckets/fundamentals) and [Storage access policies](https://supabase.com/docs/guides/storage/security/access-control).

Replacing a custom photo first saves the new object and profile pointer, then removes the previous object. Removal clears the custom pointer and falls back to the Google photo or initials. A failed cleanup is reported separately from a successful profile change. New Google users receive their provider display name once; subsequent sign-ins refresh only the Google photo, preserving edited names and custom photos. Existing Google accounts receive only the new photo field during migration backfill.

## Google Cloud and Supabase dashboard steps

1. In [Google Cloud](https://console.cloud.google.com/), select or create the CommunityHub project. Open Google Auth Platform. Configure **Branding** (app name/contact), **Audience** (External for residents; add your test Google accounts while in Testing), and **Data Access** with only `openid`, email and profile scopes.
2. Under **Clients**, create an OAuth client ID of type **Web application**. Add Authorized JavaScript origins `http://127.0.0.1:3000` and `http://localhost:3000`.
3. In Supabase → Authentication → Sign In / Providers → Google, copy the displayed Callback URL. Use that exact URL as the Google client's Authorized redirect URI. With hosted Supabase it is `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`, even when CommunityHub runs locally.
4. Copy the Google client ID and client secret directly into the Supabase Google provider settings, enable Google and save. Keep the secret out of chat, Git and `NEXT_PUBLIC_*` variables. No Google secret is needed by the website.

These steps use the supported [Supabase Google provider flow](https://supabase.com/docs/guides/auth/social-sign-in/auth-google). Google manages its consent/test-user restrictions; complete any consent or account-security prompts yourself.

## Application redirect configuration

In Supabase → Authentication → URL Configuration:

- Local Site URL: `http://127.0.0.1:3000` (use the same hostname throughout a login).
- Additional redirect URLs: `http://127.0.0.1:3000/auth/callback` and `http://localhost:3000/auth/callback`. Existing email-confirmation URLs can remain.
- Future production: set Site URL to your actual HTTPS origin, add `https://YOUR_DOMAIN/auth/callback`, add the HTTPS origin to Google Authorized JavaScript origins, and retain Supabase's callback as Google's redirect URI. Use a separate development OAuth client if you remove local origins from the production client.

There are two redirect stages: Google returns to **Supabase**; Supabase returns to **CommunityHub**. The Google start route stores a validated return path in a short-lived, HTTP-only cookie so Google OAuth uses the exact `/auth/callback` URL without a return-path query. Supabase's SSR client manages the PKCE verifier and session cookies. Email/password and existing email-confirmation routes remain supported. See [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

The login/signup pages check provider availability. Until Google is enabled, Continue with Google is visibly disabled and email/password login remains available. Reload the page after changing provider settings. Use a normal Chrome tab for Google sign-in if Google rejects an embedded browser; no account security setting needs to be weakened.

## Testing and current status

Local checks: `npm test`, `npm run typecheck`, `npm run build`. The SQL harness uses isolated Auth/Storage schemas, not hosted records. It covers owner-only Storage access, cross-user overwrite/removal denial, private-photo visibility, leaderboard consent, photo replacement/removal, Google photo refresh, preserved custom photos/names and duplicate-profile prevention. Image tests cover supported formats, real decoding, size/dimension limits, MIME spoofing, metadata removal and oversized multipart bodies. Navigation tests cover role-specific menu links and Profile URLs.

Hosted verification completed with the authorized dedicated test account:

- Google provider enabled, real Google sign-in returned to Profile, and Google images loaded in the header and Profile. Existing email/password sign-in also passed; the same profile and Google picture persisted after login and reload.
- PNG upload, JPG replacement, decoded 512-pixel image display, persistence after reload, removal, initials fallback before Google linking, and Google fallback after linking passed. Unsupported SVG and files above 5 MiB were rejected.
- A custom picture overrides the Google picture; removal restores the Google picture and persists after reload. Test images were removed after testing.
- Existing name, bio, location, interests, participation counts and ranking consent remained unchanged. The main administrator and other users were not modified.
- All five member dropdown destinations, outside dismissal, arrow-key navigation, Escape focus restoration, logout, and signed-out Profile protection passed.
- Hosted read-only probes denied anonymous access to private records and photo-changing/sync RPCs. Full cross-user Storage and Google repeat-sync assertions passed in the isolated SQL harness.

A repeated Google sign-in while a custom image remains set, desktop visual inspection, and public-leaderboard photo display with an opted-in verified participant are not yet hosted end-to-end checks. Their data/authorization behavior is covered by automated tests. Do not modify real participation records just to populate a leaderboard. OAuth consent and password entry require the account owner's action.

An origin-check bug discovered during hosted uploads was fixed: local development can use an internal Next.js hostname different from the incoming browser Host. The upload and OAuth routes now validate the incoming origin against Host, reject cross-site requests, and preserve that public origin for callbacks. This requires no additional migration.

Website deployment requires separate approval.
