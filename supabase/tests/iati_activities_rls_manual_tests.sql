-- Manual tests for 20260324120012_iati_activities.sql
-- runnable: pnpm db:test
-- Run in the Supabase SQL editor. Everything is rolled back.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'iati-user@example.test'),
  ('00000000-0000-0000-0000-0000000000f2', 'iati-admin@example.test');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000f2', 'admin');

-- The sync writes as the service role (bypasses RLS)
set local role service_role;
insert into public.iati_activities (iati_identifier, title, lifecycle_status, countries, lat, lng, point_precision)
values ('XM-TEST-visible', 'Visible activity', 'ongoing', '{KE}', -1.29, 36.82, 'exact'),
       ('XM-TEST-hidden', 'Hidden activity', 'ongoing', '{KE}', 0.02, 37.9, 'country'),
       ('XM-TEST-withdrawn', 'Withdrawn activity', 'completed', '{UG}', 1.37, 32.29, 'country');
update public.iati_activities set hidden = true where iati_identifier = 'XM-TEST-hidden';
update public.iati_activities set withdrawn_at = now() where iati_identifier = 'XM-TEST-withdrawn';
insert into public.iati_sync_runs (mode, ok, high_water_mark) values ('incremental', true, now());
select count(*) from public.iati_sync_runs;  -- expect: 1
reset role;

-- 1) Visitors see only visible activities
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select iati_identifier from public.iati_activities where iati_identifier like 'XM-TEST-%' order by 1;  -- expect: XM-TEST-visible (only)

-- 2) Visitors cannot write
savepoint s2a;
insert into public.iati_activities (iati_identifier, title) values ('XM-TEST-anon', 'x');  -- expect: ERROR permission denied
rollback to savepoint s2a;
savepoint s2b;
update public.iati_activities set hidden = true where iati_identifier = 'XM-TEST-visible';  -- expect: ERROR permission denied
rollback to savepoint s2b;

-- 3) Visitors cannot read the sync log
savepoint s3;
select count(*) from public.iati_sync_runs;  -- expect: ERROR permission denied
rollback to savepoint s3;
reset role;

-- 4) A signed-in user sees the same as visitors and cannot hide or edit
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000f1"}';
select count(*) from public.iati_activities where iati_identifier like 'XM-TEST-%';  -- expect: 1
update public.iati_activities set hidden = true where iati_identifier = 'XM-TEST-visible'
returning iati_identifier;  -- expect: 0 rows (RLS filters the update)
savepoint s4a;
update public.iati_activities set title = 'Changed' where iati_identifier = 'XM-TEST-visible';  -- expect: ERROR permission denied
rollback to savepoint s4a;
savepoint s4b;
delete from public.iati_activities where iati_identifier = 'XM-TEST-visible';  -- expect: ERROR permission denied
rollback to savepoint s4b;
savepoint s4c;
select count(*) from public.iati_sync_runs;  -- expect: ERROR permission denied
rollback to savepoint s4c;
reset role;

-- 5) An admin sees every row and can hide/unhide, but cannot change the data itself
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000f2"}';
select count(*) from public.iati_activities where iati_identifier like 'XM-TEST-%';  -- expect: 3
update public.iati_activities set hidden = true where iati_identifier = 'XM-TEST-visible'
returning iati_identifier, hidden;  -- expect: XM-TEST-visible | t
savepoint s5;
update public.iati_activities set title = 'Changed' where iati_identifier = 'XM-TEST-visible';  -- expect: ERROR permission denied
rollback to savepoint s5;
reset role;

-- 6) Bad values are rejected
savepoint s6a;
insert into public.iati_activities (iati_identifier, title, lifecycle_status) values ('XM-TEST-bad', 'x', 'wrapping-up');  -- expect: ERROR violates check constraint
rollback to savepoint s6a;
savepoint s6b;
insert into public.iati_activities (iati_identifier, title, lat, lng) values ('XM-TEST-bad', 'x', 95, 0);  -- expect: ERROR violates check constraint
rollback to savepoint s6b;

rollback;
