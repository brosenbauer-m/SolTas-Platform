-- Migration: project_goals_sync
-- Created: 2026-10-28
--
-- PROBLEM:
--   Projects carry their goals twice: the form writes project_sdgs / project_ifrc_challenges (join
--   tables), the IATI import writes projects.sdgs (text[] of goal numbers), and the arrays
--   projects.sdgs / projects.ifrc_global_challenges were never filled for community projects. So the
--   project page and Find Projects had no single place to read or filter goals from.
--
-- FIX:
--   1) The arrays become the one place to read from: a trigger keeps projects.sdgs (goal numbers as
--      text, "1".."17") and projects.ifrc_global_challenges (ifrc_challenges.code) equal to the join
--      tables whenever those change. SECURITY DEFINER, because an editor who may add a goal is not
--      always allowed to update the projects row directly.
--   2) Backfill both arrays for community projects from the join tables (imported projects keep the
--      goals the import writes).
--   3) GIN indexes on the two arrays for the Find Projects filters.
--   4) IFRC Global Challenges: two names used the singular ("crisis"); they follow IFRC Strategy 2030
--      wording now, and issues that stored the old names are updated too.

begin;

-- ---------------------------------------------------------------------------
-- 1) Trigger: join tables -> arrays on projects
-- ---------------------------------------------------------------------------

create or replace function public.sync_project_goal_arrays()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid := coalesce(new.project_id, old.project_id);
begin
  if tg_table_name = 'project_sdgs' then
    update public.projects p
    set sdgs = coalesce(
      (select array_agg(s.sdg_id::text order by s.sdg_id) from public.project_sdgs s where s.project_id = pid),
      array[]::text[]
    )
    where p.id = pid;
  else
    update public.projects p
    set ifrc_global_challenges = coalesce(
      (
        select array_agg(c.code order by c.id)
        from public.project_ifrc_challenges pc
        join public.ifrc_challenges c on c.id = pc.challenge_id
        where pc.project_id = pid
      ),
      array[]::text[]
    )
    where p.id = pid;
  end if;
  return null;
end;
$$;

revoke all on function public.sync_project_goal_arrays() from public;

drop trigger if exists trg_sync_project_sdgs on public.project_sdgs;
create trigger trg_sync_project_sdgs
  after insert or update or delete on public.project_sdgs
  for each row execute function public.sync_project_goal_arrays();

drop trigger if exists trg_sync_project_ifrc on public.project_ifrc_challenges;
create trigger trg_sync_project_ifrc
  after insert or update or delete on public.project_ifrc_challenges
  for each row execute function public.sync_project_goal_arrays();

-- ---------------------------------------------------------------------------
-- 2) IFRC Strategy 2030 names: two of the five were singular ("crisis")
-- ---------------------------------------------------------------------------

update public.ifrc_challenges set name = 'Climate and environmental crises' where code = 'climate_environmental_crisis';
update public.ifrc_challenges set name = 'Evolving crises and disasters' where code = 'evolving_crises_disasters';

-- Issues store the challenge name as text
update public.watchdog_issues
set global_challenges = (
  select array_agg(
    case g
      when 'Climate and environmental crisis' then 'Climate and environmental crises'
      when 'Evolving crisis and disasters' then 'Evolving crises and disasters'
      else g
    end
  )
  from unnest(global_challenges) g
)
where global_challenges && array['Climate and environmental crisis', 'Evolving crisis and disasters'];

-- ---------------------------------------------------------------------------
-- 3) Backfill community projects from the join tables
-- ---------------------------------------------------------------------------

update public.projects p
set sdgs = coalesce(
  (select array_agg(s.sdg_id::text order by s.sdg_id) from public.project_sdgs s where s.project_id = p.id),
  array[]::text[]
)
where p.source = 'community';

update public.projects p
set ifrc_global_challenges = coalesce(
  (
    select array_agg(c.code order by c.id)
    from public.project_ifrc_challenges pc
    join public.ifrc_challenges c on c.id = pc.challenge_id
    where pc.project_id = p.id
  ),
  array[]::text[]
)
where p.source = 'community';

-- ---------------------------------------------------------------------------
-- 4) Indexes for the filters (listed rows only)
-- ---------------------------------------------------------------------------

create index if not exists projects_listed_sdgs_gin
  on public.projects using gin (sdgs)
  where status = 'approved' and visibility = 'public';

create index if not exists projects_listed_ifrc_gin
  on public.projects using gin (ifrc_global_challenges)
  where status = 'approved' and visibility = 'public';

commit;
