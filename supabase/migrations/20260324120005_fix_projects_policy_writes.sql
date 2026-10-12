-- Migration: fix_projects_update_policy_recursion
-- Created: 2026-10-12
--
-- HOTFIX for 20260324120004_fix_projects_rls_recursion.sql
--
-- PROBLEM:
--   projects_select_visible wrapped the admin check in a scalar subquery
--   "(select public.can_admin_projects())". When Postgres expands RLS for an
--   UPDATE/DELETE on public.projects, it also expands the subquery on
--   public.project_shares inside projects_update_dual_ownership, whose policies
--   select from public.projects again. With the extra sub-select present this
--   is reported as:
--     ERROR: infinite recursion detected in policy for relation "projects"
--   so every project update by a signed-in user failed (owners editing their
--   project, admins approving through the app). Reads were not affected.
--
-- PROBLEM 2:
--   INSERT ... RETURNING (used by create_project_submission(), a SECURITY
--   INVOKER function) needs the new row to pass the SELECT policy. The owner
--   check lived only inside user_can_view_project_private(), a STABLE function
--   that cannot see the row being inserted, so every project submission failed
--   with 'new row violates row-level security policy for table "projects"'.
--   The old projects_select policy had an inline "auth.uid() = created_by".
--
-- FIX:
--   Same visibility rule, without the scalar-subquery wrapper and with inline
--   owner/creator checks (no subqueries, so no recursion).

begin;

drop policy if exists "projects_select_visible" on public.projects;

create policy "projects_select_visible"
on public.projects
for select
using (
  (status = 'approved' and coalesce(visibility, 'public') in ('public', 'unlisted'))
  or owner_id = auth.uid()
  or created_by = auth.uid()
  or public.user_can_view_project_private(id)
  or public.can_admin_projects()
);

commit;
