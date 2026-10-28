-- Manual tests for 20260324120022_grants_applicant_types.sql
-- runnable: pnpm db:test
-- Run in the Supabase SQL editor. Everything is rolled back.

begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d9', 'grant-owner@example.test');

set local role service_role;
insert into public.grants (id, title, slug, application_url, funding_type, project_type, currency, status, owner_type, owner_id, created_by,
                           is_published, moderation_status, applicant_types)
values ('00000000-0000-0000-0000-0000000000e9', 'Applicant test grant', 'applicant-test-grant', 'https://example.org/apply', 'grant', 'both',
        'EUR', 'open', 'user', '00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000d9', true, 'approved',
        array['ngo', 'grassroots_group']);
savepoint s0;
update public.grants set applicant_types = array['aliens'] where id = '00000000-0000-0000-0000-0000000000e9';
  -- expect: ERROR violates check constraint "grants_applicant_types_check"
rollback to savepoint s0;
reset role;

-- Visitors read the column (and still not notes_internal)
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select applicant_types from public.grants where slug = 'applicant-test-grant';  -- expect: {ngo,grassroots_group}
select count(*) from public.grants where slug = 'applicant-test-grant' and applicant_types && array['ngo'];  -- expect: 1
savepoint s1;
select notes_internal from public.grants where slug = 'applicant-test-grant';  -- expect: ERROR permission denied
rollback to savepoint s1;
reset role;

rollback;
