-- Manual tests for the IATI sync log (public.iati_sync_runs, 20260324120012): server only.
-- runnable: pnpm db:test
-- Run in the Supabase SQL editor. Everything is rolled back.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'iati-user@example.test'),
  ('00000000-0000-0000-0000-0000000000f2', 'iati-admin@example.test');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000f2', 'admin');

-- The sync writes as the service role (bypasses RLS)
set local role service_role;
insert into public.iati_sync_runs (mode, ok, high_water_mark) values ('incremental', true, now());
select count(*) >= 1 as logged from public.iati_sync_runs;  -- expect: t
reset role;

-- 1) The old activities table is gone
select to_regclass('public.iati_activities') is null as dropped;  -- expect: t

-- 2) Visitors cannot read or write the sync log
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
savepoint s2a;
select count(*) from public.iati_sync_runs;  -- expect: ERROR permission denied
rollback to savepoint s2a;
savepoint s2b;
insert into public.iati_sync_runs (mode) values ('full');  -- expect: ERROR permission denied
rollback to savepoint s2b;
reset role;

-- 3) Signed-in users and admins cannot read it either
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000f1"}';
savepoint s3a;
select count(*) from public.iati_sync_runs;  -- expect: ERROR permission denied
rollback to savepoint s3a;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000f2"}';
savepoint s3b;
select count(*) from public.iati_sync_runs;  -- expect: ERROR permission denied
rollback to savepoint s3b;
reset role;

rollback;
