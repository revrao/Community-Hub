# Organizer address search

The organizer create/edit form uses Mapbox Geocoding v6 forward autocomplete and reverse geocoding. It reuses the existing public Mapbox token, adds no dependency and requires no database migration. Address and coordinate columns and the save_event approval workflow are unchanged.

All geocoding requests use `permanent=true` because selected addresses/coordinates are stored in Supabase. Mapbox documents that permanent geocoding requires a valid credit card on the account or an enterprise agreement: https://docs.mapbox.com/api/search/geocoding/#storing-geocoding-results. The configured token returned HTTP 200 for both permanent forward and reverse requests during testing. No additional token or service setup was required for those requests. Keep the website origin allowed on restricted tokens. Geocoding requests can incur Mapbox usage charges; requests start after three characters and 350 ms of idle typing, and obsolete requests are aborted. No queries/results are saved to local storage or application logs.

Selecting a suggestion sets its complete formatted address and coordinates, centers the existing map, and places a marker. Clicking the map retains the exact clicked coordinates and reverse-geocodes the nearest street address, described as such in the UI. If no street address is found or lookup fails, selection stays unconfirmed and submission is blocked. Users can search or click again. Arbitrary text edits invalidate the previous selection, while leaving the previous marker visible for orientation. Existing events preload their stored address and coordinates without geocoding or rewriting them.

Accessibility includes a labelled combobox/listbox, active option, arrow-key navigation, Enter selection, Escape dismissal, outside-focus dismissal, touch/click selection, and live search/result status. Addresses require a selection before the form submits. This is form validation, not an assertion of postal deliverability; authorized organizers still review their public venue, and admin approval remains necessary for discovery.

## Verification

- Real Mapbox forward suggestions, keyboard selection, pointer selection, and empty-result feedback passed in the authenticated organizer UI.
- Existing test-event address/marker preloaded correctly; unselected typed text was rejected on submission.
- A map click triggered reverse geocoding; the updated address and coordinates were visible in the admin queue and persisted in hosted Supabase.
- Created one clearly labelled TEST ONLY event, edited its location, approved it, and verified its Explore marker/preview. Replacing the address returned the event to pending; reapproval and public discovery still worked.
- Confirmed exact saved autocomplete coordinates using a read-only Supabase query: latitude 37.779029, longitude -122.418848 for San Francisco City Hall.
- The new test event was cancelled after testing (ID d293c677-0950-457c-a4df-a7afd1786989). Existing events/profiles/registrations were not edited.
- Responsive preview inspected at 617 px width; the dropdown and map fit the existing layout. Dedicated physical-device/screen-reader testing remains a useful follow-up.
- `npm run build`, `npm run typecheck`, and `npm test` passed, including 17 logic/image tests and the complete isolated database/RLS suite. New geocoding tests cover valid/invalid responses, coordinate ordering, forward/reverse permanent requests, and permission/rate-limit failures.

No GitHub push or deployment was performed.
