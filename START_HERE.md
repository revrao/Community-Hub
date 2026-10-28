# CommunityHub: getting started with Codex

1. Create/clone your GitHub repository locally.
2. Place `AGENTS.md` and `PROJECT_BRIEF.md` in the repository root.
3. Make a `design-reference` directory. Copy both previous desktop and mobile HTML prototype files into that directory.
4. Open the local repository folder in Codex in the ChatGPT desktop app and select Local mode.
5. Paste the initial prompt below. Do not enable uncontrolled cloud deployment or share secrets.
6. Have Codex summarize a plan, inspect references and create the Next.js foundation first. Review the first local running page before adding Supabase.
7. Create a Supabase project yourself. Put public URL and anon/publishable key in `.env.local`; never commit them. Store any private keys server-side only.
8. Implement event discovery and registration end-to-end before polishing secondary screens. Use realistic seeded events clearly labeled as examples in development.
9. Review diff, run checks, commit to Git and push. Deploy a small private pilot after testing security and roles.

## First prompt for Codex

You are building CommunityHub, a responsive local volunteering/community events web app. Read AGENTS.md and PROJECT_BRIEF.md and inspect the two interactive reference prototypes in design-reference/. Treat the prototypes as the visual and flow specification, not production-ready code. I want you to do **milestone 1 only**: audit the current repository, propose a concise architecture and route map, create the Next.js + TypeScript + Tailwind project foundation if needed, and implement a clean shared responsive shell with Explore, Leaderboard and Profile navigation that closely matches the prototypes. Include a placeholder map component with clearly labeled mock pins, sample event cards, and working client-side navigation; do not pretend data is saved yet. Do not build everything at once. Run build/lint checks, document what you changed, and tell me the exact next actions needed for Supabase and Mapbox. Ask before destructive changes or deploying anything. Keep it straightforward, high quality, and easy to maintain.
