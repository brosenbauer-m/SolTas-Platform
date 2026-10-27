import type { Database } from "@/lib/database.types";
import { getPublicSupabase } from "@/lib/supabasePublic";
import { getServerSupabase } from "@/lib/supabaseServer";
import { IATI_ORG_ID } from "@/lib/iati/systemOrg";
import { ilikeAny } from "@/lib/postgrestSearch";

export const PAGE_SIZE = 25;

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

export type ProjectListRow = Pick<
  ProjectRow,
  | "id"
  | "slug"
  | "name"
  | "category"
  | "source"
  | "place_name"
  | "region"
  | "country"
  | "start_date"
  | "end_date"
  | "donations_received"
  | "amount_needed"
  | "currency"
  | "thematic_area"
  | "type_of_intervention"
  | "partner_org_ids"
  | "target_demographic"
>;

export type ProjectMarker = Pick<
  ProjectRow,
  "id" | "slug" | "name" | "category" | "lat" | "lng" | "place_name" | "description"
>;

type SortColumn = "created_at" | "name" | "amount_needed" | "donations_received" | "start_date";

type SortDirection = "asc" | "desc";

export type FindProjectsParams = {
  q?: string;
  category: string[];
  type: string[];
  country: string[];
  region: string[];
  currency: string[];
  thematic_area: string[];
  type_of_intervention: string[];
  target_demographic: string[];
  partner_org_ids: string[];
  lifecycle_status: string[];
  /** community = added on the platform, iati = imported from IATI; undefined = both */
  source?: "community" | "iati";
  min_needed?: number;
  max_needed?: number;
  min_received?: number;
  max_received?: number;
  min_lives?: number;
  max_lives?: number;
  start_from?: string;
  end_to?: string;
  sort: SortColumn;
  dir: SortDirection;
  page: number;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

const SORT_COLUMNS: readonly SortColumn[] = [
  "created_at",
  "name",
  "amount_needed",
  "donations_received",
  "start_date",
];

const SORT_DIRECTIONS: readonly SortDirection[] = ["asc", "desc"];

const isNonEmptyString = (value: string | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

const parseString = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value.find(item => item.trim().length > 0)?.trim();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
};

const parseStringList = (value: string | string[] | undefined): string[] => {
  const raw = Array.isArray(value) ? value : value ? value.split(",") : [];
  return raw.map(item => item.trim()).filter(isNonEmptyString);
};

const parseNumber = (value: string | string[] | undefined): number | undefined => {
  const raw = parseString(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parsePage = (value: string | string[] | undefined): number => {
  const parsed = parseNumber(value);
  if (!parsed || parsed < 1) return 1;
  return Math.floor(parsed);
};

const parseSort = (value: string | string[] | undefined): SortColumn => {
  const parsed = parseString(value);
  if (parsed && SORT_COLUMNS.includes(parsed as SortColumn)) {
    return parsed as SortColumn;
  }
  return "created_at";
};

const parseDir = (value: string | string[] | undefined): SortDirection => {
  const parsed = parseString(value);
  if (parsed && SORT_DIRECTIONS.includes(parsed as SortDirection)) {
    return parsed as SortDirection;
  }
  return "desc";
};

const parseDate = (value: string | string[] | undefined): string | undefined => {
  const parsed = parseString(value);
  if (!parsed) return undefined;
  return parsed;
};

const parseSource = (value: string | string[] | undefined): FindProjectsParams["source"] => {
  const parsed = parseString(value);
  return parsed === "community" || parsed === "iati" ? parsed : undefined;
};

export function parseFindProjectsSearchParams(searchParams: RawSearchParams): FindProjectsParams {
  return {
    q: parseString(searchParams.q),
    category: parseStringList(searchParams.category),
    type: parseStringList(searchParams.type),
    country: parseStringList(searchParams.country),
    region: parseStringList(searchParams.region),
    currency: parseStringList(searchParams.currency),
    thematic_area: parseStringList(searchParams.thematic_area),
    type_of_intervention: parseStringList(searchParams.type_of_intervention),
    target_demographic: parseStringList(searchParams.target_demographic),
    partner_org_ids: parseStringList(searchParams.partner_org_ids),
    lifecycle_status: parseStringList(searchParams.stage),
    source: parseSource(searchParams.source),
    min_needed: parseNumber(searchParams.min_needed),
    max_needed: parseNumber(searchParams.max_needed),
    min_received: parseNumber(searchParams.min_received),
    max_received: parseNumber(searchParams.max_received),
    min_lives: parseNumber(searchParams.min_lives),
    max_lives: parseNumber(searchParams.max_lives),
    start_from: parseDate(searchParams.start_from),
    end_to: parseDate(searchParams.end_to),
    sort: parseSort(searchParams.sort),
    dir: parseDir(searchParams.dir),
    page: parsePage(searchParams.page),
  };
}

/**
 * Filters shared by the list, the counts and the map points, so they always agree.
 * Generic over the PostgREST builder; every method used here exists on it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyProjectFilters<Q extends Record<string, any>>(query: Q, params: FindProjectsParams): Q {
  const categoryFilters = params.category.length ? params.category : params.type;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = query;
  if (params.source) {
    q = q.eq("source", params.source);
  }

  if (params.q) {
    q = q.or(ilikeAny(["name", "place_name"], params.q));
  }

  if (categoryFilters.length) {
    q = q.in("category", categoryFilters);
  }

  if (params.country.length) {
    q = q.in("country", params.country);
  }

  if (params.region.length) {
    q = q.in("region", params.region);
  }

  if (params.currency.length) {
    q = q.in("currency", params.currency);
  }

  if (params.target_demographic.length) {
    q = q.in("target_demographic", params.target_demographic);
  }

  if (params.thematic_area.length) {
    q = q.overlaps("thematic_area", params.thematic_area);
  }

  if (params.type_of_intervention.length) {
    q = q.overlaps("type_of_intervention", params.type_of_intervention);
  }

  if (params.partner_org_ids.length) {
    q = q.overlaps("partner_org_ids", params.partner_org_ids);
  }

  if (params.lifecycle_status.length) {
    q = q.in("lifecycle_status", params.lifecycle_status);
  }

  if (typeof params.min_needed === "number") {
    q = q.gte("amount_needed", params.min_needed);
  }

  if (typeof params.max_needed === "number") {
    q = q.lte("amount_needed", params.max_needed);
  }

  if (typeof params.min_received === "number") {
    q = q.gte("donations_received", params.min_received);
  }

  if (typeof params.max_received === "number") {
    q = q.lte("donations_received", params.max_received);
  }

  if (typeof params.min_lives === "number") {
    q = q.gte("lives_improved", params.min_lives);
  }

  if (typeof params.max_lives === "number") {
    q = q.lte("lives_improved", params.max_lives);
  }

  if (params.start_from) {
    q = q.gte("start_date", params.start_from);
  }

  if (params.end_to) {
    q = q.lte("end_date", params.end_to);
  }

  return q as Q;
}

export async function fetchFindProjects({
  searchParams,
}: {
  searchParams: RawSearchParams;
}): Promise<{
  rows: ProjectListRow[];
  count: number;
  page: number;
  pageCount: number;
}> {
  const params = parseFindProjectsSearchParams(searchParams);
  const supabase = await getServerSupabase();

  let query = supabase
    .from("projects")
    .select(
      "id,slug,name,category,source,place_name,region,country,start_date,end_date,donations_received,amount_needed,currency,thematic_area,type_of_intervention,partner_org_ids,target_demographic",
      { count: "exact" },
    );

  // Lists show only approved, public projects, for everyone (owners see their drafts on their own pages).
  query = query.eq("visibility", "public").eq("status", "approved");

  query = applyProjectFilters(query, params);

  query = query.order(params.sort, { ascending: params.dir === "asc" });

  const offset = (params.page - 1) * PAGE_SIZE;
  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data, count, error } = await query;

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as ProjectListRow[];
  const totalCount = count ?? rows.length;
  const pageCount = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 0;

  return {
    rows,
    count: totalCount,
    page: params.page,
    pageCount,
  };
}

export type ProjectPoint = {
  slug: string;
  lat: number;
  lng: number;
  category: string;
  /** true when the point is only the country centre (imported projects without an exact location) */
  approximate: boolean;
};

const POINT_PAGE = 1000; // PostgREST returns at most 1000 rows per request
const MAX_POINTS = 150_000;
const PARALLEL_PAGES = 10;

/**
 * Every approved, listed project with a location that matches the Find Projects filters, for the clustered
 * map layer (community and imported projects alike). Public data only, so the result can be CDN-cached.
 */
export async function fetchProjectPoints(searchParams: RawSearchParams): Promise<ProjectPoint[]> {
  const params = parseFindProjectsSearchParams(searchParams);
  const supabase = getPublicSupabase();
  const base = <T extends string>(columns: T, head = false) =>
    applyProjectFilters(
      supabase
        .from("projects")
        .select(columns, head ? { count: "exact", head: true } : undefined)
        .eq("visibility", "public")
        .eq("status", "approved")
        .not("lat", "is", null)
        .not("lng", "is", null),
      params,
    );

  const { count, error: countError } = await base("id", true);
  if (countError) throw countError;
  const total = Math.min(count ?? 0, MAX_POINTS);
  const offsets = Array.from({ length: Math.ceil(total / POINT_PAGE) }, (_, i) => i * POINT_PAGE);

  const points: ProjectPoint[] = [];
  for (let i = 0; i < offsets.length; i += PARALLEL_PAGES) {
    const pages = await Promise.all(
      offsets.slice(i, i + PARALLEL_PAGES).map(async (from) => {
        const { data, error } = await base("id,slug,lat,lng,category,point_precision")
          .order("id")
          .range(from, from + POINT_PAGE - 1);
        if (error) throw error;
        return data ?? [];
      }),
    );
    for (const row of pages.flat()) {
      if (row.lat == null || row.lng == null) continue;
      points.push({
        slug: row.slug ?? row.id,
        lat: row.lat,
        lng: row.lng,
        category: row.category,
        approximate: row.point_precision === "country" || row.point_precision === "region",
      });
    }
  }
  return points;
}

export type ProjectAtSpot = {
  slug: string;
  name: string;
  category: string;
  source: string;
  place: string | null;
  organisation: string | null;
};

type SpotRow = {
  slug: string | null;
  id: string;
  name: string;
  category: string;
  source: string;
  place_name: string | null;
  country: string | null;
  source_data: unknown;
  lead_org: { name: string | null } | { name: string | null }[] | null;
};

/**
 * The projects at one spot of the map (same rounded coordinates as /api/projects/points), with the page's
 * filters, A-Z. For the popup of a dot that stands for several projects.
 */
export async function fetchProjectsAt(
  searchParams: RawSearchParams,
  lng: number,
  lat: number,
  limit = 100,
): Promise<{ total: number; country: string | null; items: ProjectAtSpot[] }> {
  const params = parseFindProjectsSearchParams(searchParams);
  const half = 0.00005; // points are rounded to 4 decimals
  const { data, count, error } = await applyProjectFilters(
    getPublicSupabase()
      .from("projects")
      .select(
        "id,slug,name,category,source,place_name,country,source_data,lead_org:organisations!projects_lead_org_id_fkey(name)",
        { count: "exact" },
      )
      .eq("visibility", "public")
      .eq("status", "approved")
      .gte("lng", lng - half)
      .lt("lng", lng + half)
      .gte("lat", lat - half)
      .lt("lat", lat + half),
    params,
  )
    .order("name")
    .range(0, limit - 1);
  if (error) throw error;
  const rows = (data ?? []) as unknown as SpotRow[];
  const countries = new Set(rows.map((row) => row.country).filter(Boolean));
  return {
    total: count ?? rows.length,
    country: countries.size === 1 ? ([...countries][0] as string) : null,
    items: rows.map((row) => {
      const leadOrg = Array.isArray(row.lead_org) ? row.lead_org[0] : row.lead_org;
      const reporting = (row.source_data as { reporting_org?: { name?: string | null } } | null)?.reporting_org?.name;
      return {
        slug: row.slug ?? row.id,
        name: row.name,
        category: row.category,
        source: row.source,
        place: row.place_name ?? row.country,
        organisation: row.source === "iati" ? (reporting ?? null) : (leadOrg?.name ?? null),
      };
    }),
  };
}

export type ProjectFilterOptions = {
  countries: { value: string; label: string }[];
  regions: { value: string; label: string }[];
  thematic: { value: string; label: string }[];
  interventions: { value: string; label: string }[];
  demographics: { value: string; label: string }[];
  organisations: { value: string; label: string }[];
};

const uniqueSorted = (values: Array<string | null | undefined>) => {
  const seen = new Map<string, string>();
  for (const raw of values) {
    const value = raw?.trim();
    if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
  }
  return Array.from(seen.values())
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }));
};

/** Values that actually occur on public projects, for the filter dropdowns. */
export async function fetchProjectFilterOptions(): Promise<ProjectFilterOptions> {
  const supabase = await getServerSupabase();
  const [{ data: rows }, { data: orgs }] = await Promise.all([
    supabase
      .from("projects")
      .select("country,region,thematic_area,type_of_intervention,target_demographic")
      .eq("visibility", "public")
      .eq("status", "approved")
      .limit(2000),
    supabase.from("organisations_directory_v1").select("id,name").neq("id", IATI_ORG_ID).order("name").limit(1000),
  ]);

  const list = rows ?? [];
  return {
    countries: uniqueSorted(list.map((r) => r.country)),
    regions: uniqueSorted(list.map((r) => r.region)),
    thematic: uniqueSorted(list.flatMap((r) => r.thematic_area ?? [])),
    interventions: uniqueSorted(list.flatMap((r) => r.type_of_intervention ?? [])),
    demographics: uniqueSorted(list.map((r) => r.target_demographic)),
    organisations: (orgs ?? [])
      .filter((o): o is { id: string; name: string } => Boolean(o.id && o.name))
      .map((o) => ({ value: o.id, label: o.name })),
  };
}
