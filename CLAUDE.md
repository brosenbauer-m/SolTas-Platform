# Solarpunk Taskforce — Claude guide

@AGENT_RULES.md

## Code map

- `src/app/` routes (App Router): `page.tsx` home (globe + stats), `about`, `services`, `projects` (find,
  `[slug]` profile, `[slug]/edit`, `new`), `find-organisations` + `organisations/[id]` (profile, `edit`,
  `members`, `create`), `funding`, `issues` (formerly Watchdog: `new`, `[id]`; code and tables still say watchdog), `feed`, `people/[id]`, `notifications`,
  `settings`, `me/organisations`, `admin/*` (moderation), `login` / `signup` / `forgot-password` / `reset-password` / `auth/callback` (email links) / `onboarding`
- `src/app/api/` route handlers (projects incl. `projects/points` + `projects/at` + `projects/summary` for the maps, updates, feed-posts, comments, follow, grants, watchdog,
  home-stats, home-markers, admin/*)
- `src/components/` UI: `ui/` (shared primitives), `Header.tsx` + `UserMenu.tsx` (nav), `home/`, `map/` (clustered
  glass-circle project layer + popups, used by Find Projects and the home globe), `find/` (split view: filters +
  results table + globe), `iati/` (`IatiTag` with its (i)), `tags/` (`ProjectTags`: shared tag list, editors remove/add, ask for new), `projects/`,
  `organisations/`, `grants/`, `watchdog/`, `feed/`, `social/` (likes, comments), `updates/`
- SEO: root `layout.tsx` metadata (title template, Open Graph), `src/lib/pageMetadata.ts` (`generateMetadata` for detail pages, public client only), `src/app/sitemap.ts` + `robots.ts`, styled `not-found.tsx` / `error.tsx`
- `src/lib/` data access: `supabaseServer.ts` (server client), `supabaseClient.ts` (browser client),
  `projects/`, `organisations/`, `grants/`, `watchdog/` query helpers, `email/`
- Rate limits: database triggers (`enforce_write_rate_limit`, migration 20260324120023) on feed posts, comments, updates and issue reports; routes answer 429 when the message starts with "Too many"
- Impact metrics: `public.project_metrics` (fixed units in `src/lib/metrics.ts`), `components/projects/ProjectImpact.tsx` (tiles + editor via RLS), summed per unit on the organisation page; goals: `src/lib/goals.ts` (SDGs, IFRC) + `ProjectGoals.tsx`, arrays kept by trigger from the join tables
- Tags: `public.tags` (shared vocabulary, only admins/server add), `project_tags`, `tag_requests` (admin queue `/admin/tag-requests`); IATI sector names → tags in `scripts/iati/sync.ts` via `src/lib/tags/iatiSectors.ts`; Find Projects filter `?tag=<slug>`
- AI (Mistral, EU): `src/lib/ai/` (`mistral.ts` client, `autoTag.ts` tags projects after create/edit via `after()`, `usage.ts` daily limit + `ai_usage` log), `/api/ai/search` (signed-in, turns a sentence into Find Projects filters), `components/ai/AiProjectSearch.tsx`; service role only via `src/lib/supabaseAdmin.ts`. Off unless `MISTRAL_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` are set
- `supabase/migrations/` schema (forward-only), `supabase/tests/` RLS test scripts,
  `supabase/functions/` edge functions (`create-organisation` uses the service role)
- `scripts/db-test/` local throwaway DB + RLS sweep (`pnpm db:test`), `scripts/schema-export.sql` prod drift check
- `scripts/iati/` nightly IATI import into `projects` (`source = 'iati'`, owned by the IATI system org), `.github/workflows/iati-sync.yml`
- Docs: `docs/blueprint.md` (product), `docs/ROADMAP.md` (plan), `docs/DESIGN.md` (UI rules),
  `docs/schema-drift.md` (DB history and open proposals), `docs/architecture/` (integration plans, e.g. IATI)
