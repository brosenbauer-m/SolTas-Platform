-- Migration: project_metrics
-- Created: 2026-10-28
--
-- WHY (blueprint "Impact metrics"):
--   Each project defines what it counts (people reached, trees planted, trainings held …) and updates
--   the number over time. The sector separates outputs (what was delivered) from outcomes (what changed)
--   and expects every figure to carry a date and to be marked as self-reported.
--
-- WHAT:
--   public.project_metrics: one row per metric per project, with a fixed unit list (so figures can be
--   summed across projects on organisation pages) plus "other" with a free label, a kind
--   (output/outcome), the current value and the date it is valid for.
--   RLS: visible when the project is visible (subquery on projects, like project_tags); editors of the
--   project (user_can_edit_project, SECURITY DEFINER) add, change and remove rows.

begin;

create table if not exists public.project_metrics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  -- what is measured, in the project's own words, e.g. "Households with clean water"
  label text not null check (length(trim(label)) between 2 and 120),
  -- fixed unit list, so the same unit adds up across projects; "other" keeps the label as the unit
  unit text not null check (unit in (
    'people', 'households', 'children', 'women_and_girls', 'volunteers', 'jobs',
    'trees', 'hectares', 'tonnes_co2e', 'litres_water_per_day', 'kwh',
    'trainings', 'facilities', 'kits', 'meals', 'other'
  )),
  kind text not null default 'output' check (kind in ('output', 'outcome')),
  value numeric not null check (value >= 0),
  -- the date the value is valid for ("as of")
  as_of date not null default current_date,
  note text check (note is null or length(note) <= 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_metrics_project_idx on public.project_metrics (project_id);

drop trigger if exists trg_project_metrics_updated_at on public.project_metrics;
create trigger trg_project_metrics_updated_at
  before update on public.project_metrics
  for each row execute function public.set_updated_at();

alter table public.project_metrics enable row level security;

grant select on public.project_metrics to anon, authenticated;
grant insert, update, delete on public.project_metrics to authenticated;
grant all on public.project_metrics to service_role;

drop policy if exists project_metrics_select_visible on public.project_metrics;
create policy project_metrics_select_visible on public.project_metrics
  for select to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_metrics.project_id));

drop policy if exists project_metrics_insert_editor on public.project_metrics;
create policy project_metrics_insert_editor on public.project_metrics
  for insert to authenticated
  with check (created_by = auth.uid() and public.user_can_edit_project(project_id));

drop policy if exists project_metrics_update_editor on public.project_metrics;
create policy project_metrics_update_editor on public.project_metrics
  for update to authenticated
  using (public.user_can_edit_project(project_id))
  with check (public.user_can_edit_project(project_id));

drop policy if exists project_metrics_delete_editor on public.project_metrics;
create policy project_metrics_delete_editor on public.project_metrics
  for delete to authenticated
  using (public.user_can_edit_project(project_id));

commit;
