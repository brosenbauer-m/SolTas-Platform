-- Manual tests for 20260324120016_ai_usage.sql (server only)
-- runnable: pnpm db:test
-- Run in the Supabase SQL editor. Everything is rolled back.

begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d9', 'ai-user@example.test');

-- The server (service role) logs usage
set local role service_role;
insert into public.ai_usage (user_id, feature, model, input_tokens, output_tokens)
values ('00000000-0000-0000-0000-0000000000d9', 'search', 'mistral-small-latest', 1200, 40)
returning feature;  -- expect: search
reset role;

-- Visitors and signed-in users can neither read nor write it (not even their own rows)
set local role anon;
savepoint s1;
select count(*) from public.ai_usage;  -- expect: ERROR permission denied
rollback to savepoint s1;
reset role;

set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000d9"}';
savepoint s2a;
select count(*) from public.ai_usage;  -- expect: ERROR permission denied
rollback to savepoint s2a;
savepoint s2b;
insert into public.ai_usage (user_id, feature, model) values (auth.uid(), 'search', 'x');  -- expect: ERROR permission denied
rollback to savepoint s2b;
reset role;

-- Unknown features are rejected
savepoint s3;
insert into public.ai_usage (feature, model) values ('chat', 'x');  -- expect: ERROR violates check constraint
rollback to savepoint s3;

rollback;
