-- Migration: tighten_rls_and_retire_legacy
-- Created: 2026-10-12T16:43:48.979Z
--
-- Applies the proposals from docs/schema-drift.md (approved by the owner):
--   1) organisations: drop orgs_public_read (USING true). Pending/rejected organisations
--      are then visible only to their creator, members and admins.
--   3) drop duplicate/legacy update policies; the legacy creator rule on projects is
--      replaced by a narrow "creator may edit their own pending submission" rule.
--   4) is_moderator() and is_admin(uuid) read user_roles (the source of truth)
--      instead of the legacy profiles.role / profiles.is_admin columns.
--   5) drop unused functions approve_project, reject_project, grant_admin, revoke_admin.
--   6) projects_update_dual_ownership: share-editor clause compared project_shares.id
--      with itself; it now matches projects.id.
--   7) drop the legacy watchdog_cases table only if it is empty (kept otherwise).

begin;

-- 1) organisations -------------------------------------------------------------
drop policy if exists "orgs_public_read" on public.organisations;

-- 3) duplicate / legacy update policies --------------------------------------------
-- Duplicate of "Users can update own profile", minus its verified-organisation check.
drop policy if exists "profiles_user_update_self" on public.profiles;

-- Duplicate of org_members_update_admin, minus its can_manage_members check.
drop policy if exists "org_members_update_admins" on public.organisation_members;

-- Legacy: created_by + review_status (never updated) let the creator edit forever,
-- including owner_type/owner_id. Replaced by a narrow rule: the creator may edit their
-- submission while it is pending (the submit flow sets the category right after
-- creating it), and ownership must stay valid (same rule as projects_insert_dual_ownership).
drop policy if exists "projects_update_owner_while_pending" on public.projects;
drop policy if exists "projects_update_creator_while_pending" on public.projects;
create policy "projects_update_creator_while_pending"
on public.projects
for update
to authenticated
using (created_by = auth.uid() and status = 'pending')
with check (
  created_by = auth.uid()
  and status = 'pending'
  and (
    (owner_type = 'user' and owner_id = auth.uid())
    or (
      owner_type = 'organisation'
      and exists (
        select 1
        from public.organisation_members om
        join public.organisations o on o.id = om.organisation_id
        where om.organisation_id = projects.owner_id
          and om.user_id = auth.uid()
          and om.can_create_projects = true
          and o.verification_status = 'verified'
      )
    )
  )
);

-- 4) legacy admin flags -> user_roles --------------------------------------------
create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'superadmin')
  );
$$;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = uid
      and ur.role in ('admin', 'superadmin')
  );
$$;

-- 5) unused functions (no callers in the app, policies or other functions) ---------
drop function if exists public.approve_project(uuid);
drop function if exists public.reject_project(uuid);
drop function if exists public.grant_admin(text);
drop function if exists public.revoke_admin(text);

-- 6) projects_update_dual_ownership share-editor clause ----------------------------
drop policy if exists "projects_update_dual_ownership" on public.projects;
create policy "projects_update_dual_ownership"
on public.projects
for update
to authenticated
using (
  public.is_admin()
  or (owner_type = 'user' and owner_id = auth.uid())
  or (
    owner_type = 'organisation'
    and exists (
      select 1
      from public.organisation_members om
      join public.organisations o on o.id = om.organisation_id
      where om.organisation_id = projects.owner_id
        and om.user_id = auth.uid()
        and om.role = 'admin'
        and o.verification_status = 'verified'
    )
  )
  or exists (
    select 1
    from public.project_collaborators c
    where c.project_id = projects.id
      and c.user_id = auth.uid()
      and c.role = 'editor'
  )
  or exists (
    select 1
    from public.project_shares s
    where s.project_id = projects.id
      and s.user_id = auth.uid()
      and s.role = 'editor'
  )
)
with check (
  public.is_admin()
  or (owner_type = 'user' and owner_id = auth.uid())
  or (
    owner_type = 'organisation'
    and exists (
      select 1
      from public.organisation_members om
      join public.organisations o on o.id = om.organisation_id
      where om.organisation_id = projects.owner_id
        and om.user_id = auth.uid()
        and om.role = 'admin'
        and o.verification_status = 'verified'
    )
  )
  or exists (
    select 1
    from public.project_collaborators c
    where c.project_id = projects.id
      and c.user_id = auth.uid()
      and c.role = 'editor'
  )
  or exists (
    select 1
    from public.project_shares s
    where s.project_id = projects.id
      and s.user_id = auth.uid()
      and s.role = 'editor'
  )
);

-- 7) legacy watchdog_cases (replaced by watchdog_issues) ---------------------------
-- Only dropped when it holds no rows, so no data can be lost.
do $$
begin
  if to_regclass('public.watchdog_cases') is not null then
    if exists (select 1 from public.watchdog_cases) then
      raise notice 'watchdog_cases still has rows; kept. Migrate them to watchdog_issues before dropping.';
    else
      drop table public.watchdog_cases;
    end if;
  end if;
end $$;

commit;
