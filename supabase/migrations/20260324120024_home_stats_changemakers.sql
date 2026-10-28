-- Migration: home_stats_changemakers
-- Created: 2026-10-28
--
-- WHY (blueprint "Home | key figures"): the home page should show the number of changemakers (people
--   involved in a project or an issue) and the lives improved, next to projects and organisations.
--   "Donations received" was always €0 (no donation flow yet) and is dropped from the figures.
--
-- WHAT: get_home_stats() gains
--   projects_changemakers    distinct people who own or created a published project or issue, or belong
--                            to a verified organisation
--   projects_lives_improved  sum of the self-reported "lives improved" of published community projects
--   The return type changes, so the function is dropped and recreated (same name, same grants).

begin;

drop function if exists public.get_home_stats();

create function public.get_home_stats()
returns table(
  updated_at timestamp with time zone,
  projects_projects_approved bigint,
  projects_projects_ongoing bigint,
  projects_organisations_registered bigint,
  projects_changemakers bigint,
  projects_lives_improved numeric,
  projects_donations_received_eur numeric,
  funding_opportunities_total bigint,
  funding_funders_registered bigint,
  funding_open_calls bigint,
  issues_issues_total bigint,
  issues_issues_open bigint
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  select
    pg_catalog.now() as updated_at,
    (
      select pg_catalog.count(*)
      from public.projects
      where status = 'approved'
        and visibility in ('public', 'unlisted')
    ) as projects_projects_approved,
    (
      select pg_catalog.count(*)
      from public.projects
      where status = 'approved'
        and visibility in ('public', 'unlisted')
        and (end_date is null or end_date >= current_date)
    ) as projects_projects_ongoing,
    (
      select pg_catalog.count(*)
      from public.organisations
      where verification_status = 'verified'
        and id <> 'a7a71000-0000-4000-8000-000000000001'
    ) as projects_organisations_registered,
    (
      select pg_catalog.count(distinct u)
      from (
        select owner_id as u from public.projects
          where status = 'approved' and owner_type = 'user' and source = 'community'
        union all
        select created_by from public.projects
          where status = 'approved' and source = 'community' and created_by is not null
        union all
        select created_by from public.watchdog_issues where status = 'approved'
        union all
        select m.user_id from public.organisation_members m
          join public.organisations o on o.id = m.organisation_id
          where o.verification_status = 'verified' and o.id <> 'a7a71000-0000-4000-8000-000000000001'
      ) people
    ) as projects_changemakers,
    (
      select coalesce(pg_catalog.sum(lives_improved), 0::numeric)
      from public.projects
      where status = 'approved'
        and visibility in ('public', 'unlisted')
        and source = 'community'
    ) as projects_lives_improved,
    (
      select coalesce(pg_catalog.sum(donations_received), 0::numeric)
      from public.projects
      where status = 'approved'
        and visibility in ('public', 'unlisted')
        and currency = 'EUR'
    ) as projects_donations_received_eur,
    (
      select pg_catalog.count(*)
      from public.grants
      where is_published = true
        and status in ('open', 'rolling')
    ) as funding_opportunities_total,
    (
      select pg_catalog.count(distinct funder_name)
      from public.grants
      where is_published = true
        and status in ('open', 'rolling')
        and funder_name is not null
        and funder_name <> ''
    ) as funding_funders_registered,
    (
      select pg_catalog.count(*)
      from public.grants
      where is_published = true
        and status = 'open'
    ) as funding_open_calls,
    (
      select pg_catalog.count(*)
      from public.watchdog_issues
      where status = 'approved'
    ) as issues_issues_total,
    (
      select pg_catalog.count(*)
      from public.watchdog_issues
      where status = 'approved'
        and urgency >= 4
    ) as issues_issues_open;
$function$;

-- Aggregates only (counts and sums over published rows), so SECURITY DEFINER leaks nothing and the
-- 25k-row scans don't run the per-row project policy for visitors.
revoke all on function public.get_home_stats() from public;
grant execute on function public.get_home_stats() to anon, authenticated, service_role;

commit;
