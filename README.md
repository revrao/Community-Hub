# CommunityHub

Responsive Next.js frontend based on the desktop and mobile HTML prototypes. This is a local sample-data milestone, not a connected pilot.

## Run

Use Node.js 20.9+ (Node 24 used during development).

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. Use `npm run build` for a production compilation and `npm run typecheck` for TypeScript verification.

Explore search and filters update both map pins and opportunity cards. Open a pin or card for details; try sample RSVP/cancel or save, then review Profile. Profile edits and activity are held in memory across navigation and reset on refresh. Rankings and past participation are illustrative. The map is an illustrative SVG in the prototype’s visual style; live Mapbox is not connected.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for architecture, database/security proposal, planned phases, and credentials needed next. `.env.example` contains placeholders only. No Supabase or Mapbox credentials are needed for this first milestone.

Do not deploy or push without the owner's approval.
