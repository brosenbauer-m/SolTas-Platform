# Security Hardening Deployment Summary

> **Historical document.** Kept for reference. Do not run `supabase db push` or change the database by hand: migrations are applied automatically when merged to `main` (see `AGENT_RULES.md`).

## Migration Details

**Migration File:** `20260322000000_security_hardening_rls_functions.sql`  
**Timestamp:** 20260322000000 (March 22, 2026, 00:00:00 UTC)  
**Created:** February 18, 2026  
**Type:** Forward-only security hardening migration

---

## Changes Made

### 1. Fixed SECURITY DEFINER View

**Object:** `public.verified_organisations`

**Issue:** View was using the default `SECURITY DEFINER` option, which could allow privilege escalation by running queries with the view creator's permissions instead of the caller's permissions.

**Fix:** Added `with (security_invoker=on)` option to ensure the view runs with the caller's permissions.

**Impact:** No functional change. The view continues to return the same data (id, name) for verified organisations.

---

### 2. Fixed Functions Missing Explicit search_path

Added `SET search_path = pg_catalog, public` to all flagged functions and schema-qualified all function references to prevent search_path injection attacks.

#### Functions Updated:

1. **`public.set_updated_at()`**
   - Type: Trigger function
   - Usage: Updates `updated_at` timestamp on various tables
   - Changes: Added `SET search_path`, schema-qualified `now()` to `pg_catalog.now()`

2. **`public.enforce_at_least_one_admin()`**
   - Type: Trigger function (SECURITY DEFINER)
   - Usage: Prevents deletion/demotion of the last admin in an organisation
   - Changes: Added `SET search_path`, schema-qualified `tg_op`, `count()`, and table references

3. **`public.get_home_stats()`**
   - Type: SQL function
   - Usage: Returns homepage statistics (projects, organisations, funding, etc.)
   - Changes: Added `SET search_path`, schema-qualified `now()`, `count()`, `sum()`, `coalesce()`, `current_date`

4. **`public.update_comments_updated_at()`**
   - Type: Trigger function
   - Usage: Updates `updated_at` timestamp on comment updates
   - Changes: Added `SET search_path`, schema-qualified `now()` to `pg_catalog.now()`

**Impact:** No functional changes. Functions behave identically but are now protected against search_path injection.

---

### 3. Fixed RLS Policies with WITH CHECK (true)

Updated all flagged policies to have WITH CHECK clauses that match their USING clauses, preventing privilege escalation via INSERT/UPDATE operations.

#### Policies Updated:

1. **`project_ifrc_admin_all`** on `public.project_ifrc_challenges`
   - USING: `public.can_admin_projects()`
   - WITH CHECK: Changed from `true` to `public.can_admin_projects()`

2. **`project_links_admin_all`** on `public.project_links`
   - USING: `public.can_admin_projects()`
   - WITH CHECK: Changed from `true` to `public.can_admin_projects()`

3. **`project_media_admin_all`** on `public.project_media`
   - USING: `public.can_admin_projects()`
   - WITH CHECK: Changed from `true` to `public.can_admin_projects()`

4. **`project_partners_admin_all`** on `public.project_partners`
   - USING: `public.can_admin_projects()`
   - WITH CHECK: Changed from `true` to `public.can_admin_projects()`

5. **`project_posts_admin_all`** on `public.project_posts`
   - USING: `public.can_admin_projects()`
   - WITH CHECK: Changed from `true` to `public.can_admin_projects()`

6. **`project_sdgs_admin_all`** on `public.project_sdgs`
   - USING: `public.can_admin_projects()`
   - WITH CHECK: Changed from `true` to `public.can_admin_projects()`

**Impact:** No functional change for admin users. Non-admin users were already blocked by the USING clause. This fix prevents a theoretical privilege escalation where a user might bypass checks on INSERT/UPDATE operations.

---

## Policies NOT Found / Already Fixed

The following policies mentioned in the Supabase Security Advisor report were not found in the migration history:

- **`organisations → orgs_authenticated_insert`**: The current policy is named `organisations_insert_own` and already has the correct WITH CHECK clause: `with check (created_by = auth.uid())`

- **`projects → projects_admin_update`**: Not found. The current policy is `projects_update_dual_ownership` which already has proper WITH CHECK clauses.

- **`watchdog_cases → wd_admin_update`**: Not found. The current policy is `watchdog_issues_update_dual_ownership` which already has proper WITH CHECK clauses.

These policies may have been renamed or replaced in previous migrations.

---

## Dashboard-Only Changes

See `SUPABASE_DASHBOARD_ACTIONS.md` for manual steps required:

1. **Enable Leaked Password Protection**
   - Navigate to Authentication → Policies → Password Protection
   - Toggle "Leaked Password Protection" to Enabled

2. **Upgrade Postgres Version**
   - Navigate to Settings → Database
   - Apply available security patches during a maintenance window

---

## Deployment Commands

### All-in-One Copy-Paste Block

```bash
# Navigate to project directory
cd /home/runner/work/platform/platform

# Verify migration timestamp (should be > 20260321120007)
ls -1 supabase/migrations/ | tail -1

# Apply migration to production (via Supabase CLI)
# Note: This requires Supabase project to be linked
npx -y supabase@latest db push

# Regenerate TypeScript types
pnpm sb:types

# Verify changes
git status
git diff src/lib/database.types.ts

# Commit types if regenerated
git add src/lib/database.types.ts
git commit -m "Regenerate types after security hardening migration"
git push origin main
```

---

## Verification Checklist

After deployment, verify the following in the Supabase Dashboard under **Advisors → Security**:

- [ ] No views with SECURITY DEFINER warning
- [ ] No functions missing explicit search_path warning
- [ ] No RLS policies with WITH CHECK (true) warning

### Functional Testing

Test as different user types to ensure business logic is preserved:

#### Logged Out User:
- [ ] Can view public/approved projects
- [ ] Can view verified organisations
- [ ] Cannot insert or update any data

#### Authenticated Non-Admin User:
- [ ] Can create personal projects (owner_type='user')
- [ ] Can create own organisation (created_by = auth.uid())
- [ ] Cannot update admin-only tables
- [ ] Cannot insert organisation-owned content without appropriate permissions

#### Admin User:
- [ ] Can view all projects (including pending)
- [ ] Can update any project
- [ ] Can manage organisation verification
- [ ] All admin functions work correctly

#### Organisation Members:
- [ ] Member with can_create_projects=true can create org-owned projects
- [ ] Member without can_create_projects cannot create org-owned projects
- [ ] Org admin can update org-owned content
- [ ] Regular member cannot update admin-restricted content

---

## Security Improvements

1. **Eliminated SECURITY DEFINER View Vulnerability**
   - `verified_organisations` view now runs with caller's permissions
   - Prevents potential privilege escalation

2. **Protected Against search_path Injection**
   - All flagged functions now have explicit search_path
   - All function bodies use schema-qualified references
   - Prevents malicious users from manipulating function behavior

3. **Tightened RLS Write Policies**
   - All admin policies now enforce the same restrictions for SELECT, INSERT, and UPDATE
   - Prevents theoretical privilege escalation via INSERT/UPDATE operations
   - Maintains principle of least privilege

---

## Risk Assessment

**Risk Level:** Low

**Rationale:**
- All changes are security hardening only
- No functional logic altered
- No permissions loosened
- All existing business rules preserved
- Changes are backward compatible

**Rollback Plan:**
- Migration is forward-only
- If issues occur, create a new migration to revert changes
- Functions can be updated with `CREATE OR REPLACE FUNCTION`
- Policies can be dropped and recreated
- View can be recreated without `security_invoker` option if needed

---

## Related Documents

- `SUPABASE_DASHBOARD_ACTIONS.md` - Manual dashboard configuration steps
- `supabase/migrations/20260322000000_security_hardening_rls_functions.sql` - Migration SQL

---

## Questions or Issues?

If you encounter any issues during or after deployment:
1. Check the Supabase logs for errors
2. Review the Security Advisor for any remaining warnings
3. Run the functional test checklist
4. Contact the development team if critical issues arise

---

**Deployment Status:** Ready for Production  
**Approval Required:** Yes (Database changes)  
**Estimated Downtime:** None (online migration)
