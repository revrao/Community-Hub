# Event locations — maps only

Address autocomplete and all forward/reverse geocoding have been removed to stop Search-service usage. This supersedes the earlier address-autocomplete implementation and its historical verification notes.

The only Mapbox feature retained is Mapbox GL JS map viewing (Map Loads for Web), including map controls, markers, and direct map clicks. No Search Box, Address Autofill, Temporary Geocoding or Permanent Geocoding service is called. No replacement search provider was added.

Organizers enter the full public venue address manually, then click the map to choose its coordinates. The map never looks up or rewrites an address. If the address changes, submission is blocked until the organizer clicks a new point or confirms the current pin. Existing event addresses and coordinates preload unchanged. No database migration or data rewrite is required. Explore, nearby-distance filtering, event registration, and event-detail maps remain available.

The service-check script no longer requests Mapbox styles; normal build, test and service-check commands do not intentionally call Mapbox. A regression test scans application/scripts for Mapbox search endpoints and permanent-geocoding flags. Existing Mapbox token variables are retained exclusively for map rendering.

## Billing and rollout

These local code changes do not change an already deployed version. Until an approved deployment replaces it, the production organizer form still contains the old billable search implementation. Avoid using that old address autocomplete or map picker. Already-open old pages must be refreshed after deployment.

The dashboard's eight historical Permanent Geocoding requests cannot be reset to zero by code changes. The goal is zero NEW geocoding/search requests from the updated application. Map Loads remain enabled at the owner's request and may incur costs beyond the account's plan allowance. Netlify/Supabase and any other account services remain subject to their own billing; no account-wide zero-cost guarantee is implied.

For an immediate account-level stop independent of deployed code or exposed tokens, the owner can contact Mapbox about disabling Permanent Geocoding, or revoke/replace affected tokens after reviewing which other applications use them. These are manual account changes and were not performed here. Do not delete existing event location records.
