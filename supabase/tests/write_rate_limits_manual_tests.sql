-- Manual tests for 20260324120023_write_rate_limits.sql
-- runnable: pnpm db:test
-- Run in the Supabase SQL editor. Everything is rolled back.

begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000aa', 'rl-poster@example.test');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000aa') on conflict (id) do nothing;

set local role service_role;
insert into public.projects (id, name, slug, status, review_status, visibility, owner_type, owner_id, created_by)
values ('00000000-0000-0000-0000-0000000000bb', 'RL project', 'rl-project', 'approved', 'approved', 'public',
        'user', '00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000aa');
reset role;

-- 1) The 31st project update within an hour is refused; the first 30 go through
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000aa"}';
insert into public.project_updates (project_id, author_user_id, title, body, visibility)
select '00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000aa', 'Update ' || g, 'x', 'public'
from generate_series(1, 30) g;
select count(*) from public.project_updates where author_user_id = '00000000-0000-0000-0000-0000000000aa';  -- expect: 30
savepoint s1;
insert into public.project_updates (project_id, author_user_id, title, body, visibility)
values ('00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000aa', 'Update 31', 'x', 'public')
returning title;  -- expect: ERROR Too many updates in a short time (never a row)
rollback to savepoint s1;
reset role;

-- 2) The service role (server jobs) is not limited (its requests carry the service_role claim)
set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';
insert into public.project_updates (project_id, author_user_id, title, body, visibility)
values ('00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000aa', 'Server update', 'x', 'public')
returning title;  -- expect: Server update
reset role;

rollback;
