-- Migration: anon_statement_timeout
-- Created: 2026-10-28
--
-- WHY:
--   Visitors (role anon) get Supabase's default 3 s statement limit, signed-in people 8 s. After the
--   nightly IATI import (03:17 UTC) the database cache is cold, and a Find page that normally answers in
--   under 100 ms can take a few seconds once; visitors then saw an empty page. The pages are indexed now
--   (20260324120017); this gives visitors the same headroom as members for those cold moments.
--
-- WHAT: anon statement_timeout 3 s -> 8 s (the connection-level limit on authenticator is 8 s as well).

begin;

alter role anon set statement_timeout = '8s';

commit;
