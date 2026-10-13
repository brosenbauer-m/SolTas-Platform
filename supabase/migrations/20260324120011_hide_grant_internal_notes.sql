-- Migration: hide_grant_internal_notes
-- Created: 2026-10-13
--
-- PROBLEM:
--   grants.notes_internal is meant for admins only, but anon and authenticated have
--   table-wide SELECT, so anyone can read it on every published grant through the API
--   (/rest/v1/grants?select=notes_internal). RLS cannot hide single columns.
--
-- FIX:
--   Same approach as profiles.date_of_birth (20260324120010): anon and authenticated may
--   SELECT every grants column except notes_internal. INSERT/UPDATE privileges are
--   unchanged. The app never reads notes_internal; server code using the service role
--   is unaffected.
--
--   NOTE FOR FUTURE MIGRATIONS: a new column on public.grants is NOT readable by
--   anon/authenticated until it is added to the grant below (see AGENT_RULES.md).

begin;

revoke select on public.grants from anon, authenticated;

grant select (
  id,
  created_at,
  updated_at,
  created_by,
  is_published,
  status,
  title,
  slug,
  summary,
  description,
  funder_name,
  funder_website,
  application_url,
  contact_email,
  funding_type,
  project_type,
  currency,
  amount_min,
  amount_max,
  open_date,
  deadline,
  decision_date,
  start_date,
  eligible_countries,
  eligible_regions,
  remote_ok,
  location_name,
  latitude,
  longitude,
  themes,
  sdgs,
  keywords,
  source,
  owner_type,
  owner_id,
  moderation_status,
  approved_at,
  approved_by,
  rejected_at,
  rejected_by,
  rejection_reason
) on public.grants to anon, authenticated;

commit;
