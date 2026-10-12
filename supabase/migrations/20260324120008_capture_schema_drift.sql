-- Migration: capture_schema_drift
-- Created: 2026-10-12
--
-- Captures objects that exist in the production database but were never created
-- by a file in supabase/migrations (source: read-only schema export of prod,
-- 2026-10-12). Everything here is idempotent and reproduces prod exactly, so on
-- production this migration changes nothing. Behaviour is deliberately NOT
-- changed here; overly broad policies are flagged inline and proposals for
-- tightening them are in docs/schema-drift.md.
--
-- Not included (already handled elsewhere):
--   * "projects read", projects_public_read_approved_or_owner -> dropped in 20260324120004
--   * org_members_insert_self_owner, organisations_insert_own,
--     orgs_authenticated_insert -> dropped in 20260324120007
--
-- NOTE: a brand-new database still cannot be built from the migration chain alone,
-- because the baseline migration (20250919085607_baseline.sql) is empty and
-- early migrations depend on tables it should have created (e.g. profiles).
-- See docs/schema-drift.md, "Fresh databases".

begin;

-- ---------------------------------------------------------------------------
-- 1) Tables (legacy: created by hand before the migration history)
-- ---------------------------------------------------------------------------

create table if not exists public.admin_emails (
  email extensions.citext not null,
  added_by uuid default auth.uid(),
  added_at timestamp with time zone default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admin_emails_pkey' and conrelid = 'public.admin_emails'::regclass) then
    alter table public.admin_emails add constraint admin_emails_pkey PRIMARY KEY (email);
  end if;
end $$;
alter table public.admin_emails enable row level security;

create table if not exists public.app_settings (
  id boolean default true not null,
  superadmin_email extensions.citext not null
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'app_settings_pkey' and conrelid = 'public.app_settings'::regclass) then
    alter table public.app_settings add constraint app_settings_pkey PRIMARY KEY (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'app_settings_id_check' and conrelid = 'public.app_settings'::regclass) then
    alter table public.app_settings add constraint app_settings_id_check CHECK (id);
  end if;
end $$;
alter table public.app_settings enable row level security;

create table if not exists public.organisation_members (
  organisation_id uuid not null,
  user_id uuid not null,
  role text not null,
  created_at timestamp with time zone default now(),
  can_create_projects boolean default false not null,
  can_create_funding boolean default false not null,
  can_create_issues boolean default false not null,
  can_post_feed boolean default false not null,
  can_manage_members boolean default false not null
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'organisation_members_pkey' and conrelid = 'public.organisation_members'::regclass) then
    alter table public.organisation_members add constraint organisation_members_pkey PRIMARY KEY (organisation_id, user_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'organisation_members_organisation_id_fkey' and conrelid = 'public.organisation_members'::regclass) then
    alter table public.organisation_members add constraint organisation_members_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id) ON DELETE CASCADE;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'organisation_members_user_id_fkey' and conrelid = 'public.organisation_members'::regclass) then
    alter table public.organisation_members add constraint organisation_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'organisation_members_role_check' and conrelid = 'public.organisation_members'::regclass) then
    alter table public.organisation_members add constraint organisation_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])));
  end if;
end $$;
create index if not exists organisation_members_org_user_idx ON public.organisation_members USING btree (organisation_id, user_id);
create index if not exists organisation_members_org_role_idx ON public.organisation_members USING btree (organisation_id, role);
alter table public.organisation_members enable row level security;

create table if not exists public.watchdog_cases (
  id uuid default gen_random_uuid() not null,
  title text not null,
  description text,
  location text,
  country text,
  region text,
  lat double precision,
  lng double precision,
  target_demographics text[],
  links jsonb,
  sdgs text[],
  ifrc_global_challenges text[],
  review_status text default 'pending'::text not null,
  created_by uuid,
  created_at timestamp with time zone default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'watchdog_cases_pkey' and conrelid = 'public.watchdog_cases'::regclass) then
    alter table public.watchdog_cases add constraint watchdog_cases_pkey PRIMARY KEY (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'watchdog_cases_created_by_fkey' and conrelid = 'public.watchdog_cases'::regclass) then
    alter table public.watchdog_cases add constraint watchdog_cases_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'watchdog_cases_review_status_check' and conrelid = 'public.watchdog_cases'::regclass) then
    alter table public.watchdog_cases add constraint watchdog_cases_review_status_check CHECK ((review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
  end if;
end $$;
alter table public.watchdog_cases enable row level security;

-- ---------------------------------------------------------------------------
-- 2) Functions
-- ---------------------------------------------------------------------------

-- Creates the profile row for a new auth user (trigger on auth.users, managed outside the public schema).
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_deleting_last_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (select count(*) from public.admin_emails) <= 1 then
    raise exception 'cannot delete the last admin';
  end if;
  return old;
end;
$function$
;

-- Reads profiles.role; role changes are restricted to superadmins since 20260324120006.
CREATE OR REPLACE FUNCTION public.is_moderator()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','superadmin')
  );
$function$
;

-- Not used by the app (admin API routes update projects directly).
CREATE OR REPLACE FUNCTION public.approve_project(p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_moderator() then
    raise exception 'Not allowed';
  end if;

  update public.projects
     set status = 'approved',
         approved_at = now(),
         approved_by = auth.uid()
   where id = p_project_id;
end;
$function$
;

-- Not used by the app. NOTE: sets approved_at/approved_by instead of rejected_at/rejected_by (see docs/schema-drift.md).
CREATE OR REPLACE FUNCTION public.reject_project(p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_moderator() then
    raise exception 'Not allowed';
  end if;

  update public.projects
     set status = 'rejected',
         approved_at = now(),
         approved_by = auth.uid()
   where id = p_project_id;
end;
$function$
;

-- Not used by the app; sets the legacy profiles.role (permissions use user_roles).
CREATE OR REPLACE FUNCTION public.grant_admin(p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
begin
  if not public.is_superadmin() then
    raise exception 'Not allowed';
  end if;

  select u.id into v_user_id
    from auth.users u
   where lower(u.email) = lower(p_email)
   limit 1;

  if v_user_id is null then
    raise exception 'User with email % not found', p_email;
  end if;

  update public.profiles
     set role = 'admin'
   where id = v_user_id;
end;
$function$
;

-- Not used by the app; see grant_admin.
CREATE OR REPLACE FUNCTION public.revoke_admin(p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
begin
  if not public.is_superadmin() then
    raise exception 'Not allowed';
  end if;

  select u.id into v_user_id
    from auth.users u
   where lower(u.email) = lower(p_email)
   limit 1;

  if v_user_id is null then
    raise exception 'User with email % not found', p_email;
  end if;

  update public.profiles
     set role = 'user'
   where id = v_user_id;
end;
$function$
;

-- ---------------------------------------------------------------------------
-- 3) Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists trg_prevent_last_admin_delete on public.admin_emails;
CREATE TRIGGER trg_prevent_last_admin_delete BEFORE DELETE ON public.admin_emails FOR EACH ROW EXECUTE FUNCTION public.prevent_deleting_last_admin();

drop trigger if exists trg_enforce_moderation_by_admin on public.projects;
CREATE TRIGGER trg_enforce_moderation_by_admin BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.enforce_moderation_by_admin();

-- ---------------------------------------------------------------------------
-- 4) Policies (drop + recreate with the exact production definition)
-- ---------------------------------------------------------------------------

drop policy if exists admin_emails_select_admins on public.admin_emails;
create policy admin_emails_select_admins on public.admin_emails
  for select
  to authenticated
  using (is_admin());

drop policy if exists admin_emails_insert_super on public.admin_emails;
create policy admin_emails_insert_super on public.admin_emails
  for insert
  to authenticated
  with check (is_superadmin());

drop policy if exists admin_emails_update_super on public.admin_emails;
create policy admin_emails_update_super on public.admin_emails
  for update
  to authenticated
  using (is_superadmin())
  with check (is_superadmin());

drop policy if exists admin_emails_delete_super on public.admin_emails;
create policy admin_emails_delete_super on public.admin_emails
  for delete
  to authenticated
  using (is_superadmin());

drop policy if exists app_settings_select_super on public.app_settings;
create policy app_settings_select_super on public.app_settings
  for select
  to authenticated
  using (is_superadmin());

drop policy if exists app_settings_insert_super on public.app_settings;
create policy app_settings_insert_super on public.app_settings
  for insert
  to authenticated
  with check (is_superadmin());

drop policy if exists app_settings_update_super on public.app_settings;
create policy app_settings_update_super on public.app_settings
  for update
  to authenticated
  using (is_superadmin())
  with check (is_superadmin());

-- FLAG: legacy duplicate of org_members_update_admin without the can_manage_members check.
drop policy if exists org_members_update_admins on public.organisation_members;
create policy org_members_update_admins on public.organisation_members
  for update
  to public
  using ((EXISTS ( SELECT 1
   FROM organisation_members m3
  WHERE ((m3.organisation_id = organisation_members.organisation_id) AND (m3.user_id = auth.uid()) AND (m3.role = ANY (ARRAY['owner'::text, 'admin'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM organisation_members m4
  WHERE ((m4.organisation_id = organisation_members.organisation_id) AND (m4.user_id = auth.uid()) AND (m4.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));

-- FLAG: lets org admins update their organisation; no WITH CHECK (USING is reused). Moderation fields are guarded by a trigger.
drop policy if exists orgs_members_update on public.organisations;
create policy orgs_members_update on public.organisations
  for update
  to public
  using ((EXISTS ( SELECT 1
   FROM organisation_members m
  WHERE ((m.organisation_id = organisations.id) AND (m.user_id = auth.uid()) AND (m.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));

-- FLAG: USING (true) - everyone, including logged-out visitors, can read every organisation
--       (pending and rejected too), which makes "Public can read verified organisations" moot.
drop policy if exists orgs_public_read on public.organisations;
create policy orgs_public_read on public.organisations
  for select
  to public
  using (true);

-- FLAG: USING (true) - every profile column (incl. date_of_birth, nationality) is public.
--       Duplicates "Public can read profiles" from 20260110195100.
drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles
  for select
  to public
  using (true);

-- FLAG: duplicates "Users can update own profile" but skips its verified-organisation check on organisation_id.
drop policy if exists profiles_user_update_self on public.profiles;
create policy profiles_user_update_self on public.profiles
  for update
  to public
  using ((auth.uid() = id))
  with check ((auth.uid() = id));

drop policy if exists "profiles role updates by superadmin" on public.profiles;
create policy "profiles role updates by superadmin" on public.profiles
  for update
  to authenticated
  using (is_superadmin())
  with check (is_superadmin());

drop policy if exists "projects approval updates by moderators" on public.projects;
create policy "projects approval updates by moderators" on public.projects
  for update
  to authenticated
  using (is_moderator())
  with check (is_moderator());

-- FLAG: uses the legacy created_by/review_status columns; review_status is never updated, so the original
--       creator can edit the project forever (incl. owner_type/owner_id), even after leaving the organisation.
drop policy if exists projects_update_owner_while_pending on public.projects;
create policy projects_update_owner_while_pending on public.projects
  for update
  to public
  using (((auth.uid() = created_by) AND (review_status = 'pending'::text)))
  with check ((auth.uid() = created_by));

-- Legacy table, replaced by watchdog_issues (see docs/schema-drift.md).
drop policy if exists wd_public_read_approved_or_owner on public.watchdog_cases;
create policy wd_public_read_approved_or_owner on public.watchdog_cases
  for select
  to public
  using (((review_status = 'approved'::text) OR (auth.uid() = created_by)));

drop policy if exists wd_insert_auth on public.watchdog_cases;
create policy wd_insert_auth on public.watchdog_cases
  for insert
  to authenticated
  with check ((auth.uid() = created_by));

drop policy if exists wd_update_owner_while_pending on public.watchdog_cases;
create policy wd_update_owner_while_pending on public.watchdog_cases
  for update
  to public
  using (((auth.uid() = created_by) AND (review_status = 'pending'::text)))
  with check ((auth.uid() = created_by));

-- ---------------------------------------------------------------------------
-- 5) rejected_projects view (prod was recreated by hand after category/slug were added)
-- ---------------------------------------------------------------------------

drop view if exists public.rejected_projects;
create view public.rejected_projects
with (security_invoker = true)
as
 SELECT id,
    name,
    description,
    links,
    lead_org_id,
    partner_org_ids,
    country,
    region,
    lat,
    lng,
    intervention_type,
    target_demographics,
    lives_improved,
    start_date,
    end_date,
    thematic_area,
    sdgs,
    ifrc_global_challenges,
    donations_received,
    amount_needed,
    lifecycle_status,
    review_status,
    created_by,
    created_at,
    status,
    approved_at,
    approved_by,
    rejected_at,
    rejected_by,
    rejection_reason,
    place_name,
    type_of_intervention,
    target_demographic,
    currency,
    category,
    slug
   FROM public.projects
  WHERE status = 'rejected'::text;

grant select on public.rejected_projects to anon, authenticated;

commit;
