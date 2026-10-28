-- Manual tests for 20260324120026_anon_statement_timeout.sql
-- runnable: pnpm db:test
-- Read-only check.

select rolconfig from pg_roles where rolname = 'anon';  -- expect: contains statement_timeout=8s
