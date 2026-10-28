-- Manual tests for 20260324120018_project_goals_sync.sql
-- runnable: pnpm db:test
-- Run in the Supabase SQL editor. Everything is rolled back.

begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d5', 'goals-owner@example.test');

set local role service_role;
insert into public.projects (id, name, slug, status, review_status, visibility, owner_type, owner_id, created_by)
values ('00000000-0000-0000-0000-0000000000f5', 'Goals test', 'goals-test', 'pending', 'pending', 'public',
        'user', '00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000d5');
reset role;

-- 1) The owner adds goals through the join tables (allowed while pending); the arrays follow
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000d5"}';
insert into public.project_sdgs (project_id, sdg_id) values
  ('00000000-0000-0000-0000-0000000000f5', 13), ('00000000-0000-0000-0000-0000000000f5', 6);
insert into public.project_ifrc_challenges (project_id, challenge_id)
select '00000000-0000-0000-0000-0000000000f5', id from public.ifrc_challenges where code = 'climate_environmental_crisis';
select sdgs, ifrc_global_challenges from public.projects where id = '00000000-0000-0000-0000-0000000000f5';
  -- expect: {6,13} | {climate_environmental_crisis}
delete from public.project_sdgs where project_id = '00000000-0000-0000-0000-0000000000f5' and sdg_id = 13;
select sdgs from public.projects where id = '00000000-0000-0000-0000-0000000000f5';  -- expect: {6}

-- 2) Filtering by the arrays (as the owner, who sees the pending project)
select count(*) from public.projects where slug = 'goals-test' and sdgs && array['6'];  -- expect: 1
select count(*) from public.projects where slug = 'goals-test' and sdgs && array['13'];  -- expect: 0
reset role;

-- 3) IFRC names follow Strategy 2030
select name from public.ifrc_challenges where name like '%crises%' order by id;
  -- expect: Climate and environmental crises / Evolving crises and disasters

rollback;
