-- Manual tests for 20260324120015_project_tags.sql
-- runnable: pnpm db:test
-- Run in the Supabase SQL editor. Everything is rolled back.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'tag-owner@example.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'tag-stranger@example.test'),
  ('00000000-0000-0000-0000-0000000000a3', 'tag-admin@example.test');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000a3', 'admin');

-- Setup as the service role: a public project owned by a1, two tags, one AI tag on the project
set local role service_role;
insert into public.projects (id, name, slug, status, review_status, visibility, owner_type, owner_id, created_by)
values ('00000000-0000-0000-0000-0000000000b1', 'Tag test project', 'tag-test-project', 'approved', 'approved',
        'public', 'user', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1');
insert into public.tags (id, slug, label, origin) values
  ('00000000-0000-0000-0000-0000000000c1', 'test-water', 'Test water', 'admin'),
  ('00000000-0000-0000-0000-0000000000c2', 'test-forests', 'Test forests', 'ai');
insert into public.project_tags (project_id, tag_id, added_by)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'ai');
reset role;

-- 1) Visitors see the vocabulary and the project's tags, and cannot change anything
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select count(*) from public.tags where slug like 'test-%';  -- expect: 2
select added_by from public.project_tags where project_id = '00000000-0000-0000-0000-0000000000b1';  -- expect: ai
savepoint s1a;
insert into public.tags (slug, label, origin) values ('anon-tag', 'Anon tag', 'admin');  -- expect: ERROR permission denied
rollback to savepoint s1a;
savepoint s1b;
delete from public.project_tags where project_id = '00000000-0000-0000-0000-0000000000b1';  -- expect: ERROR permission denied
rollback to savepoint s1b;
savepoint s1c;
select count(*) from public.tag_requests;  -- expect: ERROR permission denied
rollback to savepoint s1c;
reset role;

-- 2) The project owner removes the AI tag and adds an existing tag, but cannot create tags or fake an AI tag
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000a1"}';
delete from public.project_tags where project_id = '00000000-0000-0000-0000-0000000000b1'
returning tag_id;  -- expect: 00000000-0000-0000-0000-0000000000c1
insert into public.project_tags (project_id, tag_id, added_by)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'user')
returning added_by;  -- expect: user
savepoint s2a;
insert into public.project_tags (project_id, tag_id, added_by)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'ai');  -- expect: ERROR new row violates row-level security policy
rollback to savepoint s2a;
savepoint s2b;
insert into public.tags (slug, label, origin) values ('my-own-tag', 'My own tag', 'admin');  -- expect: ERROR new row violates row-level security policy
rollback to savepoint s2b;
-- ... but can ask for a new tag and see the request
insert into public.tag_requests (label, reason, project_id)
values ('Solar cooking', 'Not in the list', '00000000-0000-0000-0000-0000000000b1')
returning status;  -- expect: pending
savepoint s2c;
insert into public.tag_requests (label, status) values ('Self-approved', 'approved');  -- expect: ERROR new row violates row-level security policy
rollback to savepoint s2c;
savepoint s2d;
update public.tag_requests set status = 'approved' where label = 'Solar cooking'
returning id;  -- expect: 0 rows (RLS filters the update)
rollback to savepoint s2d;
reset role;

-- 3) Someone else can neither change the project's tags nor see the owner's request
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000a2"}';
delete from public.project_tags where project_id = '00000000-0000-0000-0000-0000000000b1'
returning tag_id;  -- expect: 0 rows
savepoint s3a;
insert into public.project_tags (project_id, tag_id, added_by)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'user');  -- expect: ERROR new row violates row-level security policy
rollback to savepoint s3a;
select count(*) from public.tag_requests;  -- expect: 0
reset role;

-- 4) An admin sees the request, approves it and adds the tag
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000a3"}';
select label, status from public.tag_requests;  -- expect: Solar cooking | pending
insert into public.tags (slug, label, origin) values ('solar-cooking', 'Solar cooking', 'admin') returning slug;  -- expect: solar-cooking
update public.tag_requests set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
where label = 'Solar cooking' returning status;  -- expect: approved
reset role;

-- 5) Bad values are rejected
savepoint s5;
insert into public.tags (slug, label, origin) values ('Bad Slug!', 'Bad', 'admin');  -- expect: ERROR violates check constraint
rollback to savepoint s5;

rollback;
