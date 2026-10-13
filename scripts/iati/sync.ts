// IATI sync: copies humanitarian/environmental activities from the IATI Datastore API into public.iati_activities.
// Plan: docs/architecture/iati-integration.md. Runs in GitHub Actions (.github/workflows/iati-sync.yml).
//
//   pnpm sync:iati --mode count                 how many activities are in scope (+ 2 samples). No DB needed.
//   pnpm sync:iati --mode dry-run --limit 200   fetch + transform, print stats and samples. No DB needed.
//   pnpm sync:iati --mode incremental           first run: backfill (newest first, capped). Then: changes since last run.
//   pnpm sync:iati --mode full                  withdraw activities that left the scope (identifiers only).
//
// Env: IATI_API_KEY (always); SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (incremental/full).
// Optional: IATI_MAX_ACTIVITIES (default 25000, Supabase Free plan), IATI_ROWS (default 1000 per call),
//           IATI_MAX_CALLS (default 40 per run; the free "Exploratory" key allows 5 calls/min and 100/week).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { IATI_FIELDS, sectorShare, transformActivity, type IatiActivityRow, type IatiDoc } from "./transform";

const API_BASE = process.env.IATI_API_BASE || "https://api.iatistandard.org/datastore";
const MAX_ACTIVITIES = Number(process.env.IATI_MAX_ACTIVITIES || 25000);
const ROWS = Number(process.env.IATI_ROWS || 1000);
const MAX_CALLS = Number(process.env.IATI_MAX_CALLS || 40);
const ID_ROWS = Number(process.env.IATI_ID_ROWS || 5000); // identifiers only, so pages can be bigger
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

/** Pages through a query with Solr's cursorMark (falls back to start/rows if the API ignores it). */
async function* pages(q: string, fl: string, sort: string, rows = ROWS) {
  let cursor = "*";
  let start = 0;
  for (;;) {
    const data = await solr({ q, fl, sort, rows: String(rows), cursorMark: cursor });
    const docs = data.response?.docs ?? [];
    yield { docs, numFound: data.response?.numFound ?? 0 };
    if (docs.length < rows) return;
    if (data.nextCursorMark) {
      if (data.nextCursorMark === cursor) return;
      cursor = data.nextCursorMark;
    } else {
      start += rows;
      if (start >= (data.response?.numFound ?? 0)) return;
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
    yield { docs, numFound: data.response?.numFound ?? 0 };
    start += rows;
    if (docs.length < rows || start >= (data.response?.numFound ?? 0)) return;
  }
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
  console.log(`In scope (planned/ongoing, themed, with a place): ${inScope.response.numFound}`);
  const exact = await solr({ q: `${SCOPE} AND location_point_pos:[* TO *]`, rows: "0" });
  console.log(`  ... of which with exact map points: ${exact.response.numFound}`);
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const weekly = await solr({ q: `${UPDATE_SCOPE} AND last_updated_datetime:[${since} TO *]`, rows: "0" });
  console.log(`Updated in the last 7 days (any status, same themes): ${weekly.response.numFound}`);
  console.log(`Cap (IATI_MAX_ACTIVITIES): ${MAX_ACTIVITIES}; rows per call: ${ROWS}`);
  for (const doc of inScope.response.docs) {
    console.log("\nSample (raw):", JSON.stringify(doc).slice(0, 2000));
    console.log("Sample (row):", JSON.stringify(transformActivity(doc), null, 2));
  }
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
  console.log(`Fetched ${data.response.docs.length} of ${data.response.numFound} in scope.`);
  console.log("Stats:", JSON.stringify(stats(rows), null, 2));
  console.log("Skipped:", JSON.stringify(skipped));
  for (const row of rows.slice(0, 3)) console.log("\nSample row:", JSON.stringify(row, null, 2));
}

function db(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function existingIds(supabase: SupabaseClient, ids: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase
      .from("iati_activities")
      .select("iati_identifier")
      .in("iati_identifier", ids.slice(i, i + 100));
    if (error) throw error;
    for (const row of data ?? []) found.add(row.iati_identifier as string);
  }
  return found;
}

async function runIncremental(supabase: SupabaseClient, runId: number) {
  const { data: last, error: lastError } = await supabase
    .from("iati_sync_runs")
    .select("high_water_mark")
    .in("mode", ["incremental", "full"])
    .eq("ok", true)
    .not("high_water_mark", "is", null)
    .order("high_water_mark", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;

  const { count: stored, error: countError } = await supabase
    .from("iati_activities")
    .select("iati_identifier", { count: "exact", head: true });
  if (countError) throw countError;

  // Solr wants UTC with "Z" (Postgres returns "+00:00")
  const mark = last?.high_water_mark ? new Date(last.high_water_mark as string).toISOString() : null;
  const backfill = !mark;
  // Backfill: newest first, so the cap keeps the most recently updated activities.
  const q = backfill ? SCOPE : `${UPDATE_SCOPE} AND last_updated_datetime:[${mark} TO *]`;
  const sort = backfill ? "last_updated_datetime desc,id asc" : "last_updated_datetime asc,id asc";
  let room = MAX_ACTIVITIES - (stored ?? 0);
  console.log(backfill ? "Backfill (no previous run)." : `Changes since ${mark}.`, `Stored: ${stored}, room: ${room}.`);

  const totals = { fetched: 0, upserted: 0, skipped: 0, capped: 0 };
  let highWater: string | null = null;
  let finished = false;

  try {
    for await (const { docs, numFound } of pages(q, IATI_FIELDS.join(","), sort)) {
      if (totals.fetched === 0) {
        console.log(`Matching: ${numFound}`);
        await supabase.from("iati_sync_runs").update({ in_scope: numFound }).eq("id", runId);
      }
      totals.fetched += docs.length;

      const rows: IatiActivityRow[] = [];
      const docsById = new Map<string, IatiDoc>();
      for (const doc of docs) {
        const result = transformActivity(doc);
        if ("skip" in result) totals.skipped++;
        else {
          rows.push(result.row);
          docsById.set(result.row.iati_identifier, doc);
        }
        const updated = "row" in result ? result.row.last_updated_at : null;
        if (updated && (!highWater || updated > highWater)) highWater = updated;
      }

      const known = await existingIds(supabase, rows.map((r) => r.iati_identifier));
      const keep = rows.filter((row) => {
        if (known.has(row.iati_identifier)) return true; // always update what we already show
        if (rejectReason(row, docsById.get(row.iati_identifier) ?? {})) {
          totals.skipped++;
          return false;
        }
        if (room <= 0) {
          totals.capped++;
          return false;
        }
        room--;
        return true;
      });

      const now = new Date().toISOString();
      for (let i = 0; i < keep.length; i += UPSERT_CHUNK) {
        const chunk = keep.slice(i, i + UPSERT_CHUNK).map((row) => ({ ...row, synced_at: now, withdrawn_at: null }));
        const { error } = await supabase.from("iati_activities").upsert(chunk, { onConflict: "iati_identifier" });
        if (error) throw error;
        totals.upserted += chunk.length;
      }
      console.log(`  fetched ${totals.fetched}, upserted ${totals.upserted}, skipped ${totals.skipped}, over cap ${totals.capped}`);
      if (backfill && room <= 0) break; // full: newest activities are in, the rest would only be capped
    }
    finished = true;
  } catch (error) {
    if (!(error instanceof QuotaError)) throw error;
    console.warn(`Stopped early: ${error.message}`);
    // Incremental runs go oldest change first, so what we processed is safe to mark as done.
    // An unfinished backfill keeps no mark, so the next run starts the backfill again (upserts are idempotent).
    if (backfill) highWater = null;
  }

  return { ...totals, high_water_mark: highWater, finished };
}

async function runFull(supabase: SupabaseClient) {
  const inScope = new Set<string>();
  for await (const { docs } of pages(SCOPE, "iati_identifier", "id asc", ID_ROWS)) {
    for (const doc of docs) {
      const id = typeof doc.iati_identifier === "string" ? doc.iati_identifier : null;
      if (id) inScope.add(id.trim());
    }
  }
  console.log(`In scope now: ${inScope.size}`);

  const stale: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("iati_activities")
      .select("iati_identifier")
      .is("withdrawn_at", null)
      .order("iati_identifier")
      .range(from, from + 999);
    if (error) throw error;
    for (const row of data ?? []) if (!inScope.has(row.iati_identifier as string)) stale.push(row.iati_identifier as string);
    if (!data || data.length < 1000) break;
  }

  const now = new Date().toISOString();
  for (let i = 0; i < stale.length; i += 100) {
    const { error } = await supabase
      .from("iati_activities")
      .update({ withdrawn_at: now })
      .in("iati_identifier", stale.slice(i, i + 100));
    if (error) throw error;
  }
  console.log(`Withdrawn (left the scope or IATI): ${stale.length}`);
  return { withdrawn: stale.length, in_scope: inScope.size };
}

// ---------- main ----------

async function main() {
  const mode = (arg("mode") ?? "count") as Mode;
  if (!["count", "dry-run", "incremental", "full"].includes(mode)) throw new Error(`Unknown --mode ${mode}`);
  requireEnv("IATI_API_KEY");

  if (mode === "count") return runCount();
  if (mode === "dry-run") return runDryRun(Math.min(Number(arg("limit") ?? 200), 1000));

  const supabase = db();
  const { data: run, error } = await supabase.from("iati_sync_runs").insert({ mode }).select("id").single();
  if (error) throw error;
  const runId = run.id as number;

  try {
    const result = mode === "incremental" ? await runIncremental(supabase, runId) : await runFull(supabase);
    await supabase
      .from("iati_sync_runs")
      .update({
        finished_at: new Date().toISOString(),
        ok: true,
        ...("high_water_mark" in result
          ? { high_water_mark: result.high_water_mark, fetched: result.fetched, upserted: result.upserted }
          : { withdrawn: result.withdrawn, in_scope: result.in_scope }),
        error: "finished" in result && !result.finished ? "stopped early (call limit), see log" : null,
      })
      .eq("id", runId);
    console.log(`Done after ${calls} API calls.`, JSON.stringify(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    await supabase
      .from("iati_sync_runs")
      .update({ finished_at: new Date().toISOString(), ok: false, error: message.slice(0, 1000) })
      .eq("id", runId);
    throw err;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
