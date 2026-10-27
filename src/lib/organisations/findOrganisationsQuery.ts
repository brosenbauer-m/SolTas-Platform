import type { Database } from "@/lib/database.types";
import { getServerSupabase } from "@/lib/supabaseServer";
import { IATI_ORG_ID } from "@/lib/iati/systemOrg";
import { ilikeAny } from "@/lib/postgrestSearch";

export const PAGE_SIZE = 25;
export const MARKER_LIMIT = 250;
export const FILTER_OPTIONS_LIMIT = 2000;

type OrganisationDirectoryRow = Database["public"]["Views"]["organisations_directory_v1"]["Row"];

export type OrganisationListRow = Pick<
  OrganisationDirectoryRow,
  | "id"
  | "name"
  | "description"
  | "website"
  | "based_in_country"
  | "based_in_region"
  | "thematic_tags"
  | "intervention_tags"
  | "demographic_tags"
  | "funding_needed"
  | "founded_at"
  | "age_years"
  | "followers_count"
  | "projects_total_count"
  | "projects_ongoing_count"
>;

export type OrganisationMarker = {
  id: string;
  slug: string;
  title: string;
  lat: number;
  lng: number;
  placeName?: string | null;
  description?: string | null;
  /** Precomputed CTA href so we don't pass functions to Client Components */
  ctaHref: string;
};

type SortColumn =
  | "followers_count"
  | "projects_total_count"
  | "projects_ongoing_count"
  | "funding_needed"
  | "age_years";

type SortDirection = "asc" | "desc";

export type FindOrganisationsParams = {
  q?: string;
  countries: string[];
  regions: string[];
  thematic_tags: string[];
  intervention_tags: string[];
  demographic_tags: string[];
  min_age?: number;
  max_age?: number;
  min_projects?: number;
  max_projects?: number;
  min_funding?: number;
  max_funding?: number;
  sort: SortColumn;
  dir: SortDirection;
  page: number;
};

export type OrganisationFilterOptions = {
  countries: { value: string; label: string }[];
  regions: { value: string; label: string }[];
  thematic: { value: string; label: string }[];
  interventions: { value: string; label: string }[];
  demographics: { value: string; label: string }[];
};

type RawSearchParams = Record<string, string | string[] | undefined>;

const SORT_COLUMNS: readonly SortColumn[] = [
  "followers_count",
  "projects_total_count",
  "projects_ongoing_count",
  "funding_needed",
  "age_years",
];

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
  return "followers_count";
};

const parseDir = (value: string | string[] | undefined): SortDirection => {
  const parsed = parseString(value);
  if (parsed && SORT_DIRECTIONS.includes(parsed as SortDirection)) {
    return parsed as SortDirection;
  }
  return "desc";
};

export function parseFindOrganisationsSearchParams(searchParams: RawSearchParams): FindOrganisationsParams {
  return {
    q: parseString(searchParams.q),
    countries: parseStringList(searchParams.country),
    regions: parseStringList(searchParams.region),
    thematic_tags: parseStringList(searchParams.thematic),
    intervention_tags: parseStringList(searchParams.intervention),
    demographic_tags: parseStringList(searchParams.demographic),
    min_age: parseNumber(searchParams.min_age),
    max_age: parseNumber(searchParams.max_age),
    min_projects: parseNumber(searchParams.min_projects),
    max_projects: parseNumber(searchParams.max_projects),
    min_funding: parseNumber(searchParams.min_funding),
    max_funding: parseNumber(searchParams.max_funding),
    sort: parseSort(searchParams.sort),
    dir: parseDir(searchParams.dir),
    page: parsePage(searchParams.page),
  };
}

export async function fetchFindOrganisations({
  searchParams,
}: {
  searchParams: RawSearchParams;
}): Promise<{
  rows: OrganisationListRow[];
  count: number;
  page: number;
  pageCount: number;
}> {
  const params = parseFindOrganisationsSearchParams(searchParams);
  const supabase = await getServerSupabase();

  let query = supabase
    .from("organisations_directory_v1")
    .select(
      "id,name,description,website,based_in_country,based_in_region,thematic_tags,intervention_tags,demographic_tags,funding_needed,founded_at,age_years,followers_count,projects_total_count,projects_ongoing_count",
      { count: "exact" },
    )
    .neq("id", IATI_ORG_ID);

  if (params.q) {
    query = query.or(ilikeAny(["name", "description"], params.q));
  }

  if (params.countries.length) {
    query = query.in("based_in_country", params.countries);
  }

  if (params.regions.length) {
    query = query.in("based_in_region", params.regions);
  }

  if (params.thematic_tags.length) {
    params.thematic_tags.forEach((value) => {
      query = query.contains("thematic_tags", [value]);
    });
  }

  if (params.intervention_tags.length) {
    params.intervention_tags.forEach((value) => {
      query = query.contains("intervention_tags", [value]);
    });
  }

  if (params.demographic_tags.length) {
    params.demographic_tags.forEach((value) => {
      query = query.contains("demographic_tags", [value]);
    });
  }

  if (typeof params.min_age === "number") {
    query = query.gte("age_years", params.min_age);
  }

  if (typeof params.max_age === "number") {
    query = query.lte("age_years", params.max_age);
  }

  if (typeof params.min_projects === "number") {
    query = query.gte("projects_total_count", params.min_projects);
  }

  if (typeof params.max_projects === "number") {
    query = query.lte("projects_total_count", params.max_projects);
  }

  if (typeof params.min_funding === "number") {
    query = query.gte("funding_needed", params.min_funding);
  }

  if (typeof params.max_funding === "number") {
    query = query.lte("funding_needed", params.max_funding);
  }

  query = query.order(params.sort, { ascending: params.dir === "asc", nullsFirst: false });

  const offset = (params.page - 1) * PAGE_SIZE;
  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data, count, error } = await query;
  if (error) {
    console.error("Failed to load organisations directory", error);
    return {
      rows: [],
      count: 0,
      page: params.page,
      pageCount: 1,
    };
  }

  const rows = (data ?? []) as OrganisationListRow[];
  const totalCount = count ?? rows.length;
  const pageCount = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 0;

  return {
    rows,
    count: totalCount,
    page: params.page,
    pageCount,
  };
}

const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

async function geocodeLocation(query: string): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache.has(query)) {
    return geocodeCache.get(query) ?? null;
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    geocodeCache.set(query, null);
    return null;
  }

  try {
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
    url.searchParams.set("access_token", token);
    url.searchParams.set("types", "country,region");
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString());
    if (!response.ok) {
      geocodeCache.set(query, null);
      return null;
    }

    const payload = (await response.json()) as { features?: { center?: [number, number] }[] };
    const center = payload.features?.[0]?.center;
    if (!center || center.length < 2) {
      geocodeCache.set(query, null);
      return null;
    }

    const [lng, lat] = center;
    const result = { lat, lng };
    geocodeCache.set(query, result);
    return result;
  } catch (error) {
    console.error("organisation-geocode", error);
    geocodeCache.set(query, null);
    return null;
  }
}

export async function fetchOrganisationMarkers({
  searchParams,
  limit = MARKER_LIMIT,
}: {
  searchParams: RawSearchParams;
  limit?: number;
}): Promise<OrganisationMarker[]> {
  const params = parseFindOrganisationsSearchParams(searchParams);
  const supabase = await getServerSupabase();

  let query = supabase
    .from("organisations_directory_v1")
    .select("id,name,description,based_in_country,based_in_region,lat,lng,thematic_tags,intervention_tags,demographic_tags,age_years,projects_total_count,projects_ongoing_count,funding_needed")
    .neq("id", IATI_ORG_ID);

  if (params.q) {
    query = query.or(ilikeAny(["name", "description"], params.q));
  }

  if (params.countries.length) {
    query = query.in("based_in_country", params.countries);
  }

  if (params.regions.length) {
    query = query.in("based_in_region", params.regions);
  }

  if (params.thematic_tags.length) {
    params.thematic_tags.forEach((value) => {
      query = query.contains("thematic_tags", [value]);
    });
  }

  if (params.intervention_tags.length) {
    params.intervention_tags.forEach((value) => {
      query = query.contains("intervention_tags", [value]);
    });
  }

  if (params.demographic_tags.length) {
    params.demographic_tags.forEach((value) => {
      query = query.contains("demographic_tags", [value]);
    });
  }

  if (typeof params.min_age === "number") {
    query = query.gte("age_years", params.min_age);
  }

  if (typeof params.max_age === "number") {
    query = query.lte("age_years", params.max_age);
  }

  if (typeof params.min_projects === "number") {
    query = query.gte("projects_total_count", params.min_projects);
  }

  if (typeof params.max_projects === "number") {
    query = query.lte("projects_total_count", params.max_projects);
  }

  if (typeof params.min_funding === "number") {
    query = query.gte("funding_needed", params.min_funding);
  }

  if (typeof params.max_funding === "number") {
    query = query.lte("funding_needed", params.max_funding);
  }

  query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to load organisation markers", error);
    return [];
  }

  const rows = data ?? [];
  const uniqueLocations: string[] = [];
  const seenLocations = new Set<string>();

  rows.forEach((row) => {
    if (Number.isFinite(row.lat) && Number.isFinite(row.lng)) return;
    const place = [row.based_in_region, row.based_in_country].filter(Boolean).join(", ");
    if (!place || seenLocations.has(place)) return;
    seenLocations.add(place);
    uniqueLocations.push(place);
  });

  const geocodeTargets = uniqueLocations.slice(0, 50);
  await Promise.all(geocodeTargets.map((place) => geocodeLocation(place)));

  return rows.flatMap((row) => {
    if (!row.id) return [];
    const placeName = [row.based_in_region, row.based_in_country].filter(Boolean).join(", ");
    let lat = row.lat;
    let lng = row.lng;

    if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && placeName) {
      const resolved = geocodeCache.get(placeName) ?? null;
      if (resolved) {
        lat = resolved.lat;
        lng = resolved.lng;
      }
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return [];
    }

    return [
      {
        id: row.id,
        slug: row.id,
        title: row.name ?? "Organisation",
        lat,
        lng,
        placeName: placeName || null,
        description: row.description ?? null,
        // IMPORTANT: precompute so we don't pass functions to Client Components (Next.js restriction)
        ctaHref: `/organisations/${row.id}`,
      },
    ];
  });
}

export async function fetchOrganisationFilterOptions(): Promise<OrganisationFilterOptions> {
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("organisations_directory_v1")
    .select("based_in_country,based_in_region,thematic_tags,intervention_tags,demographic_tags")
    .limit(FILTER_OPTIONS_LIMIT);

  if (error) {
    console.error("Failed to load organisation filter options", error);
    return {
      countries: [],
      regions: [],
      thematic: [],
      interventions: [],
      demographics: [],
    };
  }

  const countrySet = new Set<string>();
  const regionSet = new Set<string>();
  const thematicSet = new Set<string>();
  const interventionSet = new Set<string>();
  const demographicSet = new Set<string>();

  (data ?? []).forEach((row) => {
    if (row.based_in_country) countrySet.add(row.based_in_country);
    if (row.based_in_region) regionSet.add(row.based_in_region);
    (row.thematic_tags ?? []).forEach((tag: string) => thematicSet.add(tag));
    (row.intervention_tags ?? []).forEach((tag: string) => interventionSet.add(tag));
    (row.demographic_tags ?? []).forEach((tag: string) => demographicSet.add(tag));
  });

  const toOptions = (values: Set<string>) =>
    Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }));

  return {
    countries: toOptions(countrySet),
    regions: toOptions(regionSet),
    thematic: toOptions(thematicSet),
    interventions: toOptions(interventionSet),
    demographics: toOptions(demographicSet),
  };
}
