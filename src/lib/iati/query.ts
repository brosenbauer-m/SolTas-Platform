import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { countryCodeFromName } from "@/lib/geo/countries";
import { ensureSupabaseConfig } from "@/lib/supabaseConfig";

/**
 * Read-only access to activities imported from IATI (public.iati_activities, public read via RLS).
 * Uses a cookie-less anon client so responses can be cached by the CDN.
 * Plan: docs/architecture/iati-integration.md.
 */

export type IatiActivity = Database["public"]["Tables"]["iati_activities"]["Row"];
type RawSearchParams = Record<string, string | string[] | undefined>;

export type ProjectSource = "all" | "community" | "iati";

export type IatiFilters = {
  q?: string;
  humanitarian?: boolean;
  stages: string[];
  countryCodes: string[];
};

/** Filters of Find Projects that IATI data doesn't have; when one is set, IATI activities are left out. */
const COMMUNITY_ONLY_PARAMS = [
  "thematic_area",
  "region",
  "type_of_intervention",
  "target_demographic",
  "partner_org_ids",
  "min_needed",
  "max_needed",
  "currency",
  "min_received",
  "max_received",
  "min_lives",
  "max_lives",
  "start_from",
  "end_to",
] as const;

const PAGE_SIZE = 25;
const MAX_POINTS = 30_000;
const POINT_PAGE = 1000; // PostgREST returns at most 1000 rows per request

function str(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function strList(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? value.split(",") : [];
  return raw.map((item) => item.trim()).filter(Boolean);
}

export function parseSource(params: RawSearchParams): ProjectSource {
  const source = str(params.source);
  return source === "community" || source === "iati" ? source : "all";
}

/**
 * IATI filters from the Find Projects URL, or null when IATI activities should not be shown
 * (source = community, or a filter only community projects have).
 */
export function parseIatiFilters(params: RawSearchParams): IatiFilters | null {
  if (parseSource(params) === "community") return null;
  if (COMMUNITY_ONLY_PARAMS.some((key) => str(params[key]))) return null;

  const categories = strList(params.category ?? params.type);
  const humanitarian =
    categories.length === 1 && categories[0] === "humanitarian"
      ? true
      : categories.length === 1 && categories[0] === "environmental"
        ? false
        : undefined;

  const countryNames = strList(params.country);
  const countryCodes = countryNames.map(countryCodeFromName).filter((code): code is string => Boolean(code));
  // A country we can't map to a code (typo, old name) would otherwise silently show everything.
  if (countryNames.length && !countryCodes.length) return null;

  return { q: str(params.q), humanitarian, stages: strList(params.stage), countryCodes };
}

/** True when a community-only filter is hiding IATI activities (for an explanatory note). */
export function iatiHiddenByFilters(params: RawSearchParams): boolean {
  return parseSource(params) !== "community" && COMMUNITY_ONLY_PARAMS.some((key) => str(params[key]));
}

function publicClient() {
  const { url, anonKey } = ensureSupabaseConfig();
  return createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function escapeLike(value: string) {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`).replace(/[,()]/g, " ");
}

// Generic over the PostgREST builder so every query gets the same filters.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters<Q extends { or: any; eq: any; in: any; overlaps: any }>(query: Q, filters: IatiFilters): Q {
  let next = query;
  if (filters.q) {
    const q = escapeLike(filters.q);
    next = next.or(`title.ilike.%${q}%,reporting_org_name.ilike.%${q}%`);
  }
  if (typeof filters.humanitarian === "boolean") next = next.eq("humanitarian", filters.humanitarian);
  if (filters.stages.length) next = next.in("lifecycle_status", filters.stages);
  if (filters.countryCodes.length) next = next.overlaps("countries", filters.countryCodes);
  return next;
}

export async function countIatiActivities(filters: IatiFilters): Promise<number> {
  const query = applyFilters(
    publicClient().from("iati_activities").select("iati_identifier", { count: "exact", head: true }),
    filters,
  );
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export type IatiPoint = { id: string; lat: number; lng: number; approximate: boolean };

/** Every map point matching the filters (paged through PostgREST's 1000-row limit, in parallel). */
export async function fetchIatiPoints(filters: IatiFilters): Promise<IatiPoint[]> {
  const supabase = publicClient();
  const base = () =>
    applyFilters(
      supabase.from("iati_activities").select("iati_identifier,lat,lng,point_precision").not("lat", "is", null),
      filters,
    ).order("iati_identifier");

  const total = Math.min(await countIatiActivities(filters), MAX_POINTS);
  const offsets = Array.from({ length: Math.ceil(total / POINT_PAGE) }, (_, i) => i * POINT_PAGE);
  const points: IatiPoint[] = [];

  for (let i = 0; i < offsets.length; i += 6) {
    const pages = await Promise.all(
      offsets.slice(i, i + 6).map(async (from) => {
        const { data, error } = await base().range(from, from + POINT_PAGE - 1);
        if (error) throw error;
        return data ?? [];
      }),
    );
    for (const row of pages.flat()) {
      if (row.lat == null || row.lng == null) continue;
      points.push({ id: row.iati_identifier, lat: row.lat, lng: row.lng, approximate: row.point_precision !== "exact" });
    }
  }
  return points;
}

export type IatiListRow = Pick<
  IatiActivity,
  "iati_identifier" | "title" | "reporting_org_name" | "countries" | "lifecycle_status" | "humanitarian" | "last_updated_at"
>;

export async function fetchIatiList(filters: IatiFilters, page: number) {
  const from = (Math.max(page, 1) - 1) * PAGE_SIZE;
  const query = applyFilters(
    publicClient()
      .from("iati_activities")
      .select("iati_identifier,title,reporting_org_name,countries,lifecycle_status,humanitarian,last_updated_at", {
        count: "exact",
      }),
    filters,
  )
    .order("last_updated_at", { ascending: false, nullsFirst: false })
    .range(from, from + PAGE_SIZE - 1);
  const { data, count, error } = await query;
  if (error) throw error;
  const total = count ?? 0;
  return { rows: (data ?? []) as IatiListRow[], count: total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function fetchIatiActivity(identifier: string): Promise<IatiActivity | null> {
  const { data, error } = await publicClient()
    .from("iati_activities")
    .select("*")
    .eq("iati_identifier", identifier)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** URL of an IATI activity page on this site. */
export function iatiActivityHref(identifier: string) {
  return `/projects/iati/${encodeURIComponent(identifier)}`;
}

/** Route params may arrive still percent-encoded; identifiers never contain a literal "%". */
export function decodeIdentifier(param: string) {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}
