-- Manual tests for 20260324120013_merge_iati_into_projects.sql
-- runnable: pnpm db:test
-- Run in the Supabase SQL editor. Everything is rolled back.

begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c1', 'merge-user@example.test');

-- 1) The import (service role / direct connection) can add an IATI project owned by the IATI organisation
set local role service_role;
insert into public.projects (name, slug, status, review_status, visibility, owner_type, owner_id, lead_org_id,
                             source, iati_identifier, point_precision, source_data)
values ('Imported test activity', 'iati-test-activity', 'approved', 'approved', 'public', 'organisation',
        'a7a71000-0000-4000-8000-000000000001', 'a7a71000-0000-4000-8000-000000000001',
        'iati', 'XM-TEST-MERGE-1', 'exact', '{"reporting_org": {"name": "Test publisher"}}')
returning source, visibility;  -- expect: iati | public
reset role;

-- 2) Visitors see it like any approved public project
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select name, source from public.projects where iati_identifier = 'XM-TEST-MERGE-1';  -- expect: Imported test activity | iati
reset role;

-- 3) A signed-in user cannot create a project that claims to be imported
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000c1"}';
savepoint s3;
insert into public.projects (name, owner_type, owner_id, created_by, source, iati_identifier)
values ('Fake import', 'user', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'iati', 'XM-FAKE');
-- expect: ERROR Imported-project fields can only be set by the import (or an RLS error)
rollback to savepoint s3;
reset role;

-- 4) ... nor turn their own project into an imported one, but can still edit it normally
insert into public.projects (id, name, owner_type, owner_id, created_by, status)
values ('00000000-0000-0000-0000-0000000000c2', 'Own project', 'user',
        '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'pending');
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000c1"}';
savepoint s4;
update public.projects set iati_identifier = 'XM-HIJACK' where id = '00000000-0000-0000-0000-0000000000c2';
-- expect: ERROR Imported-project fields can only be changed by the import
rollback to savepoint s4;
update public.projects set name = 'Own project renamed' where id = '00000000-0000-0000-0000-0000000000c2'
returning name, source;  -- expect: Own project renamed | community
reset role;

-- 5) Identifiers are unique and IATI rows need one
savepoint s5a;
insert into public.projects (name, owner_type, owner_id, source, iati_identifier)
values ('Dup', 'organisation', 'a7a71000-0000-4000-8000-000000000001', 'iati', 'XM-TEST-MERGE-1');
-- expect: ERROR duplicate key value violates unique constraint "projects_iati_identifier_key"
rollback to savepoint s5a;
savepoint s5b;
insert into public.projects (name, owner_type, owner_id, source)
values ('No id', 'organisation', 'a7a71000-0000-4000-8000-000000000001', 'iati');
-- expect: ERROR violates check constraint "projects_iati_identifier_required"
rollback to savepoint s5b;

-- 6) The IATI system organisation exists, is verified, and is not counted in the home stats
select name, verification_status from public.organisations where id = 'a7a71000-0000-4000-8000-000000000001';
-- expect: IATI | verified
select (select count(*) from public.organisations where verification_status = 'verified')
       - (select projects_organisations_registered from public.get_home_stats()) as excluded;  -- expect: 1

rollback;
