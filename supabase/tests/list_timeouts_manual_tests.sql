-- Manual tests for 20260324120017_fix_list_timeouts.sql
-- runnable: pnpm db:test
-- Run in the Supabase SQL editor. Everything is rolled back.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'lt-owner@example.test'),
  ('00000000-0000-0000-0000-0000000000d2', 'lt-stranger@example.test');

set local role service_role;
insert into public.organisations (id, name, verification_status)
values ('00000000-0000-0000-0000-0000000000e1', 'List test org', 'verified');
-- p1 listed and ongoing, p2 listed and finished, p3 pending, p4 private: only p1 + p2 count
insert into public.projects (id, name, slug, status, review_status, visibility, owner_type, owner_id, created_by, lead_org_id, end_date)
values
  ('00000000-0000-0000-0000-0000000000f1', 'LT public ongoing', 'lt-public-ongoing', 'approved', 'approved', 'public',
   'user', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1', null),
  ('00000000-0000-0000-0000-0000000000f2', 'LT public finished', 'lt-public-finished', 'approved', 'approved', 'public',
   'user', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1', '2020-01-01'),
  ('00000000-0000-0000-0000-0000000000f3', 'LT pending', 'lt-pending', 'pending', 'pending', 'public',
   'user', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1', null),
  ('00000000-0000-0000-0000-0000000000f4', 'LT private', 'lt-private', 'approved', 'approved', 'private',
   'user', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1', null);
insert into public.tags (id, slug, label, origin) values
  ('00000000-0000-0000-0000-0000000000c9', 'lt-test-tag', 'LT test tag', 'admin');
insert into public.project_tags (project_id, tag_id, added_by) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c9', 'ai'),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000c9', 'ai');
reset role;

-- 1) Visitors: tags of the public project only; directory counts only listed projects; no IATI org
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select project_id from public.project_tags where tag_id = '00000000-0000-0000-0000-0000000000c9';
  -- expect: 1 row, 00000000-0000-0000-0000-0000000000f1
select projects_total_count, projects_ongoing_count from public.organisations_directory_v1
  where id = '00000000-0000-0000-0000-0000000000e1';  -- expect: 2, 1
select count(*) from public.organisations_directory_v1 where id = 'a7a71000-0000-4000-8000-000000000001';  -- expect: 0
reset role;

-- 2) The owner sees the private project's tag too; the stranger does not
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000d1"}';
select count(*) from public.project_tags where tag_id = '00000000-0000-0000-0000-0000000000c9';  -- expect: 2
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000d2"}';
select count(*) from public.project_tags where tag_id = '00000000-0000-0000-0000-0000000000c9';  -- expect: 1
reset role;

-- 3) The listed-rows indexes exist
select count(*) from pg_indexes where tablename = 'projects' and indexname like 'projects_listed_%';  -- expect: 6

rollback;
