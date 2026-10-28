-- Manual tests for 20260324120025_follow_notifications_orgs.sql
-- runnable: pnpm db:test
-- Run in the Supabase SQL editor. Everything is rolled back.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000ad', 'fn-admin@example.test'),
  ('00000000-0000-0000-0000-0000000000ae', 'fn-follower@example.test'),
  ('00000000-0000-0000-0000-0000000000af', 'fn-creator@example.test');
insert into public.profiles (id) values
  ('00000000-0000-0000-0000-0000000000ad'), ('00000000-0000-0000-0000-0000000000ae'), ('00000000-0000-0000-0000-0000000000af')
on conflict (id) do nothing;
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000ad', 'admin');

set local role service_role;
insert into public.organisations (id, name, verification_status)
values ('00000000-0000-0000-0000-0000000000be', 'Notify org', 'verified');
insert into public.organisation_members (organisation_id, user_id, role)
values ('00000000-0000-0000-0000-0000000000be', '00000000-0000-0000-0000-0000000000ad', 'admin');
insert into public.follow_edges (follower_user_id, target_type, target_org_id)
values ('00000000-0000-0000-0000-0000000000ae', 'org', '00000000-0000-0000-0000-0000000000be');
delete from public.notifications where user_id in ('00000000-0000-0000-0000-0000000000ae', '00000000-0000-0000-0000-0000000000af');

-- 1) An organisation update notifies the follower, not the author
insert into public.organisation_updates (organisation_id, author_user_id, title, body, visibility)
values ('00000000-0000-0000-0000-0000000000be', '00000000-0000-0000-0000-0000000000ad', 'Annual report out', 'x', 'public');
select user_id, type, title from public.notifications where type = 'organisation_update_published' order by created_at desc limit 2;
  -- expect: 1 row, follower ae, "New update from Notify org"

-- 2) Approving a community project notifies its creator and the organisation's followers
insert into public.projects (id, name, slug, status, review_status, visibility, owner_type, owner_id, created_by, lead_org_id)
values ('00000000-0000-0000-0000-0000000000cf', 'Notify project', 'notify-project', 'pending', 'pending', 'public',
        'organisation', '00000000-0000-0000-0000-0000000000be', '00000000-0000-0000-0000-0000000000af', '00000000-0000-0000-0000-0000000000be');
reset role;
-- approval is an admin action (enforce_moderation_by_admin)
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000ad"}';
update public.projects set status = 'approved' where id = '00000000-0000-0000-0000-0000000000cf';
reset role;
set local role service_role;
select user_id, type from public.notifications
  where type in ('project_approved', 'organisation_project_published') order by type;
  -- expect: ae organisation_project_published / af project_approved
-- a second save with the same status sends nothing new
update public.projects set name = 'Notify project 2' where id = '00000000-0000-0000-0000-0000000000cf';
select count(*) from public.notifications where type in ('project_approved', 'organisation_project_published');  -- expect: 2
reset role;

rollback;
