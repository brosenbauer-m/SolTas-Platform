-- Migration: drop_iati_activities
-- Created: 2026-10-22T09:33:14.222Z
--
-- IATI activities live in public.projects (source = 'iati') since 20260324120013, and the sync writes only there.
-- The old copy in iati_activities (~25,000 rows, ~48 MB) is no longer read anywhere; dropping it frees room
-- under the Supabase Free 500 MB limit for more imported projects. Its data is in projects and can be fetched
-- again from IATI at any time. iati_sync_runs (the sync log) stays.

begin;

drop table if exists public.iati_activities;

commit;
