-- Migration: fix_profiles_updates_and_protect_roles
-- Created: 2026-10-12T16:05:49.676Z
--
-- PROBLEM 1 (production bug):
--   Trigger profiles_set_updated_at (20260110195100) sets new.updated_at, but
--   public.profiles in production has no updated_at column (the table already
--   existed, so that migration's "create table if not exists" skipped it).
--   Every UPDATE on profiles therefore fails with
--   'record "new" has no field "updated_at"' (e.g. Settings -> email notifications).
--
-- PROBLEM 2:
--   profiles.role and profiles.is_admin are still read by permission helpers
--   (is_moderator() reads role; is_admin(uuid) reads is_admin), but the profile
--   self-update policies only check id = auth.uid(). Nothing stops a signed-in
--   user from changing these two columns on their own row.
--
-- FIX:
--   A BEFORE INSERT/UPDATE trigger on public.profiles rejects any change to
--   role / is_admin made through the API roles (anon, authenticated) unless the
--   caller is a superadmin (user_roles). Server-side code is unaffected:
--   SECURITY DEFINER functions such as grant_admin/revoke_admin run as their
--   owner, and the service role / postgres are not anon/authenticated.
--
--   The app never writes these columns from the browser (signup upsert and
--   settings only touch normal profile fields), so no user-facing change.
--
--   Both fixes ship together on purpose: fixing problem 1 alone would make
--   problem 2 reachable through UPDATE.

begin;

-- 1) Missing column for the existing updated_at trigger
alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

-- 2) Only superadmins may change role / is_admin through the API

create or replace function public.protect_profile_privilege_columns()
returns trigger
language plpgsql
security invoker  -- must see the real caller in current_user
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if public.is_superadmin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.role, 'user') <> 'user' or coalesce(new.is_admin, false) then
      raise exception 'Only superadmins can assign roles'
        using errcode = '42501';
    end if;
  elsif new.role is distinct from old.role or new.is_admin is distinct from old.is_admin then
    raise exception 'Only superadmins can change roles'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_profile_privilege_columns() from public;

drop trigger if exists trg_protect_profile_privilege_columns on public.profiles;
create trigger trg_protect_profile_privilege_columns
before insert or update on public.profiles
for each row
execute function public.protect_profile_privilege_columns();

commit;
