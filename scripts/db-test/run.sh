#!/usr/bin/env bash
# Build a throwaway local database from supabase/migrations and check RLS.
#
# Usage:  pnpm db:test            (or: bash scripts/db-test/run.sh [--keep])
#
# What it does:
#   1. Starts a temporary Postgres cluster (needs Postgres 15+ binaries: initdb, pg_ctl, psql).
#      Set PGTEST_URL=postgres://... to use an existing throwaway server instead.
#   2. Applies scripts/db-test/bootstrap.sql (Supabase roles/auth/storage stubs), then every
#      migration in order, each in one transaction with function-body checks on - like the
#      Supabase CLI does.
#   3. Sweeps every public table as anon and as a signed-in user with SELECT, UPDATE and
#      DELETE (WHERE false) and reports RLS errors such as "infinite recursion" or
#      "stack depth limit exceeded".
#   4. Runs the self-contained SQL scripts in supabase/tests/ (files containing the line
#      "-- runnable: pnpm db:test"; they roll back) and prints their output, so you can
#      compare it with the "expect:" comments in each file.
#
# Never point PGTEST_URL at production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
KEEP=0
[[ "${1:-}" == "--keep" ]] && KEEP=1
DB=soltas_test
FAIL=0

find_bin() {
  if command -v "$1" >/dev/null 2>&1; then command -v "$1"; return; fi
  ls -d /usr/lib/postgresql/*/bin/"$1" 2>/dev/null | sort -V | tail -1
}

if [[ -z "${PGTEST_URL:-}" ]]; then
  INITDB="$(find_bin initdb)"; PGCTL="$(find_bin pg_ctl)"
  [[ -x "$INITDB" && -x "$PGCTL" ]] || { echo "Postgres binaries (initdb, pg_ctl) not found."; exit 1; }
  TMP="$(mktemp -d /tmp/soltas-dbtest.XXXXXX)"; chmod 777 "$TMP"
  PORT="${PGTEST_PORT:-54399}"
  AS=""
  if [[ "$(id -u)" == "0" ]]; then id postgres >/dev/null 2>&1 || useradd -m postgres; AS="runuser -u postgres --"; fi
  $AS "$INITDB" -D "$TMP/data" -A trust -U postgres >/dev/null
  $AS "$PGCTL" -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/log" -w start >/dev/null
  cleanup() { if [[ $KEEP == 0 ]]; then $AS "$PGCTL" -D "$TMP/data" -m fast stop >/dev/null 2>&1 || true; rm -rf "$TMP"; else echo "Kept: psql -h $TMP -p $PORT -U postgres $DB"; fi; }
  trap cleanup EXIT
  CONN=(-h "$TMP" -p "$PORT" -U postgres)
else
  CONN=("$PGTEST_URL")
fi

psql_db() { psql "${CONN[@]}" -d "$DB" -X -q -v ON_ERROR_STOP=1 "$@"; }

psql "${CONN[@]}" -d postgres -X -q -c "drop database if exists $DB" -c "create database $DB" >/dev/null
psql_db -f "$ROOT/scripts/db-test/bootstrap.sql" >/dev/null 2>&1
psql_db -c "alter database $DB set search_path = \"\$user\", public, extensions" >/dev/null

echo "==> Applying migrations"
for f in "$ROOT"/supabase/migrations/*.sql; do
  if ! out=$(PGOPTIONS="-c search_path=public,extensions" psql_db -1 -f "$f" 2>&1); then
    echo "FAIL $(basename "$f")"; echo "$out" | grep -v NOTICE | head -5; exit 1
  fi
done
echo "    all $(ls "$ROOT"/supabase/migrations/*.sql | wc -l) migrations applied"

echo "==> RLS sweep (anon + signed-in user; SELECT / UPDATE / DELETE)"
USER_ID=00000000-0000-0000-0000-00000000aaaa
psql_db -c "insert into auth.users (id, email) values ('$USER_ID', 'sweep@example.test') on conflict do nothing" >/dev/null
TABLES=$(psql_db -At -c "select c.relname || '|' || (select a.attname from pg_attribute a where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped order by a.attnum limit 1) || '|' || c.relkind::text from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','v')")
for who in anon authenticated; do
  claims='{"role":"anon"}'; [[ $who == authenticated ]] && claims="{\"role\":\"authenticated\",\"sub\":\"$USER_ID\"}"
  for row in $TABLES; do
    IFS='|' read -r t col kind <<<"$row"
    stmts=("select count(*) from public.\"$t\"")
    [[ $kind == r ]] && stmts+=("update public.\"$t\" set \"$col\" = \"$col\" where false" "delete from public.\"$t\" where false")
    for s in "${stmts[@]}"; do
      err=$(psql "${CONN[@]}" -d "$DB" -X -q -At -c "begin; set local statement_timeout = '5s'; set local role $who; set local request.jwt.claims = '$claims'; $s; rollback;" 2>&1 | grep -i error | grep -v "permission denied" || true)
      if [[ -n "$err" ]]; then echo "  $who: $s"; echo "    $err"; FAIL=1; fi
    done
  done
done
[[ $FAIL == 0 ]] && echo "    no RLS errors"

echo "==> supabase/tests (compare with the 'expect:' comments)"
for f in $(grep -l -- "-- runnable: pnpm db:test" "$ROOT"/supabase/tests/*.sql); do
  echo "--- $(basename "$f")"
  psql "${CONN[@]}" -d "$DB" -X -q -f "$f" 2>&1 | grep -v '^$' | sed 's/^/    /' || true
done

exit $FAIL
