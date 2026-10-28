-- Migration: follow_notifications_orgs
-- Created: 2026-10-28
--
-- WHY (blueprint "Subscribe"): people who follow an organisation should hear when it publishes an update
--   or a new project goes live; the person who submitted a project should hear when it is approved. So
--   far only followers of a project were notified, and only about that project's updates.
--
-- WHAT (in-app notifications; emails are a separate, later step):
--   1) organisation_updates INSERT (public, verified organisation) -> followers of the organisation
--   2) projects UPDATE to status = 'approved' (community projects) ->
--        - the person who created it ("Your project is published")
--        - followers of the leading / owning organisation ("New project from <org>")
--   SECURITY DEFINER like the existing notify_project_update_published(); duplicates avoided per person.

begin;

create or replace function public.notify_organisation_update_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_name text;
begin
  if new.visibility <> 'public' then
    return new;
  end if;
  select o.name into org_name
  from public.organisations o
  where o.id = new.organisation_id and o.verification_status = 'verified';
  if org_name is null then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, href, metadata)
  select
    f.follower_user_id,
    'organisation_update_published',
    'New update from ' || org_name,
    new.title,
    '/organisations/' || new.organisation_id::text,
    jsonb_build_object('organisation_id', new.organisation_id, 'update_id', new.id)
  from public.follow_edges f
  where f.target_type = 'org'
    and f.target_org_id = new.organisation_id
    and f.follower_user_id <> new.author_user_id;
  return new;
end;
$$;

revoke all on function public.notify_organisation_update_published() from public;

drop trigger if exists trg_notify_organisation_update_published on public.organisation_updates;
create trigger trg_notify_organisation_update_published
  after insert on public.organisation_updates
  for each row execute function public.notify_organisation_update_published();

create or replace function public.notify_project_approved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  org_name text;
  href text := '/projects/' || coalesce(new.slug, new.id::text);
begin
  if new.source <> 'community' or new.status <> 'approved' or old.status = 'approved' then
    return new;
  end if;

  -- the person who submitted it
  if new.created_by is not null then
    insert into public.notifications (user_id, type, title, body, href, metadata)
    values (
      new.created_by,
      'project_approved',
      'Your project is published',
      new.name || ' is now visible to everyone. Keep it alive with updates and impact figures.',
      href,
      jsonb_build_object('project_id', new.id)
    );
  end if;

  -- followers of the organisation behind it
  org_id := coalesce(new.lead_org_id, case when new.owner_type = 'organisation' then new.owner_id end);
  if org_id is null then
    return new;
  end if;
  select o.name into org_name from public.organisations o where o.id = org_id;
  if org_name is null then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, href, metadata)
  select
    f.follower_user_id,
    'organisation_project_published',
    'New project from ' || org_name,
    new.name,
    href,
    jsonb_build_object('organisation_id', org_id, 'project_id', new.id)
  from public.follow_edges f
  where f.target_type = 'org'
    and f.target_org_id = org_id
    and f.follower_user_id is distinct from new.created_by;
  return new;
end;
$$;

revoke all on function public.notify_project_approved() from public;

drop trigger if exists trg_notify_project_approved on public.projects;
create trigger trg_notify_project_approved
  after update of status on public.projects
  for each row execute function public.notify_project_approved();

commit;
