// src/lib/grants/findGrantsQuery.ts
import type { Database } from "@/lib/database.types";
import { getServerSupabase } from "@/lib/supabaseServer";

export const PAGE_SIZE = 25;
export const FILTER_OPTIONS_LIMIT = 2000;

type GrantRow = Database["public"]["Tables"]["grants"]["Row"];

export type GrantListRow = Pick<
  GrantRow,
  | "id"
  | "slug"
  | "title"
  | "summary"
  | "funder_name"
  | "funding_type"
  | "project_type"
  | "currency"
  | "amount_min"
  | "amount_max"
  | "deadline"
  | "open_date"
  | "eligible_countries"
  | "location_name"
  | "latitude"
  | "longitude"
  | "status"
  | "created_at"
>;

export type GrantMarker = Pick<
  GrantRow,
  | "id"
  | "slug"
  | "title"
  | "summary"
  | "project_type"
  | "latitude"
  | "longitude"
  | "location_name"
>;

type SortColumn = "deadline" | "amount_max" | "created_at";
type SortDirection = "asc" | "desc";

export type FindGrantsParams = {
  q?: string;
  project_type: string[];
  funding_type: string[];
  status: string[];
  closing_within?: number;
  eligible_countries: string[];
  themes: string[];
  sdgs: number[];
  remote_only?: boolean;
  amount_min?: number;
  amount_max?: number;
  deadline_from?: string;
  deadline_to?: string;
  upcoming_only?: boolean;
  sort: SortColumn;
  dir: SortDirection;
  page: number;
};

export type GrantFilterOptions = {
  countries: { value: string; label: string }[];
  themes: { value: string; label: string }[];
};

type RawSearchParams = Record<string, string | string[] | undefined>;

const SORT_COLUMNS: readonly SortColumn[] = ["deadline", "amount_max", "created_at"];
const SORT_DIRECTIONS: readonly SortDirection[] = ["asc", "desc"];

const isNonEmptyString = (value: string | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

const parseString = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value.find((item) => item.trim().length > 0)?.trim();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
};

const parseStringList = (value: string | string[] | undefined): string[] => {
  const raw = Array.isArray(value) ? value : value ? value.split(",") : [];
  return raw.map((item) => item.trim()).filter(isNonEmptyString);
};

const parseNumberList = (value: string | string[] | undefined): number[] =>
  parseStringList(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));

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
  return "deadline";
};

const parseDir = (value: string | string[] | undefined): SortDirection => {
  const parsed = parseString(value);
  if (parsed && SORT_DIRECTIONS.includes(parsed as SortDirection)) {
    return parsed as SortDirection;
  }
  return "asc";
};

const parseBoolean = (value: string | string[] | undefined): boolean | undefined => {
  const parsed = parseString(value);
  if (!parsed) return undefined;
  return parsed === "true" || parsed === "1" || parsed === "on";
};

const parseDate = (value: string | string[] | undefined): string | undefined => {
  const parsed = parseString(value);
  if (!parsed) return undefined;
  return parsed;
};

export function parseFindGrantsSearchParams(searchParams: RawSearchParams): FindGrantsParams {
  return {
    q: parseString(searchParams.q),
    project_type: parseStringList(searchParams.project_type),
    funding_type: parseStringList(searchParams.funding_type),
    status: parseStringList(searchParams.status),
    closing_within: parseNumber(searchParams.closing_within),
    eligible_countries: parseStringList(searchParams.eligible_countries),
    themes: parseStringList(searchParams.themes),
    sdgs: parseNumberList(searchParams.sdgs),

    // accept either remote_ok or remote_only from the URL
    remote_only: parseBoolean(searchParams.remote_ok ?? searchParams.remote_only),

    amount_min: parseNumber(searchParams.amount_min),
    amount_max: parseNumber(searchParams.amount_max),
    deadline_from: parseDate(searchParams.deadline_from),
    deadline_to: parseDate(searchParams.deadline_to),
    upcoming_only: parseBoolean(searchParams.upcoming_only),

    sort: parseSort(searchParams.sort),
    dir: parseDir(searchParams.dir),
    page: parsePage(searchParams.page),
  };
}

export async function fetchFindGrants({
  searchParams,
}: {
  searchParams: RawSearchParams;
}): Promise<{
  rows: GrantListRow[];
  count: number;
  page: number;
  pageCount: number;
}> {
  const params = parseFindGrantsSearchParams(searchParams);
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Funding is only visible to authenticated users
  if (!user) {
    return { rows: [], count: 0, page: params.page, pageCount: 0 };
  }

  let query = supabase
    .from("grants")
    .select(
      "id,slug,title,summary,funder_name,funding_type,project_type,currency,amount_min,amount_max,deadline,open_date,eligible_countries,location_name,latitude,longitude,status,created_at",
      { count: "exact" },
    )
    .eq("is_published", true);

  if (params.q) {
    const escaped = params.q.replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.or(
      `title.ilike.%${escaped}%,summary.ilike.%${escaped}%,funder_name.ilike.%${escaped}%`,
    );
  }

  if (params.project_type.length) query = query.in("project_type", params.project_type);
  if (params.funding_type.length) query = query.in("funding_type", params.funding_type);

  // Several statuses at once; nothing selected = still open (open + rolling). "all" kept for old links.
  if (!params.status.includes("all")) {
    query = query.in("status", params.status.length ? params.status : ["open", "rolling"]);
  }

  if (params.closing_within && params.closing_within > 0) {
    const today = new Date();
    const until = new Date(today.getTime() + params.closing_within * 86_400_000);
    query = query.gte("deadline", today.toISOString().slice(0, 10)).lte("deadline", until.toISOString().slice(0, 10));
  }

  if (params.eligible_countries.length) {
    query = query.overlaps("eligible_countries", params.eligible_countries);
  }

  if (params.themes.length) {
    query = query.overlaps("themes", params.themes);
  }

  if (params.sdgs.length) {
    query = query.overlaps("sdgs", params.sdgs);
  }

  if (params.remote_only) query = query.eq("remote_ok", true);

  // overlap logic (OR between min/max columns)
  if (typeof params.amount_min === "number") {
    query = query.or(
      `amount_min.gte.${params.amount_min},amount_max.gte.${params.amount_min}`,
    );
  }

  if (typeof params.amount_max === "number") {
    query = query.or(
      `amount_min.lte.${params.amount_max},amount_max.lte.${params.amount_max}`,
    );
  }

  if (params.deadline_from) query = query.gte("deadline", params.deadline_from);
  if (params.deadline_to) query = query.lte("deadline", params.deadline_to);

  if (params.upcoming_only) {
    const today = new Date().toISOString().slice(0, 10);
    query = query.or(`deadline.gte.${today},deadline.is.null`);
  }

  // FIX: postgrest-js supports `nullsFirst` only (boolean).
  // Setting `nullsFirst: false` means "NULLS LAST" in PostgREST.
  const isDeadlineSort = params.sort === "deadline";
  query = query.order(params.sort, {
    ascending: params.dir === "asc",
    ...(isDeadlineSort ? { nullsFirst: false } : {}),
  });

  const offset = (params.page - 1) * PAGE_SIZE;
  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as GrantListRow[];
  const totalCount = count ?? rows.length;
  const pageCount = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 0;

  return { rows, count: totalCount, page: params.page, pageCount };
}

export async function fetchGrantMarkers({
  searchParams,
  limit,
}: {
  searchParams: RawSearchParams;
  limit?: number;
}): Promise<GrantMarker[]> {
  const params = parseFindGrantsSearchParams(searchParams);
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Funding is only visible to authenticated users
  if (!user) {
    return [];
  }

  let query = supabase
    .from("grants")
    .select("id,slug,title,summary,project_type,latitude,longitude,location_name")
    .eq("is_published", true);

  if (params.q) {
    const escaped = params.q.replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.or(
      `title.ilike.%${escaped}%,summary.ilike.%${escaped}%,funder_name.ilike.%${escaped}%`,
    );
  }

  if (params.project_type.length) query = query.in("project_type", params.project_type);
  if (params.funding_type.length) query = query.in("funding_type", params.funding_type);

  // Several statuses at once; nothing selected = still open (open + rolling). "all" kept for old links.
  if (!params.status.includes("all")) {
    query = query.in("status", params.status.length ? params.status : ["open", "rolling"]);
  }

  if (params.closing_within && params.closing_within > 0) {
    const today = new Date();
    const until = new Date(today.getTime() + params.closing_within * 86_400_000);
    query = query.gte("deadline", today.toISOString().slice(0, 10)).lte("deadline", until.toISOString().slice(0, 10));
  }

  if (params.eligible_countries.length) {
    query = query.overlaps("eligible_countries", params.eligible_countries);
  }

  if (params.themes.length) {
    query = query.overlaps("themes", params.themes);
  }

  if (params.sdgs.length) {
    query = query.overlaps("sdgs", params.sdgs);
  }

  if (params.remote_only) query = query.eq("remote_ok", true);

  if (typeof params.amount_min === "number") {
    query = query.or(
      `amount_min.gte.${params.amount_min},amount_max.gte.${params.amount_min}`,
    );
  }

  if (typeof params.amount_max === "number") {
    query = query.or(
      `amount_min.lte.${params.amount_max},amount_max.lte.${params.amount_max}`,
    );
  }

  if (params.deadline_from) query = query.gte("deadline", params.deadline_from);
  if (params.deadline_to) query = query.lte("deadline", params.deadline_to);

  if (params.upcoming_only) {
    const today = new Date().toISOString().slice(0, 10);
    query = query.or(`deadline.gte.${today},deadline.is.null`);
  }

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as GrantMarker[];
}

export async function fetchGrantFilterOptions(): Promise<GrantFilterOptions> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Funding is only visible to authenticated users
  if (!user) {
    return { countries: [], themes: [] };
  }

  const { data, error } = await supabase
    .from("grants")
    .select("eligible_countries,themes")
    .eq("is_published", true)
    .in("status", ["open", "rolling"])
    .limit(FILTER_OPTIONS_LIMIT);

  if (error) {
    console.error("Failed to load grant filter options", error);
    return { countries: [], themes: [] };
  }

  const countrySet = new Set<string>();
  const themeSet = new Set<string>();

  (data ?? []).forEach((row) => {
    (row.eligible_countries ?? []).forEach((country: string) => countrySet.add(country));
    (row.themes ?? []).forEach((theme: string) => themeSet.add(theme));
  });

  const toOptions = (values: Set<string>) =>
    Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }));

  return {
    countries: toOptions(countrySet),
    themes: toOptions(themeSet),
  };
}
