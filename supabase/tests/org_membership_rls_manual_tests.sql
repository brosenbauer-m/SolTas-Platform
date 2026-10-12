-- Manual tests for 20260324120007_lock_down_org_membership_and_creation.sql
-- Run in the Supabase SQL editor. Everything is rolled back.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'org-admin@example.test'),
  ('00000000-0000-0000-0000-0000000000d2', 'org-stranger@example.test');
insert into public.organisations (id, name, verification_status, created_by) values
  ('20000000-0000-0000-0000-0000000000d1', 'RLS test org', 'verified', '00000000-0000-0000-0000-0000000000d1');
insert into public.organisation_members (organisation_id, user_id, role, can_manage_members) values
  ('20000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d1', 'admin', true);

-- 1) A stranger cannot add themselves to an organisation
savepoint s1;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000d2"}';
insert into public.organisation_members (organisation_id, user_id, role, can_manage_members)
values ('20000000-0000-0000-0000-0000000000d1', auth.uid(), 'admin', true);   -- expect: ERROR new row violates row-level security policy
rollback to savepoint s1;

-- 2) An org admin with can_manage_members can add a member (approving a join request)
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000d1"}';
insert into public.organisation_members (organisation_id, user_id, role)
values ('20000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2', 'member');  -- expect: INSERT 0 1
reset role;

-- 3) Organisations cannot be created as already verified; pending works
savepoint s3;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000d2"}';
insert into public.organisations (name, verification_status, created_by)
values ('Self-verified', 'verified', auth.uid());   -- expect: ERROR new row violates row-level security policy
rollback to savepoint s3;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000d2"}';
insert into public.organisations (name, verification_status, created_by)
values ('Pending org', 'pending', auth.uid());      -- expect: INSERT 0 1
reset role;

rollback;
