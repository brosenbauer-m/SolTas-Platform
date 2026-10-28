-- Manual tests for 20260324120021_project_metrics.sql
-- runnable: pnpm db:test
-- Run in the Supabase SQL editor. Everything is rolled back.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a7', 'metrics-owner@example.test'),
  ('00000000-0000-0000-0000-0000000000a8', 'metrics-stranger@example.test');

set local role service_role;
insert into public.projects (id, name, slug, status, review_status, visibility, owner_type, owner_id, created_by)
values
  ('00000000-0000-0000-0000-0000000000b7', 'Metrics public', 'metrics-public', 'approved', 'approved', 'public',
   'user', '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a7'),
  ('00000000-0000-0000-0000-0000000000b8', 'Metrics private', 'metrics-private', 'approved', 'approved', 'private',
   'user', '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a7');
reset role;

-- 1) The owner adds metrics to both projects (approved ones too)
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000a7"}';
insert into public.project_metrics (project_id, label, unit, kind, value, as_of, created_by) values
  ('00000000-0000-0000-0000-0000000000b7', 'Trees planted', 'trees', 'output', 1200, '2026-06-30', '00000000-0000-0000-0000-0000000000a7'),
  ('00000000-0000-0000-0000-0000000000b8', 'Households reached', 'households', 'outcome', 40, '2026-06-30', '00000000-0000-0000-0000-0000000000a7')
returning label;  -- expect: Trees planted / Households reached
update public.project_metrics set value = 1500 where label = 'Trees planted' returning value;  -- expect: 1500
savepoint s1;
insert into public.project_metrics (project_id, label, unit, value, created_by)
values ('00000000-0000-0000-0000-0000000000b7', 'Bad unit', 'elephants', 1, '00000000-0000-0000-0000-0000000000a7');
  -- expect: ERROR violates check constraint "project_metrics_unit_check"
rollback to savepoint s1;
reset role;

-- 2) Visitors see the public project's metrics only, and cannot write
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select label from public.project_metrics order by label;  -- expect: Trees planted (1 row)
savepoint s2;
insert into public.project_metrics (project_id, label, unit, value) values ('00000000-0000-0000-0000-0000000000b7', 'Anon', 'people', 1);
  -- expect: ERROR (permission denied, or row-level security policy violation)
rollback to savepoint s2;
reset role;

-- 3) A stranger cannot add, change or delete, and cannot fake the author
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000a8"}';
savepoint s3;
insert into public.project_metrics (project_id, label, unit, value, created_by)
values ('00000000-0000-0000-0000-0000000000b7', 'Hijack', 'people', 1, '00000000-0000-0000-0000-0000000000a8');
  -- expect: ERROR new row violates row-level security policy
rollback to savepoint s3;
update public.project_metrics set value = 0 where label = 'Trees planted' returning value;  -- expect: 0 rows
delete from public.project_metrics where label = 'Trees planted' returning label;  -- expect: 0 rows
reset role;

rollback;
