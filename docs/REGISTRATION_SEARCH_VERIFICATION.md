# Registration actions and site-wide search

## Behavior

Event Details now retains the registration status returned by Supabase, including `cancelled`. Before registration it offers Sign Up and Save; after registration it offers Cancel Registration and Save/Saved. A successful cancellation immediately removes those controls, announces cancellation, and offers Register Again only while the approved event is still open and has capacity. The same cancelled state is restored after refresh. Cancellation never deletes saved-event records. Re-registering restores the existing saved state. Saved events can also be removed explicitly in Profile.

Pending, rejected, organizer-cancelled, started, and ended events have no registration/cancellation actions. Full events cannot be registered for. Cancelled and ended events also omit the save action from the detail action area; existing bookmarks remain manageable in Profile. The existing backend capacity, time and authorization rules remain authoritative. Status-load failures offer a retry rather than showing potentially stale actions, and navigating to another event resets detail state.

Header search uses a debounced, abortable request to `/api/events/search`. That route reuses `getEvents` and `filterEvents`, the same directory/filter logic used by Explore. Searches include title, description, category labels, organizer display name, venue and address. Suggestions show at most six matching approved, unexpired events. No private/pending/cancelled event records are returned. Loading, empty and failure feedback are explicit.

Typing opens the accessible combobox/listbox; arrow keys select a suggestion, Enter opens a highlighted suggestion, Escape closes it, and pointer selection opens Event Details. Enter without a highlighted suggestion and View all search results navigate to `/?q=...`. Explore preloads that query and uses one filtered collection for both its map and list. Editing the Explore query updates the URL without requiring a reload; refresh restores it. The same header search is available on narrow and desktop layouts.

## Verification

Using one newly created, clearly labelled TEST ONLY event against hosted Supabase:

- Saved the event, registered, cancelled, and observed only Register Again with cancellation confirmation.
- Reloaded the page and confirmed Register Again persisted with no Cancel Registration or Save control.
- Registered again and confirmed Saved returned, proving cancellation preserved the bookmark; explicitly unsaved and cancelled the test registration again.
- Searched by description, organizer and category; suggestions returned the real test event.
- Tested keyboard and pointer suggestion navigation, Escape dismissal, Enter-to-Explore, matching map marker/list, URL persistence through refresh, and empty suggestion/result messages.
- Checked narrow-preview workflows and desktop dropdown/layout after widening the preview.
- Organizer-cancelled the temporary event, confirmed its detail page had no registration/save controls, and confirmed it disappeared from search.

Test event ID: `96161545-0792-40b3-8e93-aeb02f9eddc9`. It remains cancelled for auditability; its registration is cancelled and its bookmark was explicitly removed. Existing events and other users' records were not changed. No attendance or points were awarded.

`npm run build`, `npm run typecheck`, and `npm test` passed. The full isolated database/RLS suite passed along with 20 logic/image tests. New tests cover registration action states, closed/full/cancelled/ended behavior, and all requested search fields. Ended-event timing conditions are covered by automated tests rather than changing hosted event dates to bypass timing rules. Physical-device and screen-reader testing remain useful follow-ups.

No database migration, new dependency, GitHub push, or deployment was needed/performed.
