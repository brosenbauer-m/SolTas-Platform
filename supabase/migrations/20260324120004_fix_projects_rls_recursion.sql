-- Migration: fix_projects_rls_recursion
-- Created: 2026-10-11T20:51:58.237Z
--
-- PROBLEM (production):
--   Logged-out (anon) queries on public.projects fail with "stack depth limit exceeded".
--   Policy projects_select_public_or_shared calls public.user_can_view_project(id), a
--   SECURITY INVOKER function that itself selects from public.projects, so RLS re-enters
--   the policy forever. /projects shows 0 projects to visitors and get_home_stats() times out.
--   Logged-in users were not affected only because a hand-made policy "projects read"
--   (TO authenticated USING (true), not in any migration) let them read EVERY project,
--   including pending, rejected and private ones.
--
--   The same pattern exists on public.project_collaborators: its policies call
--   public.user_can_edit_project(), a SECURITY INVOKER function that selects from
--   public.project_collaborators.
--
-- FIX:
--   1) Project access helpers become SECURITY DEFINER (search_path = '', fully
--      schema-qualified) so they read projects / collaborators / shares without
--      re-entering RLS.
--   2) The four overlapping SELECT policies on public.projects are replaced by one:
--        approved AND visibility public/unlisted
--        OR user_can_view_project_private(id)   (owner, creator, org admin, collaborator, share, site admin)
--        OR can_admin_projects()
--
-- VISIBILITY SEMANTICS (projects.visibility):
--   public   = listed and readable by everyone once approved
--   unlisted = readable by everyone with the link once approved (lists filter it out in the app)
--   private  = only people with private access (see user_can_view_project_private)
--   NULL is treated as 'public' (column default; legacy rows were backfilled to 'public').
--
-- NOT CHANGED (see PR description):
--   UPDATE policies projects_update_owner_while_pending and
--   "projects approval updates by moderators" are not fully covered by
--   projects_update_dual_ownership + admin policies, so they are left in place.

begin;

-- ---------------------------------------------------------------------------
-- 1) Helper functions: SECURITY DEFINER, empty search_path
-- ---------------------------------------------------------------------------

-- Private access: people who may see a project regardless of status/visibility.
-- Same as before, plus the legacy creator (created_by) and admins of the owning
-- organisation, who could read via the dropped policies and must keep seeing
-- projects they can edit.
create or replace function public.user_can_view_project_private(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = pid
        and (
          p.owner_id = auth.uid()
          or p.created_by = auth.uid()
          or (
            p.owner_type = 'organisation'
            and exists (
              select 1
              from public.organisation_members om
              where om.organisation_id = p.owner_id
                and om.user_id = auth.uid()
                and om.role = 'admin'
            )
          )
        )
    )
    or exists (
      select 1
      from public.project_collaborators c
      where c.project_id = pid
        and c.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_shares s
      where s.project_id = pid
        and s.user_id = auth.uid()
    );
$$;

-- General view access: approved + public/unlisted, or private access.
-- Same rule as the projects SELECT policy below, so project_updates and other
-- callers can never show something the project itself hides.
create or replace function public.user_can_view_project(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.projects p
      where p.id = pid
        and p.status = 'approved'
        and coalesce(p.visibility, 'public') in ('public', 'unlisted')
    )
    or public.user_can_view_project_private(pid);
$$;

-- Edit access: same logic as before; now SECURITY DEFINER so the
-- project_collaborators policies that call it no longer recurse.
create or replace function public.user_can_edit_project(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = pid
        and p.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_collaborators c
      where c.project_id = pid
        and c.user_id = auth.uid()
        and c.role = 'editor'
    )
    or exists (
      select 1
      from public.project_shares s
      where s.project_id = pid
        and s.user_id = auth.uid()
        and s.role = 'editor'
    );
$$;

revoke execute on function public.user_can_view_project_private(uuid) from public;
revoke execute on function public.user_can_view_project(uuid) from public;
revoke execute on function public.user_can_edit_project(uuid) from public;

grant execute on function public.user_can_view_project_private(uuid) to anon, authenticated, service_role;
grant execute on function public.user_can_view_project(uuid) to anon, authenticated, service_role;
grant execute on function public.user_can_edit_project(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) public.projects SELECT: replace four overlapping policies with one
-- ---------------------------------------------------------------------------

drop policy if exists "projects_select" on public.projects;
drop policy if exists "projects_select_public_or_shared" on public.projects;
drop policy if exists "projects read" on public.projects;                           -- prod-only: USING (true) for authenticated
drop policy if exists "projects_public_read_approved_or_owner" on public.projects;  -- prod-only: legacy review_status column
drop policy if exists "projects_select_visible" on public.projects;

create policy "projects_select_visible"
on public.projects
for select
using (
  (status = 'approved' and coalesce(visibility, 'public') in ('public', 'unlisted'))
  or public.user_can_view_project_private(id)
  or (select public.can_admin_projects())
);

commit;
