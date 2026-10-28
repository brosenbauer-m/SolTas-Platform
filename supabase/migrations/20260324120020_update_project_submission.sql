-- Migration: update_project_submission
-- Created: 2026-10-28
--
-- PROBLEM:
--   Saving a project edit ran as six separate statements from the API route: update the row, delete
--   links / partners / SDGs / IFRC challenges, insert them again. A failure in a later step left the
--   project without its links or partners. Worse, the child tables only let the creator change rows
--   while the project is still pending (project_links_*, project_sdgs_owner_* …), so editing an
--   approved project silently lost its goals and partners, or failed half-way.
--
-- FIX:
--   One function does the whole save in one transaction, with the same permission the API route
--   already checked (public.user_can_edit_project: owner, org admin, editor collaborator, site admin).
--   SECURITY DEFINER so the child rows can be replaced for approved projects too; it never touches
--   status, visibility, ownership or the import columns, and only accepts community projects.

begin;

create or replace function public.update_project_submission(
  p_id uuid,
  p_category text,
  p_name text,
  p_description text,
  p_lead_org_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_place_name text,
  p_type_of_intervention text[],
  p_target_demographic text,
  p_lives_improved integer,
  p_start_date date,
  p_end_date date,
  p_thematic_area text[],
  p_donations_received numeric,
  p_amount_needed numeric,
  p_currency text,
  p_links jsonb,
  p_partner_org_ids uuid[],
  p_sdg_ids integer[],
  p_ifrc_ids integer[]
)
returns table (id uuid, slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text;
  link_item jsonb;
begin
  if auth.uid() is null or not public.user_can_edit_project(p_id) then
    raise exception 'You cannot edit this project' using errcode = '42501';
  end if;

  select p.source into v_source from public.projects p where p.id = p_id;
  if v_source is null then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;
  if v_source <> 'community' then
    raise exception 'Imported projects are maintained by their publisher' using errcode = '42501';
  end if;

  if p_category not in ('humanitarian', 'environmental') then
    raise exception 'Invalid category' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'Name is too short' using errcode = '22023';
  end if;
  if p_start_date is not null and p_end_date is not null and p_end_date < p_start_date then
    raise exception 'End date is before the start date' using errcode = '22023';
  end if;

  update public.projects p
  set
    category = p_category,
    name = trim(p_name),
    description = nullif(trim(coalesce(p_description, '')), ''),
    lead_org_id = p_lead_org_id,
    lat = p_lat,
    lng = p_lng,
    place_name = p_place_name,
    type_of_intervention = coalesce(p_type_of_intervention, array[]::text[]),
    target_demographic = nullif(trim(coalesce(p_target_demographic, '')), ''),
    lives_improved = p_lives_improved,
    start_date = p_start_date,
    end_date = p_end_date,
    thematic_area = coalesce(p_thematic_area, array[]::text[]),
    donations_received = p_donations_received,
    amount_needed = p_amount_needed,
    currency = upper(coalesce(nullif(trim(coalesce(p_currency, '')), ''), 'USD'))
  where p.id = p_id;

  delete from public.project_links l where l.project_id = p_id;
  if p_links is not null then
    for link_item in select * from jsonb_array_elements(p_links)
    loop
      if link_item ? 'url' and length(trim(link_item->>'url')) > 0 then
        insert into public.project_links (project_id, url, label)
        values (p_id, trim(link_item->>'url'), nullif(trim(coalesce(link_item->>'label', '')), ''));
      end if;
    end loop;
  end if;

  delete from public.project_partners pp where pp.project_id = p_id;
  if coalesce(array_length(p_partner_org_ids, 1), 0) > 0 then
    insert into public.project_partners (project_id, organisation_id)
    select distinct p_id, unnest(p_partner_org_ids);
  end if;

  delete from public.project_sdgs s where s.project_id = p_id;
  if coalesce(array_length(p_sdg_ids, 1), 0) > 0 then
    insert into public.project_sdgs (project_id, sdg_id)
    select distinct p_id, g from unnest(p_sdg_ids) g where g between 1 and 17;
  end if;

  delete from public.project_ifrc_challenges c where c.project_id = p_id;
  if coalesce(array_length(p_ifrc_ids, 1), 0) > 0 then
    insert into public.project_ifrc_challenges (project_id, challenge_id)
    select distinct p_id, i from unnest(p_ifrc_ids) i
    where exists (select 1 from public.ifrc_challenges ch where ch.id = i);
  end if;

  return query select p.id, p.slug from public.projects p where p.id = p_id;
end;
$$;

revoke all on function public.update_project_submission(
  uuid, text, text, text, uuid, double precision, double precision, text, text[], text, integer, date, date,
  text[], numeric, numeric, text, jsonb, uuid[], integer[], integer[]
) from public, anon;
grant execute on function public.update_project_submission(
  uuid, text, text, text, uuid, double precision, double precision, text, text[], text, integer, date, date,
  text[], numeric, numeric, text, jsonb, uuid[], integer[], integer[]
) to authenticated;

commit;
