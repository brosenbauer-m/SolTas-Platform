import type { Database } from "@/lib/database.types";
import { getServerSupabase } from "@/lib/supabaseServer";

export const PAGE_SIZE = 25;

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

export type ProjectListRow = Pick<
  ProjectRow,
  | "id"
  | "slug"
  | "name"
  | "category"
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
  const categoryFilters = params.category.length ? params.category : params.type;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("projects")
    .select(
      "id,slug,name,category,place_name,region,country,start_date,end_date,donations_received,amount_needed,currency,thematic_area,type_of_intervention,partner_org_ids,target_demographic",
      { count: "exact" },
    );

  // Unlisted/private projects are reachable by link only, never listed.
  query = query.eq("visibility", "public");

  if (!user) {
    query = query.eq("status", "approved");
  }

  if (params.q) {
    const escaped = params.q.replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.or(`name.ilike.%${escaped}%,place_name.ilike.%${escaped}%`);
  }

  if (categoryFilters.length) {
    query = query.in("category", categoryFilters);
  }

  if (params.country.length) {
    query = query.in("country", params.country);
  }

  if (params.region.length) {
    query = query.in("region", params.region);
  }

  if (params.currency.length) {
    query = query.in("currency", params.currency);
  }

  if (params.target_demographic.length) {
    query = query.in("target_demographic", params.target_demographic);
  }

  if (params.thematic_area.length) {
    params.thematic_area.forEach(value => {
      query = query.contains("thematic_area", [value]);
    });
  }

  if (params.type_of_intervention.length) {
    params.type_of_intervention.forEach(value => {
      query = query.contains("type_of_intervention", [value]);
    });
  }

  if (params.partner_org_ids.length) {
    params.partner_org_ids.forEach(value => {
      query = query.contains("partner_org_ids", [value]);
    });
  }

  if (typeof params.min_needed === "number") {
    query = query.gte("amount_needed", params.min_needed);
  }

  if (typeof params.max_needed === "number") {
    query = query.lte("amount_needed", params.max_needed);
  }

  if (typeof params.min_received === "number") {
    query = query.gte("donations_received", params.min_received);
  }

  if (typeof params.max_received === "number") {
    query = query.lte("donations_received", params.max_received);
  }

  if (typeof params.min_lives === "number") {
    query = query.gte("lives_improved", params.min_lives);
  }

  if (typeof params.max_lives === "number") {
    query = query.lte("lives_improved", params.max_lives);
  }

  if (params.start_from) {
    query = query.gte("start_date", params.start_from);
  }

  if (params.end_to) {
    query = query.lte("end_date", params.end_to);
  }

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

export async function fetchProjectMarkers({
  searchParams,
}: {
  searchParams: RawSearchParams;
}): Promise<ProjectMarker[]> {
  const params = parseFindProjectsSearchParams(searchParams);
  const categoryFilters = params.category.length ? params.category : params.type;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("projects")
    .select("id,slug,name,category,lat,lng,place_name,description");

  // Unlisted/private projects are reachable by link only, never listed.
  query = query.eq("visibility", "public");

  if (!user) {
    query = query.eq("status", "approved");
  }

  if (params.q) {
    const escaped = params.q.replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.or(`name.ilike.%${escaped}%,place_name.ilike.%${escaped}%`);
  }

  if (categoryFilters.length) {
    query = query.in("category", categoryFilters);
  }

  if (params.country.length) {
    query = query.in("country", params.country);
  }

  if (params.region.length) {
    query = query.in("region", params.region);
  }

  if (params.currency.length) {
    query = query.in("currency", params.currency);
  }

  if (params.target_demographic.length) {
    query = query.in("target_demographic", params.target_demographic);
  }

  if (params.thematic_area.length) {
    params.thematic_area.forEach(value => {
      query = query.contains("thematic_area", [value]);
    });
  }

  if (params.type_of_intervention.length) {
    params.type_of_intervention.forEach(value => {
      query = query.contains("type_of_intervention", [value]);
    });
  }

  if (params.partner_org_ids.length) {
    params.partner_org_ids.forEach(value => {
      query = query.contains("partner_org_ids", [value]);
    });
  }

  if (typeof params.min_needed === "number") {
    query = query.gte("amount_needed", params.min_needed);
  }

  if (typeof params.max_needed === "number") {
    query = query.lte("amount_needed", params.max_needed);
  }

  if (typeof params.min_received === "number") {
    query = query.gte("donations_received", params.min_received);
  }

  if (typeof params.max_received === "number") {
    query = query.lte("donations_received", params.max_received);
  }

  if (typeof params.min_lives === "number") {
    query = query.gte("lives_improved", params.min_lives);
  }

  if (typeof params.max_lives === "number") {
    query = query.lte("lives_improved", params.max_lives);
  }

  if (params.start_from) {
    query = query.gte("start_date", params.start_from);
  }

  if (params.end_to) {
    query = query.lte("end_date", params.end_to);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as ProjectMarker[];
}
