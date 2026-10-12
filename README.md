# Solarpunk Taskforce Platform — Developer Guide

This document explains everything you need to work on the Solarpunk Taskforce Platform:  
how setup works, how Supabase integrates, and what to do for syncing, deployment, and automation.

---

## Latest Updates (Humans + Agent AIs)

- UI palette rebrand is complete — see `docs/REBRAND_COMPLETE.md` for the blue/brown theme coverage across components.
- Supabase migration/RLS guardrails for agents are in `AGENT_RULES.md`; review before touching database code or policies.
- Implementation notes and test playbooks now live under `docs/` (e.g., `docs/IMPLEMENTATION.md`, `docs/manual-tests/`); add any new Markdown docs under `docs/` — only `README.md` stays at the repo root.
- Security hardening guidance is captured in `SECURITY_HARDENING_QUICKSTART.md` and `SECURITY_HARDENING_SUMMARY.md`; follow alongside the Supabase rules above.

---

## 1. Overview

This project is a **Next.js 15 + Supabase** full-stack platform.  
It uses:

- **PNPM** for dependency management  
- **Supabase CLI** for database migrations and type generation  
- **Vercel** for deployments  
- **GitHub Actions** for Supabase automation  
- **VSCode Dev Containers / Codespaces** for consistent local environments  

All tools and credentials are automatically handled in the dev container.

---

## 2. Local Development Setup

You don’t need to install anything manually.

1. Open the repo in **GitHub Codespaces** or VSCode with **Dev Containers**.
2. Wait for the environment to build.
3. It will automatically:
   - Install PNPM, Supabase CLI, and Git LFS
   - Log in to Supabase using Codespaces secrets
   - Run the Supabase sync (`sb-sync.sh`)
   - Start the Next.js dev server on port 3000

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 3. Running the project locally

To run the project locally, you need to have Node.js and pnpm installed on your machine.

1.  Install the dependencies:
    ```bash
    pnpm install
    ```
2.  Start the development server:
    ```bash
    pnpm dev
    ```
    The app will be available at [http://localhost:3000](http://localhost:3000).

---

## 4. Linting

This project uses ESLint to enforce code quality.

-   To run the linter, use the following command:
    ```bash
    pnpm lint
    ```
-   To fix linting errors automatically, use the following command:
    ```bash
    pnpm lint:fix
    ```

---

## 5. Building for production

To build the project for production, use the following command:

```bash
pnpm build
```

This will create an optimized production build in the `.next` directory.

---

## 6. Automatic Behavior in Codespaces

When a Codespace launches:

1. PNPM (v10), Supabase CLI, and Git LFS are installed.
2. Supabase is authenticated and linked using secrets.
3. `scripts/sb-sync.sh` runs:
   - Authenticates Supabase CLI
   - Regenerates TypeScript DB types
   - Checks schema diffs (skipped if Docker unavailable)
4. The dev server auto-starts via `pnpm dev`.

---

## 7. Package Scripts

Available via `package.json`:

| Script | Description |
|--------|--------------|
| `pnpm dev` | Start Next.js locally |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Run ESLint and fix errors |
| `pnpm sb:sync` | Run Supabase sync script |
| `pnpm sb:diff` | Show schema differences |
| `pnpm sb:commit` | Commit DB changes (dry run) |
| `pnpm sb:login` | Authenticate Supabase |
| `pnpm sb:link` | Link local project to Supabase |

---

## 8. Supabase Sync (`scripts/sb-sync.sh`)

This script keeps the local project in sync with Supabase.

It performs:

1. Installs dependencies if missing  
2. Logs into Supabase (if token is present)  
3. Links to the Supabase project (if project ref is present)  
4. Regenerates TypeScript database types  
5. Runs a schema diff check (skips if Docker is unavailable)  
6. Commits updated types if changed  

Run manually anytime:
```bash
pnpm sb:sync
```

This ensures your Supabase schema and types stay synchronized.

---

## 9. GitHub Actions

### CI (`.github/workflows/ci.yml`)

Runs on every pull request to `main`. Four parallel jobs:

| Job | Command |
|-----|---------|
| `check-migrations` | `pnpm check:migrations` (migration files strictly ordered) |
| `typecheck` | `pnpm typecheck` |
| `lint` | `pnpm lint` |
| `build` | `pnpm build` (with dummy `NEXT_PUBLIC_SUPABASE_*` values) |

### Supabase DB automation (`.github/workflows/supabase-db-auto.yml`)

Runs when a push to `main` changes `supabase/**` (or this workflow file), and can be started manually from the **Actions** tab. Only one run at a time; later runs wait in a queue (`concurrency: supabase-db`).

Steps:

1. Checks that the `SUPABASE_DB_URL` and `SUPABASE_ACCESS_TOKEN` repository secrets are set.
2. Installs the Supabase CLI at the version pinned in `package.json` (`devDependencies.supabase`).
3. Applies new repo migrations to production, forward-only (never `--include-all`):
   ```bash
   supabase db push --db-url $SUPABASE_DB_URL --yes
   ```
4. Regenerates TypeScript types:
   ```bash
   supabase gen types typescript --db-url $SUPABASE_DB_URL -s public -s auth -s storage > src/lib/database.types.ts
   ```
5. If the types changed, commits them as `chore(types): regenerate DB types [skip ci]`, rebases onto the latest `main` and pushes. `[skip ci]` stops the commit from triggering the workflow again.

It never generates migrations from the database: the repo is the source of truth for the schema.

---

## 10. Deployment — Vercel

Vercel automatically deploys whenever you push to `main`.

### Build Process
- Detects PNPM and installs dependencies
- Runs `pnpm build`
- Serves with `pnpm start`

### Notes
- `sb-sync.sh` is **not** executed during Vercel builds.
- The Supabase CLI installs automatically for build-time use.
- Keep `pnpm-lock.yaml` up to date with `package.json` to avoid:
  ```
  ERR_PNPM_OUTDATED_LOCKFILE
  ```

After modifying dependencies, always run:
```bash
pnpm install
git add package.json pnpm-lock.yaml
git commit -m "update deps"
git push
```

---

## 11. Git and Git LFS

This repo uses **Git LFS** for large files.

If you see:
```
This repository is configured for Git LFS but 'git-lfs' was not found.
```
Fix it with:
```bash
git lfs install --force
```

---

## 12. Common Commands

**Sync everything:**
```bash
pnpm sb:sync
```

**Start local server:**
```bash
pnpm dev
```

**Reinstall dependencies:**
```bash
pnpm install
```

**Fix Git LFS hooks:**
```bash
git lfs install --force
```

**Manually regenerate Supabase types:**
```bash
supabase gen types typescript --linked > src/lib/database.types.ts
```

**Trigger the GitHub Supabase sync workflow:**
Go to **GitHub → Actions → Supabase DB Auto → Run workflow**

---

## 13. Environment Variables

Configured in Codespaces and GitHub Secrets:

| Variable | Description |
|-----------|--------------|
| `SUPABASE_ACCESS_TOKEN` | Supabase service access token |
| `SUPABASE_PROJECT_REF` | Supabase project reference ID |
| `SUPABASE_DB_URL` | Supabase database connection URL |

For local development you also need the Supabase client credentials that the
Next.js app uses to fetch data:

1. In the Supabase dashboard, open **Project Settings → API**.
2. Copy the **Project URL** into `NEXT_PUBLIC_SUPABASE_URL`.
3. Copy the **anon public** key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Add both values to `.env.local` (or to your deployment environment) and
   restart the dev server.

If either variable is missing the admin approvals page will now show a warning
instead of crashing, because the new `src/lib/supabaseConfig.ts` helper refuses
to create Supabase clients without a complete configuration.

### Admin project approvals + Supabase

The moderation tooling now relies on three Supabase-facing pieces:

- `src/app/api/admin/projects/unapprove/route.ts` is an authenticated API route
  that lets admins move a project from "approved" back to "pending". It returns
  a clear error if the Supabase credentials above are not configured.
- `src/lib/supabaseConfig.ts` centralises Supabase environment validation so the
  browser and server clients fail fast with actionable messages.
- `supabase/migrations/20251007000000_fix_project_moderation.sql` refreshes the
  moderation trigger to use the consolidated `status` column and to reset audit
  fields when a project returns to `pending`.

After pulling the latest code run `pnpm sb:sync` to apply the migration and
regenerate types locally. Once the migration has been applied, approving a
project in the admin UI will make it visible on the public map, and unapproving
it will move it back to the pending queue.

---

## 14. Legacy Script

The old `db-sync.sh` script is **deprecated**.  
It has been fully replaced by:
- `scripts/sb-sync.sh` for local development
- The GitHub Actions workflow for automation

You can delete `db-sync.sh` safely.

---

## 15. Daily Developer Workflow

1. Open the repo in Codespaces — setup runs automatically.
2. When changing database schema or Supabase data models:
   ```bash
   pnpm sb:sync
   git commit -am "update schema/types"
   git push
   ```
3. GitHub Actions syncs the live Supabase project.
4. Vercel automatically deploys the latest version.
5. Local, CI, and production environments stay consistent.
