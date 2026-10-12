# Solarpunk Taskforce — Agent Rules

Read this before changing anything. It applies to every agent (Claude, Codex, Copilot) and to humans.

## The project in one paragraph

Production site: **solarpunktaskforce.org**. Next.js 15 (App Router) on Vercel, Supabase (Postgres + RLS +
Auth + Storage) in the EU, pnpm, Tailwind 4. The owner is not a developer: explain outcomes in plain
language, keep PR descriptions concrete, and never leave production broken. Product context:
`docs/blueprint.md`, roadmap: `docs/ROADMAP.md`, design rules: `docs/DESIGN.md`.

## How changes ship

1. Branch from `main`, open a PR. **Merging to `main` deploys immediately**:
   - Vercel builds and deploys the app.
   - `supabase-db-auto` applies new migrations to the **production database** and commits regenerated
     `src/lib/database.types.ts` (never edit that file by hand).
2. CI (`.github/workflows/ci.yml`) must be green: `check-migrations`, `typecheck`, `lint`, `build`.
3. Run locally before pushing:
   ```bash
   pnpm install --frozen-lockfile
   pnpm typecheck && pnpm lint && pnpm build   # build needs NEXT_PUBLIC_SUPABASE_URL/ANON_KEY (dummy values are fine)
   pnpm check:migrations                        # if a migration changed
   pnpm db:test                                 # if a migration or RLS changed (needs local Postgres binaries)
   ```
4. Vercel occasionally marks a build "failed" when two builds overlap. Re-check before assuming the code is
   broken; the next deploy usually goes through.

## Database rules (non-negotiable)

- The repo is the source of truth. **Never** change the production schema in the Supabase UI or with
  `supabase db push` by hand: write a migration and merge it.
- Create migrations only with `pnpm sb:migration "short_name"` (strictly increasing timestamps). Never
  rename or edit a migration that is on `main`; fix forward with a new one. (`20250919085607_baseline.sql`
  was filled once, with the owner's approval; leave it alone.)
- Migrations must be idempotent where reasonable (`if not exists`, `drop policy if exists` + `create`) and
  wrapped in `begin; … commit;`.
- Two open PRs must not add migrations with the same timestamp; rebase and renumber before merging.
- Keep one topic per migration/PR. Do not bundle schema or RLS changes with unrelated UI work.

### RLS checklist (learned the hard way, see docs/schema-drift.md)

- Every table has RLS enabled and explicit policies for `anon`, `authenticated`, and admins. No `USING (true)`
  without a written reason.
- **A policy must never call a SECURITY INVOKER function that reads the same table.** That recurses until
  Postgres gives up ("stack depth limit exceeded"). Helpers used in policies are `SECURITY DEFINER`,
  `set search_path = ''`, fully schema-qualified, with `EXECUTE` granted to `anon, authenticated`.
- Avoid scalar sub-selects like `(select fn())` in `projects` policies. Combined with subqueries in its
  UPDATE policy, they trigger "infinite recursion detected in policy".
- `INSERT … RETURNING` (and `create_project_submission()`) needs the new row to pass the SELECT policy, and
  STABLE helper functions can't see it. Keep inline owner checks (`owner_id = auth.uid()`,
  `created_by = auth.uid()`) in SELECT policies.
- **Test writes as well as reads.** `pnpm db:test` builds a throwaway DB from all migrations, sweeps every
  table with SELECT/UPDATE/DELETE as anon and as a signed-in user, and runs the self-contained scripts in
  `supabase/tests/` (mark new ones with `-- runnable: pnpm db:test`). Add a test script for every RLS change,
  with `-- expect:` comments.
- Permissions come from `user_roles` (`is_admin()`, `is_superadmin()`, `is_moderator()`, `is_admin(uuid)`).
  `profiles.role` / `profiles.is_admin` are legacy; only superadmins can change them (trigger).
- `profiles` uses **column-level SELECT grants**: `date_of_birth` is not readable through the API. A new
  `profiles` column must be added to the grant in a migration, or the app can't read it. Don't use
  `select("*")` or `upsert` on `profiles` from the app.
- Server-only data goes through API routes / server actions. The service role key is only used server-side
  (edge functions, API routes that need it), never in client code.

### Ownership model

Projects, funding, watchdog issues and posts are owned by a user **or** an organisation:
`owner_type in ('user','organisation')` + `owner_id`. Organisation actions require a **verified**
organisation and the matching member permission (`can_create_projects`, `can_post_feed`,
`can_manage_members`, …). Never reintroduce single-FK ownership (`created_by` alone) as an authorization rule.

## App conventions

- Server components and `getServerSupabase()` (`src/lib/supabaseServer.ts`) by default; client components
  only for interactivity. Validate API input with zod.
- RLS is the gate, not the UI: hide buttons for UX, but never rely on hiding for security.
- Lists only show `status = 'approved'` and `visibility = 'public'` items; unlisted items open by link only.
- UI follows `docs/DESIGN.md`: use the shared components in `src/components/ui/` and the design tokens in
  `src/app/globals.css`. No ad-hoc colours, shadows or font sizes.
- Accessibility: semantic HTML, labels on every input, visible focus, 44px touch targets, works at 390px width.
- New third-party data processors (email, analytics, AI) need the owner's OK. Prefer EU providers, and keep
  `.env.example` in sync. Never commit secrets.

## PR description (required)

- **What changed**, in user terms
- **Tables / RLS policies / functions changed** (or "none")
- **How to test**: step by step, including what to check on the site after deploy
- Checks run (typecheck, lint, build, check:migrations, db:test)

## When unsure

Stop and ask the owner. Do not guess about migrations, RLS, ownership, payments or anything that deletes
data.
