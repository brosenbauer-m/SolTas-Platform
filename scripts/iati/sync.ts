// IATI sync: copies humanitarian/environmental activities from the IATI Datastore API into public.projects
// (source = 'iati', owned by the IATI system organisation).
// Plan: docs/architecture/iati-integration.md. Runs in GitHub Actions (.github/workflows/iati-sync.yml).
//
//   pnpm sync:iati --mode count                 how many activities are in scope (+ 2 samples). No DB needed.
//   pnpm sync:iati --mode dry-run --limit 200   fetch + transform, print stats and samples. No DB needed.
//   pnpm sync:iati --mode incremental           first run: backfill (newest first, capped). Then: changes since
//                                               the last run, plus a top-up with older activities while there is room.
//   pnpm sync:iati --mode full                  withdraw activities that left the scope (identifiers only), list
//                                               stored ones that are back in scope.
//
// Env: IATI_API_KEY (always); SUPABASE_DB_URL (incremental/full; the Postgres connection string the
// migration workflow already uses).
// Optional: IATI_MAX_ACTIVITIES (listed imported projects, default 100000), IATI_MAX_DB_MB (no new imports once
//           the database is this big, default 400; Supabase Free allows 500), IATI_ROWS (default 1000 per call,
//           the API's maximum), IATI_MAX_CALLS (default 10 per incremental run), IATI_FULL_MAX_CALLS (default 80).
//           The free "Exploratory" key allows 5 calls/min and 100/week.

import { createHash } from "node:crypto";

import postgres from "postgres";

import { countryName } from "../../src/lib/geo/countries";

import { IATI_FIELDS, sectorShare, transformActivity, type IatiActivityRow, type IatiDoc } from "./transform";

const API_BASE = process.env.IATI_API_BASE || "https://api.iatistandard.org/datastore";
const MAX_ACTIVITIES = Number(process.env.IATI_MAX_ACTIVITIES || 100000);
const MAX_DB_MB = Number(process.env.IATI_MAX_DB_MB || 400);
const ROWS = Number(process.env.IATI_ROWS || 1000);
/** Full mode refuses to withdraw more than this share of the listed projects at once (a broken scan, not reality). */
const MAX_WITHDRAW_SHARE = Number(process.env.IATI_MAX_WITHDRAW_SHARE || 0.2);
const CALL_GAP_MS = 13_000; // 5 calls per minute on the free key
const UPSERT_CHUNK = 500;

// Environment & water/sanitation, agriculture, forestry, fishing, disaster prevention (DAC 5-digit prefixes)
const SECTOR_PREFIXES = ["410", "140", "311", "312", "313", "740"];
// Rio markers: biodiversity, climate mitigation, climate adaptation, desertification
const RIO_MARKERS = ["5", "6", "7", "8"];
/** A themed sector must be at least this share (%) of the activity, not one line among twenty. */
const MIN_SECTOR_SHARE = 25;
/** Publishers often leave old activities "ongoing": skip ones whose end date passed this long ago. */
const ENDED_GRACE_DAYS = 90;

const THEME =
  `(humanitarian:true OR sector_code:(${SECTOR_PREFIXES.map((p) => `${p}*`).join(" OR ")}) ` +
  `OR policy_marker_code:(${RIO_MARKERS.join(" OR ")}))`;
const HAS_PLACE = "(recipient_country_code:[* TO *] OR location_point_pos:[* TO *])";
const NOT_SECONDARY = "-reporting_org_secondary_reporter:true";
/** Publishers refresh live activities at least yearly; older records are usually abandoned. */
const RECENT = "last_updated_datetime:[NOW-2YEARS TO *]";
/** What we import: planned or ongoing, recently updated, with a place, on a humanitarian/environmental theme. */
const SCOPE = `activity_status_code:(1 OR 2) AND ${RECENT} AND ${NOT_SECONDARY} AND ${HAS_PLACE} AND ${THEME}`;
/** What we update: same themes, any status (so an activity that ends gets marked completed). */
const UPDATE_SCOPE = `${NOT_SECONDARY} AND ${HAS_PLACE} AND ${THEME}`;

type Mode = "count" | "dry-run" | "incremental" | "full";
type SolrResponse = { response: { numFound: number; docs: IatiDoc[] }; nextCursorMark?: string; facet_counts?: unknown };

// ---------- helpers ----------

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let calls = 0;
let lastCallAt = 0;
let MAX_CALLS = Number(process.env.IATI_MAX_CALLS || 10);

class QuotaError extends Error {}

/** One Datastore request, throttled to the free key's rate limit. */
async function solr(params: Record<string, string>): Promise<SolrResponse> {
  if (calls >= MAX_CALLS) throw new QuotaError(`Stopped after ${MAX_CALLS} API calls (IATI_MAX_CALLS).`);
  const wait = lastCallAt + CALL_GAP_MS - Date.now();
  if (calls > 0 && wait > 0) await sleep(wait);

  const url = `${API_BASE}/activity/select?${new URLSearchParams({ wt: "json", ...params })}`;
  for (let attempt = 1; ; attempt++) {
    calls++;
    lastCallAt = Date.now();
    const res = await fetch(url, {
      headers: { "Ocp-Apim-Subscription-Key": requireEnv("IATI_API_KEY"), Accept: "application/json" },
      signal: AbortSignal.timeout(180_000),
    });
    if (res.ok) return (await res.json()) as SolrResponse;

    const body = (await res.text()).slice(0, 300);
    if (res.status === 401) throw new Error(`IATI API: 401, the key is missing or wrong. ${body}`);
    if (res.status === 403 || res.status === 429) {
      if (attempt < 3 && res.status === 429) {
        await sleep(65_000);
        continue;
      }
      throw new QuotaError(`IATI API: ${res.status}, call quota used up. ${body}`);
    }
    if (res.status >= 500 && attempt < 3 && calls < MAX_CALLS) {
      await sleep(30_000);
      continue;
    }
    throw new Error(`IATI API: ${res.status}. ${body}`);
  }
}

/**
 * Pages through a query with Solr's cursorMark (falls back to start/rows if the API ignores it).
 * The API may return fewer rows than asked for (it caps them), so only an empty page or an unchanged
 * cursor ends the scan, never a short page.
 */
async function* pages(q: string, fl: string, sort: string, rows = ROWS) {
  let cursor = "*";
  let start = 0;
  for (;;) {
    const data = await solr({ q, fl, sort, rows: String(rows), cursorMark: cursor });
    const docs = data.response?.docs ?? [];
    const numFound = data.response?.numFound ?? 0;
    yield { docs, numFound };
    start += docs.length;
    if (!docs.length || start >= numFound) return;
    if (data.nextCursorMark) {
      if (data.nextCursorMark === cursor) return;
      cursor = data.nextCursorMark;
    } else {
      // no cursor support: continue with offsets
      for await (const page of offsetPages(q, fl, sort, rows, start)) yield page;
      return;
    }
  }
}

async function* offsetPages(q: string, fl: string, sort: string, rows: number, start: number) {
  for (;;) {
    const data = await solr({ q, fl, sort, rows: String(rows), start: String(start) });
    const docs = data.response?.docs ?? [];
    const numFound = data.response?.numFound ?? 0;
    yield { docs, numFound };
    start += docs.length;
    if (!docs.length || start >= numFound) return;
  }
}

type IdList = { ids: Set<string>; complete: boolean; docs: number; numFound: number; via: string };

/** Every identifier in scope in one call, via a facet (null if the API doesn't return the full list). */
async function idsByFacet(): Promise<IdList | null> {
  const data = await solr({
    q: SCOPE,
    rows: "0",
    facet: "true",
    "facet.field": "iati_identifier",
    "facet.limit": "-1",
    "facet.mincount": "1",
    "json.nl": "flat",
  });
  const numFound = data.response?.numFound ?? 0;
  const flat = (data.facet_counts as { facet_fields?: Record<string, unknown[]> } | undefined)?.facet_fields
    ?.iati_identifier;
  if (!Array.isArray(flat)) return null;
  const ids = new Set<string>();
  let docs = 0;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    if (typeof flat[i] === "string") ids.add((flat[i] as string).trim());
    docs += Number(flat[i + 1]) || 0;
  }
  // Each document is counted once under its identifier, so the counts add up to numFound when nothing is missing.
  return docs === numFound ? { ids, complete: true, docs, numFound, via: "facet" } : null;
}

/** Every identifier in scope: one facet call if the API allows it, otherwise paging (one call per 1000). */
async function idsInScope(): Promise<IdList> {
  const byFacet = await idsByFacet();
  if (byFacet) return byFacet;
  const ids = new Set<string>();
  let docs = 0;
  let numFound = 0;
  for await (const page of pages(SCOPE, "iati_identifier", "id asc")) {
    if (!docs) numFound = page.numFound;
    docs += page.docs.length;
    for (const doc of page.docs) {
      if (typeof doc.iati_identifier === "string") ids.add(doc.iati_identifier.trim());
    }
  }
  // Activities published during the scan can shift the total a little; a missing chunk can't hide in 1%.
  return { ids, complete: docs >= numFound * 0.99, docs, numFound, via: "paging" };
}

/**
 * Second check after the transform, for what Solr can't pair: a Rio marker must be significant (>= 1),
 * a themed sector must be a real share of the activity.
 */
function inTheme(row: IatiActivityRow, doc: IatiDoc): boolean {
  if (row.humanitarian) return true;
  if (sectorShare(doc, SECTOR_PREFIXES) >= MIN_SECTOR_SHARE) return true;
  return row.policy_markers.some((m) => RIO_MARKERS.includes(m.code) && (m.significance ?? 0) >= 1);
}

function endedLongAgo(row: IatiActivityRow): boolean {
  if (!row.end_date) return false;
  return Date.parse(row.end_date) < Date.now() - ENDED_GRACE_DAYS * 24 * 3600 * 1000;
}

/** Why a new activity is not imported, or null if it is. */
function rejectReason(row: IatiActivityRow, doc: IatiDoc): string | null {
  if (row.activity_status == null || row.activity_status > 2) return "not planned/ongoing";
  if (endedLongAgo(row)) return "end date passed";
  if (!inTheme(row, doc)) return "theme too weak";
  if (row.lat == null) return "no map point";
  return null;
}

function stats(rows: IatiActivityRow[]) {
  const count = (pred: (r: IatiActivityRow) => boolean) => rows.filter(pred).length;
  return {
    rows: rows.length,
    exact_point: count((r) => r.point_precision === "exact"),
    country_point: count((r) => r.point_precision === "country"),
    no_point: count((r) => r.lat == null),
    humanitarian: count((r) => r.humanitarian),
    with_dac_sector: count((r) => r.dac_sectors.length > 0),
    with_budget: count((r) => r.budget_total != null),
    with_dates: count((r) => r.start_date != null),
    with_sdgs: count((r) => r.sdgs.length > 0),
    by_status: rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.lifecycle_status]: (acc[r.lifecycle_status] ?? 0) + 1 }), {}),
    avg_json_bytes: rows.length ? Math.round(rows.reduce((sum, r) => sum + JSON.stringify(r).length, 0) / rows.length) : 0,
  };
}

// ---------- modes ----------

async function runCount() {
  const fl = IATI_FIELDS.join(",");
  const inScope = await solr({ q: SCOPE, fl, rows: "2" });
  const exact = await solr({ q: `${SCOPE} AND location_point_pos:[* TO *]`, rows: "0" });
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const weekly = await solr({ q: `${UPDATE_SCOPE} AND last_updated_datetime:[${since} TO *]`, rows: "0" });
  const facet = await idsByFacet();
  for (const doc of inScope.response.docs) {
    console.log("\nSample (raw):", JSON.stringify(doc).slice(0, 2000));
    console.log("Sample (row):", JSON.stringify(transformActivity(doc), null, 2));
  }
  // summary last, so it is at the end of the log
  console.log(`\nIn scope (planned/ongoing, recent, themed, with a place): ${inScope.response.numFound}`);
  console.log(`  ... of which with exact map points: ${exact.response.numFound}`);
  console.log(`Updated in the last 7 days (any status, same themes): ${weekly.response.numFound}`);
  console.log(
    facet
      ? `Full mode can list every identifier in one call (${facet.ids.size} identifiers).`
      : "Full mode needs one call per 1000 activities (the API didn't return the full identifier list).",
  );
  console.log(`Cap (IATI_MAX_ACTIVITIES): ${MAX_ACTIVITIES}, database limit ${MAX_DB_MB} MB; rows per call: ${ROWS}`);
}

async function runDryRun(limit: number) {
  const data = await solr({ q: SCOPE, fl: IATI_FIELDS.join(","), sort: "last_updated_datetime desc", rows: String(limit) });
  const rows: IatiActivityRow[] = [];
  const skipped: Record<string, number> = {};
  for (const doc of data.response.docs) {
    const result = transformActivity(doc);
    const reason = "skip" in result ? result.skip : rejectReason(result.row, doc);
    if (reason) skipped[reason] = (skipped[reason] ?? 0) + 1;
    else if ("row" in result) rows.push(result.row);
  }
  for (const row of rows.slice(0, 3)) console.log("\nSample row:", JSON.stringify(row, null, 2));
  // summary last, so it is at the end of the log
  console.log(`\nFetched ${data.response.docs.length} of ${data.response.numFound} in scope.`);
  console.log("Skipped:", JSON.stringify(skipped));
  console.log("Stats:", JSON.stringify(stats(rows)));
}

type Sql = postgres.Sql;

/** Direct database connection (the same SUPABASE_DB_URL the migration workflow uses; bypasses RLS). */
function db(): Sql {
  const url = requireEnv("SUPABASE_DB_URL");
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  return postgres(url, { max: 2, prepare: false, ssl: local ? false : "require", onnotice: () => {} });
}

/** The verified system organisation that owns every imported project (migration 20260324120013). */
const IATI_ORG_ID = "a7a71000-0000-4000-8000-000000000001";

/** Stable project slug: "iati-<identifier>-<6 hex of md5>" (same formula as the migration that copied the first rows). */
export function iatiSlug(identifier: string) {
  const base = identifier
    .replace(/[^A-Za-z0-9]+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `iati-${base}-${createHash("md5").update(identifier).digest("hex").slice(0, 6)}`;
}

/** Columns the sync refreshes on every update (status, owner and slug are set once on insert). */
const UPDATE_COLUMNS = [
  "name",
  "description",
  "category",
  "lifecycle_status",
  "start_date",
  "end_date",
  "lat",
  "lng",
  "place_name",
  "country",
  "sdgs",
  "currency",
  "point_precision",
  "source_data",
  "source_updated_at",
  "visibility",
] as const;

function toProjectRecord(sql: Sql, row: IatiActivityRow, visibility: "public" | "unlisted") {
  const country = row.countries[0] ? countryName(row.countries[0]) : null;
  return {
    name: row.title,
    slug: iatiSlug(row.iati_identifier),
    description: row.description,
    category: row.humanitarian ? "humanitarian" : "environmental",
    lifecycle_status: row.lifecycle_status,
    start_date: row.start_date,
    end_date: row.end_date,
    lat: row.lat,
    lng: row.lng,
    place_name: row.locations[0]?.name ?? country,
    country,
    sdgs: row.sdgs,
    currency: row.currency,
    point_precision: row.point_precision,
    source_data: sql.json({
      reporting_org: { ref: row.reporting_org_ref, name: row.reporting_org_name, type: row.reporting_org_type },
      participating_orgs: row.participating_orgs,
      activity_status: row.activity_status,
      countries: row.countries,
      regions: row.regions,
      scope: row.scope,
      locations: row.locations,
      dac_sectors: row.dac_sectors,
      policy_markers: row.policy_markers,
      humanitarian: row.humanitarian,
      budget_total: row.budget_total,
      links: row.links,
    } as postgres.JSONValue),
    source_updated_at: row.last_updated_at,
    visibility,
    // insert only
    status: "approved",
    review_status: "approved",
    approved_at: new Date().toISOString(),
    owner_type: "organisation",
    owner_id: IATI_ORG_ID,
    lead_org_id: IATI_ORG_ID,
    source: "iati",
    iati_identifier: row.iati_identifier,
  };
}

/** Imported projects we already store, with their visibility. */
async function existing(sql: Sql, ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const rows = await sql<{ iati_identifier: string; visibility: string }[]>`
    select iati_identifier, visibility from public.projects where iati_identifier = any(${ids})`;
  return new Map(rows.map((row) => [row.iati_identifier, row.visibility]));
}

type Visibility = "public" | "unlisted";

async function upsertProjects(sql: Sql, rows: { row: IatiActivityRow; visibility: Visibility }[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- postgres.js helper typing
  const records: Record<string, any>[] = rows.map(({ row, visibility }) => toProjectRecord(sql, row, visibility));
  const columns = Object.keys(records[0]);
  await sql`
    insert into public.projects ${sql(records, columns)}
    on conflict (iati_identifier) do update set
    ${sql.unsafe(UPDATE_COLUMNS.map((column) => `"${column}" = excluded."${column}"`).join(", "))}`;
}

/**
 * Unlists stored projects that left the scope by the calendar alone (no API calls): not updated for two
 * years (RECENT), or the end date passed more than ENDED_GRACE_DAYS ago.
 */
async function expireLocally(sql: Sql): Promise<number> {
  const rows = await sql`
    update public.projects set visibility = 'unlisted'
    where source = 'iati' and visibility = 'public'
      and (source_updated_at < now() - interval '2 years' or end_date < current_date - ${ENDED_GRACE_DAYS}::int)
    returning id`;
  return rows.length;
}

/** How many more projects may be listed: the cap, and nothing new once the database reaches IATI_MAX_DB_MB. */
async function roomLeft(sql: Sql): Promise<{ listed: number; room: number; dbMb: number }> {
  const [{ listed, bytes }] = await sql<{ listed: number; bytes: string }[]>`
    select count(*) filter (where visibility = 'public')::int as listed,
           pg_database_size(current_database())::text as bytes
    from public.projects where source = 'iati'`;
  const dbMb = Math.round(Number(bytes) / 1024 / 1024);
  return { listed, room: dbMb >= MAX_DB_MB ? 0 : Math.max(0, MAX_ACTIVITIES - listed), dbMb };
}

type Totals = { fetched: number; upserted: number; relisted: number; skipped: number; capped: number };

/**
 * Imports one page of activities. Stored ones are always refreshed (listed while they fit the scope, unlisted
 * once they don't); new ones and unlisted ones coming back take a place under the cap.
 * Returns the newest last_updated_at on the page.
 */
async function importPage(sql: Sql, docs: IatiDoc[], totals: Totals, budget: { room: number }) {
  totals.fetched += docs.length;
  let newest: string | null = null;
  const rows: IatiActivityRow[] = [];
  const docsById = new Map<string, IatiDoc>();
  for (const doc of docs) {
    const result = transformActivity(doc);
    if ("skip" in result) totals.skipped++;
    else {
      rows.push(result.row);
      docsById.set(result.row.iati_identifier, doc);
      const updated = result.row.last_updated_at;
      if (updated && (!newest || updated > newest)) newest = updated;
    }
  }

  const known = await existing(sql, rows.map((r) => r.iati_identifier));
  const seen = new Set<string>();
  const keep: { row: IatiActivityRow; visibility: Visibility }[] = [];
  for (const row of rows) {
    if (seen.has(row.iati_identifier)) continue; // one row per identifier per statement
    seen.add(row.iati_identifier);
    const current = known.get(row.iati_identifier);
    const fits = !rejectReason(row, docsById.get(row.iati_identifier) ?? {});
    if (current === "public" || (current && !fits)) {
      keep.push({ row, visibility: fits ? "public" : "unlisted" }); // always refresh what we store
      continue;
    }
    if (!fits) {
      totals.skipped++;
      continue;
    }
    if (budget.room <= 0) {
      totals.capped++;
      if (current) keep.push({ row, visibility: "unlisted" });
      continue;
    }
    budget.room--;
    if (current) totals.relisted++;
    keep.push({ row, visibility: "public" });
  }

  for (let i = 0; i < keep.length; i += UPSERT_CHUNK) {
    const chunk = keep.slice(i, i + UPSERT_CHUNK);
    await upsertProjects(sql, chunk);
    totals.upserted += chunk.length;
  }
  console.log(
    `  fetched ${totals.fetched}, upserted ${totals.upserted} (${totals.relisted} listed again), ` +
      `skipped ${totals.skipped}, over cap ${totals.capped}`,
  );
  return newest;
}

async function runIncremental(sql: Sql, runId: number) {
  const [last] = await sql<{ high_water_mark: Date }[]>`
    select high_water_mark from public.iati_sync_runs
    where mode in ('incremental', 'full') and ok and high_water_mark is not null
    order by high_water_mark desc limit 1`;
  const expired = await expireLocally(sql);
  if (expired) console.log(`Unlisted ${expired} (not updated for 2 years, or ended more than ${ENDED_GRACE_DAYS} days ago).`);
  // Only listed (public) imported projects count towards the cap, so withdrawn ones free their place.
  const { listed, room, dbMb } = await roomLeft(sql);
  const budget = { room };
  const [{ oldest }] = await sql<{ oldest: Date | null }[]>`
    select min(source_updated_at) as oldest from public.projects where source = 'iati'`;

  // Solr wants UTC with "Z"
  const mark = last ? new Date(last.high_water_mark).toISOString() : null;
  const backfill = !mark;
  // Backfill: newest first, so the cap keeps the most recently updated activities. An unfinished backfill
  // (call limit) resumes below the oldest activity already stored instead of starting over.
  const resumeBelow = backfill && oldest ? new Date(oldest).toISOString() : null;
  const q = !backfill
    ? `${UPDATE_SCOPE} AND last_updated_datetime:[${mark} TO *]`
    : resumeBelow
      ? `${SCOPE} AND last_updated_datetime:[* TO ${resumeBelow}]`
      : SCOPE;
  const sort = backfill ? "last_updated_datetime desc,id asc" : "last_updated_datetime asc,id asc";
  console.log(
    !backfill ? `Changes since ${mark}.` : resumeBelow ? `Backfill, resuming below ${resumeBelow}.` : "Backfill (no previous run).",
    `Listed: ${listed}, room: ${budget.room} (database ${dbMb} MB of ${MAX_DB_MB} MB allowed).`,
  );

  const totals: Totals = { fetched: 0, upserted: 0, relisted: 0, skipped: 0, capped: 0 };
  let highWater: string | null = null;
  let finished = false;

  try {
    for await (const { docs, numFound } of pages(q, IATI_FIELDS.join(","), sort)) {
      if (totals.fetched === 0) {
        console.log(`Matching: ${numFound}`);
        await sql`update public.iati_sync_runs set in_scope = ${numFound} where id = ${runId}`;
      }
      const newest = await importPage(sql, docs, totals, budget);
      if (newest && (!highWater || newest > highWater)) highWater = newest;
      if (backfill && budget.room <= 0) break; // full: newest activities are in, the rest would only be capped
    }
    finished = true;
  } catch (error) {
    if (!(error instanceof QuotaError)) throw error;
    console.warn(`Stopped early: ${error.message}`);
    // Incremental runs go oldest change first, so what we processed is safe to mark as done.
    // An unfinished backfill keeps no mark; the next run resumes it (see resumeBelow).
    if (backfill) highWater = null;
  }

  if (backfill && finished) {
    // The backfill may have taken several runs: incremental updates start from the newest activity stored.
    const [{ newest }] = await sql<{ newest: Date | null }[]>`
      select max(source_updated_at) as newest from public.projects where source = 'iati'`;
    highWater = newest ? new Date(newest).toISOString() : highWater;
  }

  // Top-up: while there is room, continue with older activities below the oldest one stored (newest first).
  // The changes above are done first, so this never delays updates; the call limit simply ends it.
  const topUpFloor = Date.now() - (2 * 365 - 3) * 24 * 3600 * 1000; // RECENT reaches back two years
  if (!backfill && finished && budget.room > 0 && oldest && new Date(oldest).getTime() > topUpFloor) {
    const below = new Date(oldest).toISOString();
    console.log(`Top-up: older activities below ${below}, room ${budget.room}.`);
    let first = true;
    try {
      for await (const { docs, numFound } of pages(
        `${SCOPE} AND last_updated_datetime:[* TO ${below}]`,
        IATI_FIELDS.join(","),
        "last_updated_datetime desc,id asc",
      )) {
        if (first) console.log(`Matching: ${numFound}`);
        first = false;
        await importPage(sql, docs, totals, budget);
        if (budget.room <= 0) break;
      }
    } catch (error) {
      if (!(error instanceof QuotaError)) throw error;
      console.log(`Top-up paused until the next run: ${error.message}`);
    }
  }

  return { ...totals, high_water_mark: highWater, finished };
}

async function runFull(sql: Sql) {
  const scan = await idsInScope();
  console.log(`In scope now: ${scan.ids.size} identifiers (${scan.docs} of ${scan.numFound} records, via ${scan.via}).`);
  if (!scan.complete) {
    throw new Error(`Incomplete list of identifiers (${scan.docs} of ${scan.numFound}); nothing withdrawn.`);
  }

  const listed = await sql<{ iati_identifier: string }[]>`
    select iati_identifier from public.projects where source = 'iati' and visibility = 'public'`;
  const stale = listed.map((row) => row.iati_identifier).filter((id) => !scan.ids.has(id));
  if (listed.length >= 1000 && stale.length > listed.length * MAX_WITHDRAW_SHARE) {
    throw new Error(
      `Would withdraw ${stale.length} of ${listed.length} listed projects, more than ` +
        `${Math.round(MAX_WITHDRAW_SHARE * 100)}% at once; nothing withdrawn. ` +
        "If the scope really changed, run again with a higher IATI_MAX_WITHDRAW_SHARE.",
    );
  }
  for (let i = 0; i < stale.length; i += 1000) {
    // Unlisted: off the map and lists, but the page (and its followers, updates) still opens by link.
    await sql`update public.projects set visibility = 'unlisted'
              where source = 'iati' and iati_identifier = any(${stale.slice(i, i + 1000)})`;
  }
  console.log(`Withdrawn (left the scope or IATI): ${stale.length}`);
  const expired = await expireLocally(sql);
  console.log(`Unlisted by date (not updated for 2 years, or ended more than ${ENDED_GRACE_DAYS} days ago): ${expired}`);

  // Stored but unlisted activities that are in scope again (newest first, while there is room).
  const { room } = await roomLeft(sql);
  const unlisted = await sql<{ iati_identifier: string }[]>`
    select iati_identifier from public.projects
    where source = 'iati' and visibility = 'unlisted'
      and source_updated_at >= now() - interval '2 years'
      and (end_date is null or end_date >= current_date - ${ENDED_GRACE_DAYS}::int)
      and lifecycle_status in ('planned', 'ongoing') and lat is not null
    order by source_updated_at desc`;
  const back = unlisted.map((row) => row.iati_identifier).filter((id) => scan.ids.has(id)).slice(0, room);
  for (let i = 0; i < back.length; i += 1000) {
    await sql`update public.projects set visibility = 'public'
              where source = 'iati' and iati_identifier = any(${back.slice(i, i + 1000)})`;
  }
  console.log(`Listed again (back in scope): ${back.length}`);
  return { withdrawn: stale.length + expired, relisted: back.length, in_scope: scan.ids.size };
}

/** Supabase Free allows 500 MB in total; print how much we use so the cap can be tuned. */
async function logDatabaseSize(sql: Sql) {
  const [size] = await sql<{ database: string; projects: string; rows: number; visible: number }[]>`
    select pg_size_pretty(pg_database_size(current_database())) as database,
           pg_size_pretty(pg_total_relation_size('public.projects')) as projects,
           (select count(*)::int from public.projects where source = 'iati') as rows,
           (select count(*)::int from public.projects where source = 'iati' and visibility = 'public') as visible`;
  console.log(
    `Database: ${size.database} in total; projects table ${size.projects} ` +
      `(${size.rows} imported from IATI, ${size.visible} listed; cap ${MAX_ACTIVITIES}, ` +
      `no new imports above ${MAX_DB_MB} MB).`,
  );
}

// ---------- main ----------

async function main() {
  const mode = (arg("mode") ?? "count") as Mode;
  if (!["count", "dry-run", "incremental", "full"].includes(mode)) throw new Error(`Unknown --mode ${mode}`);
  requireEnv("IATI_API_KEY");

  if (mode === "count") return runCount();
  if (mode === "dry-run") return runDryRun(Math.min(Number(arg("limit") ?? 200), 1000));

  // A full scan lists every identifier: one call if the API allows a facet, otherwise one per 1000.
  if (mode === "full") MAX_CALLS = Number(process.env.IATI_FULL_MAX_CALLS || 80);
  const sql = db();
  try {
    const [{ id: runId }] = await sql<{ id: number }[]>`
      insert into public.iati_sync_runs (mode) values (${mode}) returning id`;
    try {
      const result = mode === "incremental" ? await runIncremental(sql, runId) : await runFull(sql);
      const stoppedEarly = "finished" in result && !result.finished;
      if ("high_water_mark" in result) {
        await sql`update public.iati_sync_runs
          set finished_at = now(), ok = true, high_water_mark = ${result.high_water_mark},
              fetched = ${result.fetched}, upserted = ${result.upserted},
              error = ${stoppedEarly ? "stopped early (call limit), see log" : null}
          where id = ${runId}`;
      } else {
        await sql`update public.iati_sync_runs
          set finished_at = now(), ok = true, withdrawn = ${result.withdrawn}, in_scope = ${result.in_scope}
          where id = ${runId}`;
      }
      console.log(`Done after ${calls} API calls.`, JSON.stringify(result));
      await logDatabaseSize(sql);
    } catch (err) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      await sql`update public.iati_sync_runs set finished_at = now(), ok = false, error = ${message.slice(0, 1000)}
                where id = ${runId}`;
      throw err;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
