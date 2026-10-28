-- Migration: write_rate_limits
-- Created: 2026-10-28
--
-- WHY:
--   Nothing stopped one account from flooding the feed, comments, updates or issue reports. The app
--   has no Redis; RLS is the gate, so the limit lives in the database too.
--
-- WHAT:
--   public.enforce_write_rate_limit(): a trigger function that counts the author's rows in the table
--   over a window and refuses the insert when the limit is reached. Applied to feed_posts, update_comments,
--   project_updates, organisation_updates and watchdog_issues. Only signed-in app users (role
--   authenticated) are limited; admins, the service role and server jobs are not.
--
--   Limits (per account): feed posts 20/hour, comments 60/hour, project updates 30/hour, organisation
--   updates 30/hour, issue reports 10/day. Error: SQLSTATE P0001 with a message starting "Too many".

begin;

create or replace function public.enforce_write_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author_col text := tg_argv[0];
  max_rows integer := tg_argv[1]::integer;
  window_text text := tg_argv[2];
  what text := tg_argv[3];
  author uuid;
  recent integer;
  role_claim text;
begin
  -- SECURITY DEFINER runs as the owner, so the caller's role comes from the request's JWT claims
  -- (PostgREST sets both settings; the service role and server jobs carry another role or none).
  role_claim := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  );
  if role_claim is distinct from 'authenticated' or public.is_admin() then
    return new;
  end if;

  execute format('select ($1).%I', author_col) into author using new;
  if author is null then
    return new;
  end if;

  execute format(
    'select count(*) from %I.%I where %I = $1 and created_at > now() - $2::interval',
    tg_table_schema, tg_table_name, author_col
  ) into recent using author, window_text;

  if recent >= max_rows then
    raise exception 'Too many % in a short time. Please wait a while before adding more.', what
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_write_rate_limit() from public;

drop trigger if exists trg_rate_limit_feed_posts on public.feed_posts;
create trigger trg_rate_limit_feed_posts
  before insert on public.feed_posts
  for each row execute function public.enforce_write_rate_limit('created_by', '20', '1 hour', 'posts');

drop trigger if exists trg_rate_limit_update_comments on public.update_comments;
create trigger trg_rate_limit_update_comments
  before insert on public.update_comments
  for each row execute function public.enforce_write_rate_limit('author_user_id', '60', '1 hour', 'comments');

drop trigger if exists trg_rate_limit_project_updates on public.project_updates;
create trigger trg_rate_limit_project_updates
  before insert on public.project_updates
  for each row execute function public.enforce_write_rate_limit('author_user_id', '30', '1 hour', 'updates');

drop trigger if exists trg_rate_limit_organisation_updates on public.organisation_updates;
create trigger trg_rate_limit_organisation_updates
  before insert on public.organisation_updates
  for each row execute function public.enforce_write_rate_limit('author_user_id', '30', '1 hour', 'updates');

drop trigger if exists trg_rate_limit_watchdog_issues on public.watchdog_issues;
create trigger trg_rate_limit_watchdog_issues
  before insert on public.watchdog_issues
  for each row execute function public.enforce_write_rate_limit('created_by', '10', '1 day', 'issue reports');

commit;
