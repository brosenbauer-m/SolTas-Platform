-- Migration: organisation_trust_fields
-- Created: 2026-10-28
--
-- WHY:
--   Funders and visitors look for the same signals on an organisation page before they trust it or get in
--   touch: legal form, registration number and registry country, founding year, an annual report, a contact
--   address, and what the organisation is looking for. The profile had none of these.
--
--   Also: any signed-in user could post an update on behalf of any organisation
--   (organisation_updates_insert_author only checked author_user_id = auth.uid()).
--
-- WHAT:
--   1) New optional columns on public.organisations (readable like the other columns; the table has a
--      table-level SELECT grant). Writes go through the existing update policies (creator, org owner/admin,
--      site admin).
--   2) organisation_updates INSERT: the author must be an owner/admin of the organisation or a member with
--      can_post_feed. UPDATE/DELETE stay with the author (and admins).

begin;

-- ---------------------------------------------------------------------------
-- 1) Trust and contact fields
-- ---------------------------------------------------------------------------

alter table public.organisations
  add column if not exists legal_form text,
  add column if not exists registration_number text,
  add column if not exists registration_country text,
  add column if not exists founded_year integer,
  add column if not exists annual_report_url text,
  add column if not exists contact_email text,
  add column if not exists looking_for text[] not null default array[]::text[];

alter table public.organisations drop constraint if exists organisations_founded_year_check;
alter table public.organisations
  add constraint organisations_founded_year_check
  check (founded_year is null or (founded_year between 1000 and 2100));

alter table public.organisations drop constraint if exists organisations_looking_for_check;
alter table public.organisations
  add constraint organisations_looking_for_check
  check (looking_for <@ array['funding', 'partners', 'volunteers']::text[]);

comment on column public.organisations.legal_form is 'e.g. registered charity, association, foundation, NGO, social enterprise';
comment on column public.organisations.registration_number is 'official registry or charity number, shown publicly';
comment on column public.organisations.looking_for is 'subset of funding, partners, volunteers';

-- ---------------------------------------------------------------------------
-- 2) Only members with posting rights publish organisation updates
-- ---------------------------------------------------------------------------

drop policy if exists organisation_updates_insert_author on public.organisation_updates;
create policy organisation_updates_insert_author
  on public.organisation_updates
  for insert
  to authenticated
  with check (
    author_user_id = auth.uid()
    and exists (
      select 1
      from public.organisation_members m
      where m.organisation_id = organisation_updates.organisation_id
        and m.user_id = auth.uid()
        and (m.role in ('owner', 'admin') or m.can_post_feed)
    )
  );

commit;
