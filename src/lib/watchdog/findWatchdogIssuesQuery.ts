import type { Database } from "@/lib/database.types";
import { getServerSupabase } from "@/lib/supabaseServer";
import { ilikeAny } from "@/lib/postgrestSearch";

export const PAGE_SIZE = 25;
export const FILTER_OPTIONS_LIMIT = 2000;

type WatchdogIssueRow = Database["public"]["Tables"]["watchdog_issues"]["Row"];
type SdgRow = Database["public"]["Tables"]["sdgs"]["Row"];

export type WatchdogIssueListRow = Pick<
  WatchdogIssueRow,
  | "id"
  | "title"
  | "description"
  | "country"
  | "region"
  | "city"
  | "latitude"
  | "longitude"
  | "sdgs"
  | "global_challenges"
  | "affected_demographics"
  | "urgency"
  | "date_observed"
  | "created_at"
>;

export type WatchdogIssueMarker = Pick<
  WatchdogIssueRow,
  | "id"
  | "title"
  | "description"
  | "country"
  | "region"
  | "city"
  | "latitude"
  | "longitude"
  | "urgency"
>;

type SortColumn = "created_at" | "urgency" | "title";
type SortDirection = "asc" | "desc";

export type FindWatchdogIssuesParams = {
  q?: string;
  sdgs: number[];
  global_challenges: string[];
  affected_demographics: string[];
  country: string[];
  region: string[];
  urgency_min?: number;
  urgency_max?: number;
  date_from?: string;
  date_to?: string;
  sort: SortColumn;
  dir: SortDirection;
  page: number;
};

export type WatchdogFilterOptions = {
  countries: { value: string; label: string }[];
  regions: { value: string; label: string }[];
  demographics: { value: string; label: string }[];
  sdgs: { value: string; label: string }[];
  globalChallenges: { value: string; label: string }[];
};

type RawSearchParams = Record<string, string | string[] | undefined>;

const SORT_COLUMNS: readonly SortColumn[] = ["created_at", "urgency", "title"];
const SORT_DIRECTIONS: readonly SortDirection[] = ["asc", "desc"];

const isNonEmptyString = (value: string | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

const parseString = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value.find(v => v.trim().length > 0)?.trim();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
};

const parseStringList = (value: string | string[] | undefined): string[] => {
  const raw = Array.isArray(value) ? value : value ? value.split(",") : [];
  return raw.map(v => v.trim()).filter(isNonEmptyString);
};

const parseNumberList = (value: string | string[] | undefined): number[] =>
  parseStringList(value)
    .map(Number)
    .filter(Number.isFinite);

const parseNumber = (value: string | string[] | undefined): number | undefined => {
  const raw = parseString(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parsePage = (value: string | string[] | undefined): number => {
  const parsed = parseNumber(value);
  return !parsed || parsed < 1 ? 1 : Math.floor(parsed);
};

const parseSort = (value: string | string[] | undefined): SortColumn => {
  const parsed = parseString(value);
  return parsed && SORT_COLUMNS.includes(parsed as SortColumn)
    ? (parsed as SortColumn)
    : "created_at";
};

const parseDir = (value: string | string[] | undefined): SortDirection => {
  const parsed = parseString(value);
  return parsed && SORT_DIRECTIONS.includes(parsed as SortDirection)
    ? (parsed as SortDirection)
    : "desc";
};

const parseDate = (value: string | string[] | undefined): string | undefined =>
  parseString(value);

export function parseFindWatchdogIssuesSearchParams(
  searchParams: RawSearchParams,
): FindWatchdogIssuesParams {
  return {
    q: parseString(searchParams.q),
    sdgs: parseNumberList(searchParams.sdgs),
    global_challenges: parseStringList(searchParams.global_challenges),
    affected_demographics: parseStringList(searchParams.demographics),
    country: parseStringList(searchParams.country),
    region: parseStringList(searchParams.region),
    urgency_min: parseNumber(searchParams.urgency_min),
    urgency_max: parseNumber(searchParams.urgency_max),
    date_from: parseDate(searchParams.date_from),
    date_to: parseDate(searchParams.date_to),
    sort: parseSort(searchParams.sort),
    dir: parseDir(searchParams.dir),
    page: parsePage(searchParams.page),
  };
}

export async function fetchWatchdogIssues({
  searchParams,
}: {
  searchParams: RawSearchParams;
}): Promise<{
  rows: WatchdogIssueListRow[];
  count: number;
  page: number;
  pageCount: number;
}> {
  const params = parseFindWatchdogIssuesSearchParams(searchParams);
  const supabase = await getServerSupabase();

  let query = supabase
    .from("watchdog_issues")
    .select(
      "id,title,description,country,region,city,latitude,longitude,sdgs,global_challenges,affected_demographics,urgency,date_observed,created_at",
      { count: "exact" },
    )
    .eq("status", "approved");

  if (params.q) {
    query = query.or(ilikeAny(["title", "description"], params.q));
  }

  if (params.country.length) query = query.in("country", params.country);
  if (params.region.length) query = query.in("region", params.region);

  if (params.sdgs.length) query = query.overlaps("sdgs", params.sdgs);

  if (params.global_challenges.length) query = query.overlaps("global_challenges", params.global_challenges);

  if (params.affected_demographics.length) query = query.overlaps("affected_demographics", params.affected_demographics);

  if (typeof params.urgency_min === "number") {
    query = query.gte("urgency", params.urgency_min);
  }

  if (typeof params.urgency_max === "number") {
    query = query.lte("urgency", params.urgency_max);
  }

  if (params.date_from) query = query.gte("date_observed", params.date_from);
  if (params.date_to) query = query.lte("date_observed", params.date_to);

  query = query.order(params.sort, { ascending: params.dir === "asc" });

  const offset = (params.page - 1) * PAGE_SIZE;
  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as WatchdogIssueListRow[];
  const totalCount = count ?? rows.length;
  const pageCount = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 0;

  return { rows, count: totalCount, page: params.page, pageCount };
}

export async function fetchWatchdogMarkers({
  searchParams,
  limit,
}: {
  searchParams: RawSearchParams;
  limit?: number;
}): Promise<WatchdogIssueMarker[]> {
  const params = parseFindWatchdogIssuesSearchParams(searchParams);
  const supabase = await getServerSupabase();

  let query = supabase
    .from("watchdog_issues")
    .select("id,title,description,country,region,city,latitude,longitude,urgency")
    .eq("status", "approved");

  if (params.q) {
    query = query.or(ilikeAny(["title", "description"], params.q));
  }

  if (params.country.length) query = query.in("country", params.country);
  if (params.region.length) query = query.in("region", params.region);

  if (params.sdgs.length) query = query.overlaps("sdgs", params.sdgs);

  if (params.global_challenges.length) query = query.overlaps("global_challenges", params.global_challenges);

  if (params.affected_demographics.length) query = query.overlaps("affected_demographics", params.affected_demographics);

  if (typeof params.urgency_min === "number") {
    query = query.gte("urgency", params.urgency_min);
  }

  if (typeof params.urgency_max === "number") {
    query = query.lte("urgency", params.urgency_max);
  }

  if (params.date_from) query = query.gte("date_observed", params.date_from);
  if (params.date_to) query = query.lte("date_observed", params.date_to);

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as WatchdogIssueMarker[];
}

export async function fetchWatchdogFilterOptions(): Promise<WatchdogFilterOptions> {
  const supabase = await getServerSupabase();

  const [locationsRes, sdgRes, ifrcRes] = await Promise.all([
    supabase
      .from("watchdog_issues")
      .select("country,region,affected_demographics")
      .eq("status", "approved")
      .limit(FILTER_OPTIONS_LIMIT),
    supabase.from("sdgs").select("id,name").order("id"),
    supabase.from("ifrc_challenges").select("id,name").order("name"),
  ]);

  const countrySet = new Set<string>();
  const regionSet = new Set<string>();
  const demographicSet = new Set<string>();

  (locationsRes.data ?? []).forEach(row => {
    if (row.country) countrySet.add(row.country);
    if (row.region) regionSet.add(row.region);
    (row.affected_demographics ?? []).forEach((tag: string) =>
      demographicSet.add(tag),
    );
  });

  const toOptions = (values: Set<string>) =>
    Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map(value => ({ value, label: value }));

  const sdgOptions = (sdgRes.data ?? []).map((sdg: SdgRow) => ({
    value: String(sdg.id),
    label: sdg.name ? `${sdg.id}. ${sdg.name}` : `SDG ${sdg.id}`,
  }));

  const ifrcOptions = (ifrcRes.data ?? []).map(challenge => ({
    value: String(challenge.id),
    label: challenge.name ?? String(challenge.id),
  }));

  return {
    countries: toOptions(countrySet),
    regions: toOptions(regionSet),
    demographics: toOptions(demographicSet),
    sdgs: sdgOptions,
    globalChallenges: ifrcOptions,
  };
}
