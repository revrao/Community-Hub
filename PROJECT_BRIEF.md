# CommunityHub — Project brief and handoff

## Vision
CommunityHub helps residents discover and participate in meaningful local opportunities. It is an action-oriented platform, not a neighborhood social-media feed. The initial pilot will launch in the hometown of a teammate, where a contact has expressed interest in promoting it to residents and potential nonprofit/community partners.

## Target user and supply
- Residents seeking volunteering opportunities and community events, including less-tech-savvy visitors; modern, accessible design appealing to younger people without excluding other ages.
- Community organizations and organizers who need to publish events, receive signups and confirm participation.
- Internal admins responsible for approving organizers/events and handling reported material.

## Agreed navigation and design
- Exactly three prominent public navigation items: Explore, Leaderboard and Profile.
- Explore homepage centers an interactive map with green pins for Volunteering and purple pins for Community Events. It includes an easy search, category/date/distance filters, nearby opportunity cards and map/list layout suited to desktop or mobile.
- Event details show title, category, photo, organizer, date/time, address/map, description, capacity, and a clear Sign Up action.
- Profile merges My Activity and account settings: interests, basic bio, upcoming registrations, completed participation, saved opportunities, points and volunteer hours.
- Leaderboard shows verified participation points, rankings by period, and the logged-in user's standing. Gamification stays simple initially.
- Organizer and admin areas are supporting routes accessible to appropriate roles, not extra top-level navigation items.
- Desktop and mobile should feel like the same responsive website with shared UI components.

## Required end-to-end journeys
1. Visitor explores map/list without login and views an event.
2. Visitor clicks Sign Up; if unauthenticated, goes through login/signup and optional interest onboarding; returns to the same event and completes registration; sees confirmation.
3. Authenticated user can RSVP or cancel registration and see updates on Profile > Upcoming.
4. User edits profile, interests and bio and sees saved changes; can review upcoming/past/saved items.
5. Organizer creates a volunteering opportunity or community event; admin approval workflow controls publication; organizer monitors registrations and confirms attendance after the event.
6. Verified attendance awards points exactly once per eligible participation; leaderboard updates. Volunteer hours are tied to verified shifts.
7. Admin can approve/reject submissions and handle reports.

## Suggested data model (refine before implementation)
- profiles (id references auth.users, display_name, bio, interests, location_area, role)
- organizations (id, name, description, created_by, verification_status)
- events (id, organizer_id, organization_id nullable, title, description, category, start_time, end_time, location_name, latitude, longitude, capacity, status)
- registrations (id, event_id, user_id, status, created_at, unique(event_id,user_id))
- attendance (id, event_id, user_id, verified_by, verified_at, volunteer_minutes, unique(event_id,user_id))
- point_transactions (id, user_id, attendance_id unique, points, created_at)
- saved_events (user_id, event_id, unique(user_id,event_id))
- reports (id, reporter_id, target_type, target_id, reason, status)

## Success criteria for first working pilot
- Deployed URL usable on laptop and phone.
- Real Supabase authentication and persisted event/registration/profile data.
- Map pins are backed by real events, and event list/map agree.
- Registered user can sign up/cancel an event, with capacity and duplicate signup handled.
- Organizer can publish an event subject to approval and verify participation.
- Points/leaderboard come from server-authorized verified attendance only.
- Admin workflows and basic reporting are operational.
- Basic loading/error/empty states; usable keyboard and mobile interactions.

## Reference assets
Place these previously created files under `design-reference/` in the repository:
- `CommunityHub_Desktop_Interactive_Prototype.html`
- `CommunityHub_Mobile_Interactive_Prototype.html`
Optionally add seven original desktop PNG wireframes or the previous source ZIP for secondary visual reference.

The HTML files represent interactive prototypes with sample data, not a connected backend. Use them to extract UI structure, styling and flows. Refactor into maintainable Next.js components rather than deploying a giant embedded HTML file.
