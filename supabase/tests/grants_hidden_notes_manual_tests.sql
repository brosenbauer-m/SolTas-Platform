-- Manual tests for 20260324120011_hide_grant_internal_notes.sql and the admin approve/reject routes
-- runnable: pnpm db:test
-- Run in the Supabase SQL editor. Everything is rolled back.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'grant-owner@example.test'),
  ('00000000-0000-0000-0000-0000000000d2', 'grant-admin@example.test');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000d2', 'admin');
insert into public.grants (id, created_by, title, slug, application_url, funding_type, project_type,
                           owner_type, owner_id, notes_internal)
values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', 'Test grant',
        'test-grant-hidden-notes', 'https://example.org/apply', 'grant', 'both',
        'user', '00000000-0000-0000-0000-0000000000d1', 'secret admin note');

-- 1) Admin approves the way /api/admin/grants/[id]/approve does: moderation + publish, status untouched
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000d2"}';
update public.grants
   set moderation_status = 'approved', is_published = true, approved_at = now(),
       approved_by = auth.uid(), rejected_at = null, rejected_by = null, rejection_reason = null
 where id = '00000000-0000-0000-0000-0000000000e1'
returning moderation_status, is_published, status;  -- expect: approved | t | open
reset role;

-- 2) Anonymous visitors can read the published grant ...
set local role anon;
select title from public.grants where id = '00000000-0000-0000-0000-0000000000e1';  -- expect: Test grant

-- 3) ... but not its internal notes
savepoint s3;
select notes_internal from public.grants where id = '00000000-0000-0000-0000-0000000000e1';  -- expect: ERROR permission denied
rollback to savepoint s3;
reset role;

-- 4) Signed-in users cannot read internal notes either
savepoint s4;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000d1"}';
select notes_internal from public.grants where id = '00000000-0000-0000-0000-0000000000e1';  -- expect: ERROR permission denied
rollback to savepoint s4;
reset role;

-- 5) Admin rejects the way the reject route does: unpublished, status untouched
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000d2"}';
update public.grants
   set moderation_status = 'rejected', is_published = false, rejected_at = now(),
       rejected_by = auth.uid(), rejection_reason = 'test', approved_at = null, approved_by = null
 where id = '00000000-0000-0000-0000-0000000000e1'
returning moderation_status, is_published, status;  -- expect: rejected | f | open
reset role;

-- 6) The old route values are invalid (why approve/reject failed before)
savepoint s6;
update public.grants set status = 'approved' where id = '00000000-0000-0000-0000-0000000000e1';  -- expect: ERROR violates check constraint "grants_status_check"
rollback to savepoint s6;

rollback;
