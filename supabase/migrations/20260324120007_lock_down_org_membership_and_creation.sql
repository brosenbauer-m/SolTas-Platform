-- Migration: lock_down_org_membership_and_creation
-- Created: 2026-10-12
--
-- Policies below exist in production but were created outside the migrations
-- (captured from the prod schema export).
--
-- 1) organisation_members INSERT
--    org_members_insert_self_owner: WITH CHECK (user_id = auth.uid())
--    lets a signed-in user insert a membership row for themselves in any
--    organisation with any role/permissions. It is also the only INSERT policy,
--    so an org admin approving a join request (src/app/organisations/[id]/members,
--    inserts a row for the requester) is rejected by RLS.
--    New organisations get their first admin via the create-organisation edge
--    function (service role), so no app flow needs self-insert.
--    -> replace with: org admins with can_manage_members may add members.
--
-- 2) organisations INSERT
--    organisations_insert_own / orgs_authenticated_insert only check
--    created_by = auth.uid(), so an organisation can be created already marked
--    'verified'. "Authenticated can create organisations as pending" (same
--    created_by check + verification_status = 'pending') stays and covers the
--    legitimate case.

begin;

-- 1) organisation_members
drop policy if exists "org_members_insert_self_owner" on public.organisation_members;
drop policy if exists "org_members_insert_admin" on public.organisation_members;

create policy "org_members_insert_admin"
on public.organisation_members
for insert
to authenticated
with check (public.is_org_admin_can_manage_members(organisation_id));

-- 2) organisations
drop policy if exists "organisations_insert_own" on public.organisations;
drop policy if exists "orgs_authenticated_insert" on public.organisations;

commit;
