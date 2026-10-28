-- Manual tests for 20260324120019_organisation_trust_fields.sql
-- runnable: pnpm db:test
-- Run in the Supabase SQL editor. Everything is rolled back.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e5', 'ou-admin@example.test'),
  ('00000000-0000-0000-0000-0000000000e6', 'ou-member@example.test'),
  ('00000000-0000-0000-0000-0000000000e7', 'ou-stranger@example.test');

set local role service_role;
insert into public.organisations (id, name, verification_status, legal_form, registration_number, founded_year, looking_for)
values ('00000000-0000-0000-0000-0000000000e8', 'Updates test org', 'verified', 'Association', 'VR 12345', 2015, array['funding','partners']);
insert into public.organisation_members (organisation_id, user_id, role, can_post_feed) values
  ('00000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000e5', 'admin', false),
  ('00000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000e6', 'member', false);
reset role;

-- 1) Visitors read the new fields
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select legal_form, registration_number, founded_year, looking_for from public.organisations
  where id = '00000000-0000-0000-0000-0000000000e8';  -- expect: Association | VR 12345 | 2015 | {funding,partners}
reset role;

-- 2) An org admin posts an update; a plain member and a stranger cannot
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000e5"}';
insert into public.organisation_updates (organisation_id, author_user_id, title, body, visibility)
values ('00000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000e5', 'Hello', 'First update', 'public')
returning title;  -- expect: Hello

set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000e6"}';
savepoint s2;
insert into public.organisation_updates (organisation_id, author_user_id, title, body, visibility)
values ('00000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000e6', 'Nope', 'x', 'public');
  -- expect: ERROR new row violates row-level security policy
rollback to savepoint s2;

set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000e7"}';
savepoint s3;
insert into public.organisation_updates (organisation_id, author_user_id, title, body, visibility)
values ('00000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000e7', 'Nope', 'x', 'public');
  -- expect: ERROR new row violates row-level security policy
rollback to savepoint s3;
reset role;

-- 3) A member with posting rights may post
set local role service_role;
update public.organisation_members set can_post_feed = true
  where organisation_id = '00000000-0000-0000-0000-0000000000e8' and user_id = '00000000-0000-0000-0000-0000000000e6';
reset role;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000e6"}';
insert into public.organisation_updates (organisation_id, author_user_id, title, body, visibility)
values ('00000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000e6', 'Allowed', 'x', 'public')
returning title;  -- expect: Allowed
reset role;

-- 4) Invalid values are rejected
set local role service_role;
savepoint s4;
update public.organisations set looking_for = array['money'] where id = '00000000-0000-0000-0000-0000000000e8';
  -- expect: ERROR violates check constraint "organisations_looking_for_check"
rollback to savepoint s4;
reset role;

rollback;
