-- Migration: grants_applicant_types
-- Created: 2026-10-28
--
-- WHY (blueprint "Find Funding": eligible applicant type):
--   Funders state who may apply; applicants filter by it first. Grant listings had countries but no
--   applicant type.
--
-- WHAT:
--   grants.applicant_types: a subset of a fixed list, so it can be filtered and shown as chips.
--   Readable like the other grant columns (the column-level SELECT grant from
--   20260324120011_hide_grant_internal_notes.sql is extended). Writes go through the existing policies.

begin;

alter table public.grants
  add column if not exists applicant_types text[] not null default array[]::text[];

alter table public.grants drop constraint if exists grants_applicant_types_check;
alter table public.grants
  add constraint grants_applicant_types_check
  check (applicant_types <@ array[
    'ngo', 'grassroots_group', 'social_enterprise', 'research_institution', 'local_government', 'individual', 'company', 'other'
  ]::text[]);

comment on column public.grants.applicant_types is 'who may apply: subset of ngo, grassroots_group, social_enterprise, research_institution, local_government, individual, company, other';

-- grants uses column-level SELECT grants (notes_internal stays hidden): add the new column for readers
grant select (applicant_types) on public.grants to anon, authenticated;

commit;
