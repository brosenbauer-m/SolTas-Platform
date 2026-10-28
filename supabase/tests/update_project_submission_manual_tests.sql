-- Manual tests for 20260324120020_update_project_submission.sql
-- runnable: pnpm db:test
-- Run in the Supabase SQL editor. Everything is rolled back.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f6', 'upd-owner@example.test'),
  ('00000000-0000-0000-0000-0000000000f7', 'upd-stranger@example.test');

set local role service_role;
insert into public.organisations (id, name, verification_status)
values ('00000000-0000-0000-0000-0000000000f8', 'Partner org', 'verified');
-- an APPROVED project: the child-table policies alone would not let the owner change its goals any more
insert into public.projects (id, name, slug, status, review_status, visibility, owner_type, owner_id, created_by, category)
values ('00000000-0000-0000-0000-0000000000f9', 'Update test', 'update-test', 'approved', 'approved', 'public',
        'user', '00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000f6', 'humanitarian');
insert into public.project_links (project_id, url, label) values ('00000000-0000-0000-0000-0000000000f9', 'https://old.example', 'Old');
insert into public.project_sdgs (project_id, sdg_id) values ('00000000-0000-0000-0000-0000000000f9', 1);
reset role;

-- 1) The owner saves: row, links, partners and goals replaced in one go
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000f6"}';
select slug from public.update_project_submission(
  '00000000-0000-0000-0000-0000000000f9', 'environmental', 'Update test renamed', 'New text', null,
  1.5, 2.5, 'Somewhere', array['training'], 'Farmers', 120, '2026-01-01', '2026-12-31', array['water'],
  10, 1000, 'eur', '[{"url":"https://new.example","label":"New"},{"url":"  "}]'::jsonb,
  array['00000000-0000-0000-0000-0000000000f8']::uuid[], array[6, 13, 99], array[]::integer[]
);  -- expect: update-test
select name, category, currency, status, sdgs from public.projects where id = '00000000-0000-0000-0000-0000000000f9';
  -- expect: Update test renamed | environmental | EUR | approved | {6,13}
select url from public.project_links where project_id = '00000000-0000-0000-0000-0000000000f9';  -- expect: https://new.example (1 row)
select count(*) from public.project_partners where project_id = '00000000-0000-0000-0000-0000000000f9';  -- expect: 1

-- 2) A bad date range fails as a whole: nothing changes
savepoint s2;
select * from public.update_project_submission(
  '00000000-0000-0000-0000-0000000000f9', 'environmental', 'Should not save', null, null,
  1.5, 2.5, 'Somewhere', null, null, null, '2026-12-31', '2026-01-01', null, null, null, null, '[]'::jsonb, null, null, null
);  -- expect: ERROR End date is before the start date
rollback to savepoint s2;
select name from public.projects where id = '00000000-0000-0000-0000-0000000000f9';  -- expect: Update test renamed

-- 3) A stranger cannot save
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000f7"}';
savepoint s3;
select * from public.update_project_submission(
  '00000000-0000-0000-0000-0000000000f9', 'environmental', 'Hijack', null, null,
  1.5, 2.5, 'Somewhere', null, null, null, null, null, null, null, null, null, '[]'::jsonb, null, null, null
);  -- expect: ERROR You cannot edit this project
rollback to savepoint s3;
reset role;

-- 4) Visitors cannot call it at all
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
savepoint s4;
select * from public.update_project_submission(
  '00000000-0000-0000-0000-0000000000f9', 'environmental', 'Anon', null, null,
  1.5, 2.5, 'Somewhere', null, null, null, null, null, null, null, null, null, '[]'::jsonb, null, null, null
);  -- expect: ERROR permission denied for function update_project_submission
rollback to savepoint s4;
reset role;

rollback;
