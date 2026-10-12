-- Migration: hide_private_profile_fields
-- Created: 2026-10-12
--
-- PROBLEM:
--   profiles is readable by everyone ("Public can read profiles" / profiles_public_read,
--   USING (true)), so every column - including date_of_birth - can be read through the
--   API by anyone, logged out or not. RLS cannot hide single columns.
--
-- FIX:
--   Column-level privileges: anon and authenticated may SELECT every profile column
--   except date_of_birth. Name, nationality, organisation etc. stay public, as the
--   profile pages show them. INSERT/UPDATE privileges are unchanged, so sign-up and
--   profile editing keep working. Server-side code (service role) is unaffected.
--
--   NOTE FOR FUTURE MIGRATIONS: a new column on public.profiles is NOT readable by
--   anon/authenticated until it is added to the grant below (see AGENT_RULES.md).

begin;

revoke select on public.profiles from anon, authenticated;

grant select (
  id,
  kind,
  full_name,
  surname,
  nationality,
  organisation_name,
  organisation_id,
  created_at,
  is_admin,
  role,
  first_name,
  last_name,
  country_from,
  country_based,
  occupation,
  bio,
  social_links,
  avatar_url,
  email_notifications_enabled,
  updated_at
) on public.profiles to anon, authenticated;

commit;
