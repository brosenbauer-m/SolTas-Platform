# Solarpunk Taskforce — Claude guide

@AGENT_RULES.md

## Code map

- `src/app/` routes (App Router): `page.tsx` home (globe + stats), `about`, `services`, `projects` (find,
  `[slug]` profile, `[slug]/edit`, `new`), `find-organisations` + `organisations/[id]` (profile, `edit`,
  `members`, `create`), `funding`, `issues` (formerly Watchdog: `new`, `[id]`; code and tables still say watchdog), `feed`, `people/[id]`, `notifications`,
  `settings`, `me/organisations`, `admin/*` (moderation), `login` / `signup` / `forgot-password` / `reset-password` / `auth/callback` (email links) / `onboarding`
- `src/app/api/` route handlers (projects incl. `projects/points` + `projects/summary` for the maps, updates, feed-posts, comments, follow, grants, watchdog,
  home-stats, home-markers, admin/*)
- `src/components/` UI: `ui/` (shared primitives), `Header.tsx` + `UserMenu.tsx` (nav), `home/`, `map/` (clustered
  project layer + popups, used by Find Projects and the home globe), `projects/`,
  `organisations/`, `grants/`, `watchdog/`, `feed/`, `social/` (likes, comments), `updates/`
- `src/lib/` data access: `supabaseServer.ts` (server client), `supabaseClient.ts` (browser client),
  `projects/`, `organisations/`, `grants/`, `watchdog/` query helpers, `email/`
- `supabase/migrations/` schema (forward-only), `supabase/tests/` RLS test scripts,
  `supabase/functions/` edge functions (`create-organisation` uses the service role)
- `scripts/db-test/` local throwaway DB + RLS sweep (`pnpm db:test`), `scripts/schema-export.sql` prod drift check
- `scripts/iati/` nightly IATI import into `projects` (`source = 'iati'`, owned by the IATI system org), `.github/workflows/iati-sync.yml`
- Docs: `docs/blueprint.md` (product), `docs/ROADMAP.md` (plan), `docs/DESIGN.md` (UI rules),
  `docs/schema-drift.md` (DB history and open proposals), `docs/architecture/` (integration plans, e.g. IATI)
