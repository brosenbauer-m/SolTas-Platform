-- Migration: fix_list_timeouts
-- Created: 2026-10-28
--
-- PROBLEM (production, Vercel runtime errors since the IATI import grew to ~25k projects):
--   /projects and /find-organisations fail for visitors with "canceling statement due to
--   statement timeout" (anon statements are limited to 3 s on Supabase).
--
--   1) Find Projects sorts by created_at (and the other sort columns) without an index, so
--      Postgres materialises all 25k listed rows, evaluating the `tag_list` embed, and with it
--      the project_tags policy function user_can_view_project(project_id), for every one of
--      them before it can sort and keep 25 (1.4 s warm, more when cold).
--   2) organisations_directory_v1 counts projects per organisation through the projects RLS
--      policy. The IATI system organisation leads ~25k projects, so its two counts run the
--      per-row policy function over the whole table (3.1 s), although that organisation is
--      hidden from the directory anyway.
--
-- FIX:
--   1) Partial indexes on the listed rows (status = 'approved' and visibility = 'public') for
--      every sort column of Find Projects, so sorting walks an index and stops after one page.
--   2) project_tags SELECT policy: a plain subquery on public.projects (whose own policy
--      decides what is visible) instead of a function call per row. Same visibility, cheaper.
--   3) organisations_directory_v1 takes its project counts from a SECURITY DEFINER function
--      that counts only approved, public projects (public knowledge, so bypassing RLS leaks
--      nothing), and leaves out the IATI system organisation.

begin;

-- ---------------------------------------------------------------------------
-- 1) Indexes for the Find Projects sorts (listed rows only)
-- ---------------------------------------------------------------------------

create index if not exists projects_listed_created_at_idx
  on public.projects (created_at desc)
  where status = 'approved' and visibility = 'public';

create index if not exists projects_listed_name_idx
  on public.projects (name)
  where status = 'approved' and visibility = 'public';

create index if not exists projects_listed_amount_needed_idx
  on public.projects (amount_needed)
  where status = 'approved' and visibility = 'public';

create index if not exists projects_listed_donations_received_idx
  on public.projects (donations_received)
  where status = 'approved' and visibility = 'public';

create index if not exists projects_listed_start_date_idx
  on public.projects (start_date)
  where status = 'approved' and visibility = 'public';

create index if not exists projects_listed_end_date_idx
  on public.projects (end_date)
  where status = 'approved' and visibility = 'public';

-- ---------------------------------------------------------------------------
-- 2) project_tags: visible when the project is visible (subquery, no per-row function)
-- ---------------------------------------------------------------------------

drop policy if exists project_tags_select_visible on public.project_tags;
create policy project_tags_select_visible on public.project_tags
  for select to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_tags.project_id));

-- ---------------------------------------------------------------------------
-- 3) Organisation directory counts without per-row RLS
-- ---------------------------------------------------------------------------

-- Counts of an organisation's listed projects (approved and public). SECURITY DEFINER so the
-- count does not run the projects policy per row; it only ever counts public rows.
create or replace function public.listed_project_counts(org_id uuid)
returns table (total integer, ongoing integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*)::int as total,
    count(*) filter (where p.end_date is null or p.end_date >= current_date)::int as ongoing
  from public.projects p
  where p.lead_org_id = org_id
    and p.status = 'approved'
    and coalesce(p.visibility, 'public') = 'public';
$$;

revoke all on function public.listed_project_counts(uuid) from public;
grant execute on function public.listed_project_counts(uuid) to anon, authenticated, service_role;

create or replace view public.organisations_directory_v1
with (security_invoker = true)
as
select
  o.id,
  o.name,
  coalesce(o.description, o.what_we_do) as description,
  o.website,
  coalesce(o.based_in_country, o.country_based, o.country) as based_in_country,
  o.based_in_region,
  o.thematic_tags,
  o.intervention_tags,
  o.demographic_tags,
  o.funding_needed,
  coalesce(o.founded_at, o.created_at::date) as founded_at,
  date_part('year', age(current_date, coalesce(o.founded_at, o.created_at::date)))::int as age_years,
  o.lat,
  o.lng,
  (
    select count(*)
    from public.follow_edges f
    where f.target_type = 'org' and f.target_org_id = o.id
  ) as followers_count,
  c.total::bigint as projects_total_count,
  c.ongoing::bigint as projects_ongoing_count
from public.organisations o
cross join lateral public.listed_project_counts(o.id) c
-- The IATI system organisation only owns imported projects and has no page (src/lib/iati/systemOrg.ts).
where o.id <> 'a7a71000-0000-4000-8000-000000000001';

grant select on public.organisations_directory_v1 to anon, authenticated;

commit;
