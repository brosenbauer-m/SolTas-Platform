# Production schema drift

Status as of 2026-10-12. The source is a read-only export of the production `public` schema
(`scripts/schema-export.sql`, run in the Supabase SQL editor and exported as CSV).

## What was different

The export was compared with two things:

1. **The migration files.** Objects in production that no file in `supabase/migrations` creates.
2. **A local rebuild.** That is the archived Oct-2025 production snapshot
   (`supabase/migrations_archive/20251005101141_auto.sql`) plus every migration. Comparing
   against it shows objects that were changed by hand after the snapshot.

| Kind | Objects in prod but not in any migration |
|---|---|
| Tables | `admin_emails`, `app_settings`, `organisation_members`, `watchdog_cases` (legacy) |
| Functions | `handle_new_user`, `prevent_deleting_last_admin`, and, created by hand after Oct 2025: `is_moderator`, `approve_project`, `reject_project`, `grant_admin`, `revoke_admin` |
| Triggers | `admin_emails.trg_prevent_last_admin_delete`, `projects.trg_enforce_moderation_by_admin` |
| Policies | `admin_emails_*` (4), `app_settings_*` (3), `org_members_update_admins`, `orgs_members_update`, `orgs_public_read`, `profiles_public_read`, `profiles_user_update_self`, `"profiles role updates by superadmin"`, `"projects approval updates by moderators"`, `projects_update_owner_while_pending`, `wd_*` on `watchdog_cases` (3) |
| Views | `rejected_projects` was recreated by hand and includes `category` and `slug` |

`activity_feed_items` and `organisations_directory_v1` **are** created by migrations
(`20260312090000`, `20260314121000`). Everything else matched, apart from the order of
columns and indexes.

All of the above is now captured in `20260324120008_capture_schema_drift.sql`. That
migration is idempotent and reproduces production exactly, so it changes nothing there.
Overly broad policies are captured **as they are** and marked `FLAG` in the file; the
proposed tightened versions are below.

## Fixed while doing this (already deployed)

| PR | Migration | What |
|---|---|---|
| #172 | `20260324120004` | Logged-out project reads recursed until Postgres gave up; any logged-in user could read every project |
| #177 | `20260324120005` | #172 broke project updates ("infinite recursion detected in policy") and project submissions |
| #178 | `20260324120006` | Every `profiles` UPDATE failed (trigger set `updated_at`, but the column was missing). Changing `role` / `is_admin` is now limited to superadmins |
| #179 | `20260324120007` | Any user could add themselves to any organisation, and approving join requests failed. Organisations can no longer be created as already verified |

## Proposals

Status: 1 and 3–7 were applied in `20260324120009_tighten_rls_and_retire_legacy.sql` (#3 keeps a narrow
"creator may edit their pending submission" rule so org members can still finish their own submission;
#7 drops `watchdog_cases` only if it is empty). 2 is handled in its own migration (private profile fields).

### 1. `organisations.orgs_public_read` — `USING (true)`
Everyone, including logged-out visitors, can read every organisation, pending and rejected
ones too. That makes `"Public can read verified organisations"` pointless.

```sql
drop policy if exists orgs_public_read on public.organisations;
```

Impact: pending and rejected organisations are then only visible to their creator, their
members and admins, and to nobody else on `/organisations/[id]`. The project form's
"lead organisation" list then shows verified organisations plus your own.

### 2. Public profiles expose every column
`"Public can read profiles"` (from a migration) and `profiles_public_read` (prod-only) are both
`USING (true)`. Anyone can therefore read `date_of_birth`, `nationality`, `surname` and every
other profile field. RLS can't hide individual columns, so the fix is a small project:

- Add a view `public.public_profiles` with only the fields shown in the app (`id`,
  `first_name`, `last_name`, `full_name`, `avatar_url`, `bio`, `occupation`, `country_based`,
  `social_links`, `organisation_id`, `kind`).
- Point the app's reads (feed, comments, people pages, header) at that view.
- Then limit `profiles` SELECT to the user themselves and admins.

### 3. Duplicate or legacy update policies

```sql
-- Duplicates "Users can update own profile" but skips its verified-organisation check
drop policy if exists profiles_user_update_self on public.profiles;

-- Duplicates org_members_update_admin without the can_manage_members check
drop policy if exists org_members_update_admins on public.organisation_members;

-- Legacy created_by/review_status rule. review_status is never updated, so the original
-- creator can edit the project forever (including owner_type/owner_id), even after
-- leaving the organisation. projects_update_dual_ownership covers owners, org admins and editors.
drop policy if exists projects_update_owner_while_pending on public.projects;
```

### 4. Legacy admin flags
`is_moderator()` reads `profiles.role` and `is_admin(uuid)` reads `profiles.is_admin`. The
policies `"projects approval updates by moderators"`, `projects_admin_update` and
`wd_admin_update` rely on them. Since #178 users can't change these columns themselves, but
the source of truth for permissions is `user_roles`. Proposal: make both functions read
`user_roles`, as `is_admin()` already does.

### 5. Unused functions
`approve_project`, `reject_project`, `grant_admin` and `revoke_admin` aren't called by the app.
`reject_project` sets `approved_at`/`approved_by` instead of `rejected_at`/`rejected_by`.
Proposal: drop all four, or fix `reject_project` if you use them from the SQL editor.

### 6. `projects_update_dual_ownership` share-editor clause
`where s.project_id = id` resolves `id` to `project_shares.id`, so editors added through
`project_shares` can never update. The app doesn't create `project_shares` rows today.
Proposal: `s.project_id = projects.id`.

### 7. Legacy `watchdog_cases`
The app now only uses `watchdog_issues`, and `/add/watchdog` redirects to `/watchdog/new`.
First check whether the old table holds anything worth keeping:

```sql
select review_status, count(*) from public.watchdog_cases group by 1;
```

If it's empty, or the rows can be discarded, drop it in a later migration:

```sql
drop table if exists public.watchdog_cases;
```

Otherwise, copy the rows into `watchdog_issues` first. That table needs `city`,
`latitude` and `longitude`, which `watchdog_cases` doesn't always have, so this needs a
manual mapping.

## Fresh databases

A new database (local `supabase db reset`, a staging project) **cannot** be built from
`supabase/migrations` alone. `20250919085607_baseline.sql` is empty, but later migrations
depend on what it should contain (`profiles`, `organisation_members`, …).

Tested fix: put the archived snapshot `migrations_archive/20251005101141_auto.sql` into the
baseline file, wrapped in `set check_function_bodies = off;` … `reset check_function_bodies;`
and with `CONCURRENTLY` removed from its index statements. With that change, every migration
applies cleanly, each file in one transaction, and the result matches production apart
from the fixes above.

This edits a migration that is already recorded as applied. Production isn't affected,
because the CLI never re-runs applied versions, but `AGENT_RULES.md` forbids it, so it
needs the owner's explicit OK.

## Checking for drift again

1. Run `scripts/schema-export.sql` in the Supabase SQL editor and export the result as CSV.
2. Compare it with a database built as described in "Fresh databases" (or with the
   previous export).
