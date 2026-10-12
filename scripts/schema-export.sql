-- SolTas: read-only export of the public schema (tables, RLS, policies, views, functions, triggers, grants).
-- Run in the Supabase SQL editor ("Run without RLS" if asked: nothing is created) and export as CSV.
-- Used to detect drift between production and supabase/migrations (see docs/schema-drift.md).
-- Changes nothing. Output: one row per object, ordered.
with
tbl as (
  select c.oid, c.relname, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','p')
),
cols as (
  select t.relname,
    string_agg(format('  %I %s%s%s%s', a.attname, format_type(a.atttypid, a.atttypmod),
      case when a.attidentity <> '' then ' generated ' || case a.attidentity when 'a' then 'always' else 'by default' end || ' as identity' else '' end,
      case when a.attgenerated = 's' then ' generated always as (' || pg_get_expr(d.adbin, d.adrelid) || ') stored'
           when d.adbin is not null then ' default ' || pg_get_expr(d.adbin, d.adrelid) else '' end,
      case when a.attnotnull then ' not null' else '' end), E',\n' order by a.attnum) as body
  from tbl t
  join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  group by t.relname
),
objs as (
  -- 1 tables
  select 1 as ord, t.relname as name,
    format(E'create table public.%I (\n%s\n);', t.relname, c.body)
    || coalesce((select E'\n' || string_agg(format('alter table public.%I add constraint %I %s;', t.relname, co.conname, pg_get_constraintdef(co.oid)), E'\n' order by co.contype desc, co.conname)
                 from pg_constraint co where co.conrelid = t.oid), '')
    || coalesce((select E'\n' || string_agg(pg_get_indexdef(i.indexrelid) || ';', E'\n' order by 1)
                 from pg_index i where i.indrelid = t.oid
                   and not exists (select 1 from pg_constraint co where co.conindid = i.indexrelid)), '')
    || case when t.relrowsecurity then format(E'\nalter table public.%I enable row level security;', t.relname) else format(E'\n-- RLS DISABLED on public.%I', t.relname) end
    || case when t.relforcerowsecurity then format(E'\nalter table public.%I force row level security;', t.relname) else '' end
    as ddl
  from tbl t join cols c on c.relname = t.relname
  union all
  -- 2 views
  select 2, c.relname,
    format(E'create or replace view public.%I%s as\n%s', c.relname,
      case when c.reloptions is not null then ' with (' || array_to_string(c.reloptions, ', ') || ')' else '' end,
      pg_get_viewdef(c.oid, true))
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('v','m')
  union all
  -- 3 functions (skip extension-owned)
  select 3, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
    pg_get_functiondef(p.oid) || ';'
    || coalesce(E'\n-- acl: ' || array_to_string(p.proacl, ', '), '')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f','p')
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  union all
  -- 4 triggers
  select 4, c.relname || '.' || tg.tgname, pg_get_triggerdef(tg.oid, true) || ';'
  from pg_trigger tg join pg_class c on c.oid = tg.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not tg.tgisinternal
  union all
  -- 5 policies
  select 5, pol.tablename || '.' || pol.policyname,
    format('create policy %I on public.%I as %s for %s to %s%s%s;',
      pol.policyname, pol.tablename, lower(pol.permissive), lower(pol.cmd), array_to_string(pol.roles, ', '),
      coalesce(E'\n  using (' || pol.qual || ')', ''), coalesce(E'\n  with check (' || pol.with_check || ')', ''))
  from pg_policies pol where pol.schemaname = 'public'
  union all
  -- 6 table grants for anon / authenticated
  select 6, c.relname,
    format('-- grants on public.%I: %s', c.relname, array_to_string(c.relacl, ', '))
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','p','v','m')
)
select ord, name, ddl from objs order by ord, name;
