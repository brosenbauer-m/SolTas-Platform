-- Manual tests for 20260324120004_fix_projects_rls_recursion.sql
--
-- Run in the Supabase SQL editor (or psql as postgres). Everything runs inside a
-- transaction that is rolled back, so nothing is left behind.
--
-- Expected results are in the comments next to each query.

begin;

-- ---------------------------------------------------------------------------
-- Fixtures: 5 users, 6 projects
--   a1 = owner of p1..p5, a2 = unrelated user (and admin of org O),
--   a3 = site admin, a4 = viewer collaborator on p4 + creator of p6,
--   a5 = viewer share on p3
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'rls-owner@example.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'rls-other@example.test'),
  ('00000000-0000-0000-0000-0000000000a3', 'rls-admin@example.test'),
  ('00000000-0000-0000-0000-0000000000a4', 'rls-collab@example.test'),
  ('00000000-0000-0000-0000-0000000000a5', 'rls-share@example.test');

insert into public.profiles (id) values
  ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000a4'),
  ('00000000-0000-0000-0000-0000000000a5')
on conflict (id) do nothing;

insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-0000000000a3', 'admin')
on conflict (user_id) do update set role = excluded.role;

insert into public.organisations (id, name, verification_status) values
  ('20000000-0000-0000-0000-000000000001', 'RLS test org', 'verified');
insert into public.organisation_members (organisation_id, user_id, role) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2', 'admin');

-- Moderation/slug triggers would reject direct status values; bypass them for fixtures only.
alter table public.projects disable trigger user;
insert into public.projects (id, name, slug, status, visibility, owner_type, owner_id, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'RLS approved public',   'rls-p1', 'approved', 'public',   'user', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-000000000002', 'RLS approved unlisted', 'rls-p2', 'approved', 'unlisted', 'user', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-000000000003', 'RLS approved private',  'rls-p3', 'approved', 'private',  'user', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-000000000004', 'RLS pending',           'rls-p4', 'pending',  'public',   'user', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-000000000005', 'RLS rejected',          'rls-p5', 'rejected', 'public',   'user', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-000000000006', 'RLS org pending',       'rls-p6', 'pending',  'public',   'organisation', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a4');
alter table public.projects enable trigger user;

insert into public.project_collaborators (project_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a4', 'viewer');
insert into public.project_shares (project_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a5', 'viewer');

-- ---------------------------------------------------------------------------
-- Logged out (anon): only approved public/unlisted. No "stack depth" error.
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select string_agg(slug, ',' order by slug) as anon_sees from public.projects where slug like 'rls-%';
-- expect: rls-p1,rls-p2
select count(*) from public.project_collaborators;  -- expect: 0, no error
select projects_projects_approved from public.get_home_stats();  -- expect: a number, no timeout
reset role;

-- ---------------------------------------------------------------------------
-- Owner sees their pending/rejected/private projects
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000a1"}';
select string_agg(slug, ',' order by slug) as owner_sees from public.projects where slug like 'rls-%';
-- expect: rls-p1,rls-p2,rls-p3,rls-p4,rls-p5
reset role;

-- ---------------------------------------------------------------------------
-- Another logged-in user does NOT see pending/rejected/private projects
-- (a2 is admin of the test org, so it also sees the org's pending project p6)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000a2"}';
select string_agg(slug, ',' order by slug) as other_user_sees from public.projects where slug like 'rls-%';
-- expect: rls-p1,rls-p2,rls-p6
reset role;

-- ---------------------------------------------------------------------------
-- Collaborator / share / legacy creator
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000a4"}';
select string_agg(slug, ',' order by slug) as collaborator_sees from public.projects where slug like 'rls-%';
-- expect: rls-p1,rls-p2,rls-p4,rls-p6
reset role;

set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000a5"}';
select string_agg(slug, ',' order by slug) as share_viewer_sees from public.projects where slug like 'rls-%';
-- expect: rls-p1,rls-p2,rls-p3
reset role;

-- ---------------------------------------------------------------------------
-- Site admin sees everything
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000a3"}';
select string_agg(slug, ',' order by slug) as admin_sees from public.projects where slug like 'rls-%';
-- expect: rls-p1,rls-p2,rls-p3,rls-p4,rls-p5,rls-p6
reset role;

rollback;
