-- Manual tests for 20260324120006_fix_profiles_updates_and_protect_roles.sql
-- runnable: pnpm db:test
-- Run in the Supabase SQL editor. Everything is rolled back.
-- Uses two throwaway users; picks any existing superadmin from user_roles for test 4.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'role-test-1@example.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'role-test-2@example.test');
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000c1')
on conflict (id) do nothing;

-- 1) Normal profile edit works (failed before: missing updated_at column)
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000c1"}';
update public.profiles set bio = 'hello' where id = auth.uid() returning bio, updated_at;  -- expect: hello | <now>
reset role;

-- 2) Changing own role is rejected
savepoint s2;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000c1"}';
update public.profiles set role = 'admin' where id = auth.uid();  -- expect: ERROR Only superadmins can change roles
rollback to savepoint s2;

-- 3) Creating own profile with a role is rejected; without a role it works
savepoint s3;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000c2"}';
insert into public.profiles (id, role) values (auth.uid(), 'admin');  -- expect: ERROR Only superadmins can assign roles
rollback to savepoint s3;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000c2"}';
insert into public.profiles (id) values (auth.uid()) returning role;  -- expect: user
reset role;

-- 4) A superadmin can still change roles
select set_config('request.jwt.claims',
  json_build_object('role', 'authenticated', 'sub', (select user_id from public.user_roles where role = 'superadmin' limit 1))::text,
  true);
set local role authenticated;
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c1' returning role;  -- expect: admin
reset role;

rollback;
