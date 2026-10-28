-- Manual tests for 20260324120024_home_stats_changemakers.sql
-- runnable: pnpm db:test
-- Run in the Supabase SQL editor. Everything is rolled back.

begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000ac', 'stats-maker@example.test');

set local role service_role;
insert into public.projects (id, name, slug, status, review_status, visibility, owner_type, owner_id, created_by, lives_improved)
values ('00000000-0000-0000-0000-0000000000bc', 'Stats project', 'stats-project', 'approved', 'approved', 'public',
        'user', '00000000-0000-0000-0000-0000000000ac', '00000000-0000-0000-0000-0000000000ac', 250);
reset role;

-- Visitors get the figures; the new columns count the fixture
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select projects_changemakers >= 1 as has_changemaker, projects_lives_improved >= 250 as has_lives from public.get_home_stats();
  -- expect: t | t
reset role;

rollback;
