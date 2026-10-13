// Turns one IATI Datastore activity document (Solr, flattened fields) into an iati_activities row.
// Field names: IATI/datastore-solr-configs configsets/activity/conf/managed-schema.
//
// Solr flattens repeated XML elements per field, so parallel lists (e.g. title_narrative and
// title_narrative_xml_lang) only line up when every element carried the attribute. We only pair
// values when the lists have the same length, and otherwise fall back to something safe.

import { COUNTRY_CENTROIDS } from "./countryCentroids";

export const IATI_FIELDS = [
  "iati_identifier",
  "last_updated_datetime",
  "hierarchy",
  "title_narrative",
  "title_narrative_xml_lang",
  "description_narrative",
  "description_type",
  "reporting_org_ref",
  "reporting_org_type",
  "reporting_org_narrative",
  "participating_org_role",
  "participating_org_ref",
  "participating_org_type",
  "participating_org_narrative",
  "activity_status_code",
  "activity_date_type",
  "activity_date_iso_date",
  "activity_scope_code",
  "recipient_country_code",
  "recipient_country_percentage",
  "recipient_region_code",
  "location_point_pos",
  "location_name_narrative",
  "location_exactness_code",
  "sector_code",
  "sector_vocabulary",
  "policy_marker_code",
  "policy_marker_significance",
  "policy_marker_vocabulary",
  "humanitarian",
  "tag_code",
  "tag_vocabulary",
  "budget_value",
  "budget_value_currency",
  "budget_type",
  "default_currency",
  "document_link_url",
] as const;

type Field = (typeof IATI_FIELDS)[number];
export type IatiDoc = Partial<Record<Field, unknown>>;

export type IatiActivityRow = {
  iati_identifier: string;
  title: string;
  description: string | null;
  reporting_org_ref: string | null;
  reporting_org_name: string | null;
  reporting_org_type: string | null;
  participating_orgs: { role: string | null; ref: string | null; name: string | null; type: string | null }[];
  activity_status: number | null;
  lifecycle_status: "planned" | "ongoing" | "completed" | "cancelled" | "paused";
  start_date: string | null;
  end_date: string | null;
  countries: string[];
  regions: string[];
  scope: string | null;
  locations: { name: string | null; lat: number; lng: number; exactness: string | null }[];
  lat: number | null;
  lng: number | null;
  point_precision: "exact" | "country" | null;
  dac_sectors: string[];
  policy_markers: { code: string; significance: number | null }[];
  humanitarian: boolean;
  sdgs: string[];
  budget_total: number | null;
  currency: string | null;
  links: { url: string }[];
  last_updated_at: string | null;
};

const DESCRIPTION_MAX = 1500;
const MAX_LOCATIONS = 25;
const MAX_ORGS = 20;
const MAX_LINKS = 5;

/** IATI ActivityStatus -> our lifecycle words. 3 = Finalisation (still running, wrapping up). */
const STATUS: Record<string, IatiActivityRow["lifecycle_status"]> = {
  "1": "planned",
  "2": "ongoing",
  "3": "ongoing",
  "4": "completed",
  "5": "cancelled",
  "6": "paused",
};

function list(value: unknown): string[] {
  if (value == null) return [];
  const items = Array.isArray(value) ? value : [value];
  return items.map((item) => String(item).trim());
}

function first(value: unknown): string | null {
  const [head] = list(value).filter(Boolean);
  return head ?? null;
}

/** Pairs two parallel lists only when they line up. */
function aligned<T>(a: T[], b: unknown[]): boolean {
  return a.length > 0 && a.length === b.length;
}

function cleanText(text: string | null, max?: number): string | null {
  if (!text) return null;
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (!collapsed) return null;
  if (max && collapsed.length > max) return `${collapsed.slice(0, max - 1).trimEnd()}…`;
  return collapsed;
}

function pickTitle(doc: IatiDoc): string | null {
  const titles = list(doc.title_narrative);
  const langs = list(doc.title_narrative_xml_lang);
  if (aligned(titles, langs)) {
    const english = titles[langs.findIndex((lang) => lang.toLowerCase().startsWith("en"))];
    if (english) return english;
  }
  return titles.find(Boolean) ?? null;
}

function pickDescription(doc: IatiDoc): string | null {
  const texts = list(doc.description_narrative);
  const types = list(doc.description_type);
  // type 1 = general description
  if (aligned(texts, types)) {
    const general = texts[types.indexOf("1")];
    if (general) return general;
  }
  return texts.find(Boolean) ?? null;
}

function isoDate(value: string | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : null;
}

/** Actual date if reported, else planned. Types: 1 planned start, 2 actual start, 3 planned end, 4 actual end. */
function pickDates(doc: IatiDoc) {
  const types = list(doc.activity_date_type);
  const dates = list(doc.activity_date_iso_date);
  if (!aligned(types, dates)) return { start: null, end: null };
  const byType = (type: string) => isoDate(dates[types.indexOf(type)]);
  return { start: byType("2") ?? byType("1"), end: byType("4") ?? byType("3") };
}

function parsePoint(pos: string): { lat: number; lng: number } | null {
  const [lat, lng] = pos.split(/[\s,]+/).map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null; // common placeholder, not a real place
  return { lat, lng };
}

function pickLocations(doc: IatiDoc): IatiActivityRow["locations"] {
  const points = list(doc.location_point_pos);
  const names = list(doc.location_name_narrative);
  const exactness = list(doc.location_exactness_code);
  const namesAligned = aligned(points, names);
  const exactnessAligned = aligned(points, exactness);
  const out: IatiActivityRow["locations"] = [];
  points.forEach((pos, index) => {
    const point = parsePoint(pos);
    if (!point || out.length >= MAX_LOCATIONS) return;
    out.push({
      ...point,
      name: namesAligned ? cleanText(names[index]) : null,
      exactness: exactnessAligned ? exactness[index] || null : null,
    });
  });
  return out;
}

function pickCountries(doc: IatiDoc): string[] {
  const codes = list(doc.recipient_country_code).map((code) => code.toUpperCase());
  const percentages = list(doc.recipient_country_percentage).map(Number);
  const unique = [...new Set(codes.filter((code) => /^[A-Z]{2}$/.test(code)))];
  if (aligned(codes, percentages)) {
    // largest share first, so the map point goes to the main country
    unique.sort((a, b) => (percentages[codes.indexOf(b)] || 0) - (percentages[codes.indexOf(a)] || 0));
  }
  return unique;
}

/** DAC sectors: vocabulary 1 (5-digit) or 2 (3-digit); vocabulary 1 is the default when none is given. */
function pickDacSectors(doc: IatiDoc): string[] {
  const codes = list(doc.sector_code);
  const vocabularies = list(doc.sector_vocabulary);
  let dac: string[];
  if (vocabularies.length === 0) dac = codes;
  else if (aligned(codes, vocabularies)) dac = codes.filter((_, i) => vocabularies[i] === "1" || vocabularies[i] === "2");
  else dac = codes;
  return [...new Set(dac.filter((code) => /^\d{3}(\d{2})?$/.test(code)))];
}

/** OECD DAC policy markers (vocabulary 1, the default). Significance 0-4. */
function pickPolicyMarkers(doc: IatiDoc): IatiActivityRow["policy_markers"] {
  const codes = list(doc.policy_marker_code);
  const vocabularies = list(doc.policy_marker_vocabulary);
  const significance = list(doc.policy_marker_significance);
  const vocabAligned = aligned(codes, vocabularies);
  const sigAligned = aligned(codes, significance);
  const out = new Map<string, number | null>();
  codes.forEach((code, index) => {
    if (vocabularies.length && (!vocabAligned || vocabularies[index] !== "1")) return;
    if (!/^\d{1,2}$/.test(code)) return;
    const value = sigAligned ? Number(significance[index]) : NaN;
    out.set(code, Number.isFinite(value) ? value : null);
  });
  return [...out].map(([code, sig]) => ({ code, significance: sig }));
}

/** SDG goals: tag vocabulary 2 = goal number, 3 = target ("13.1" -> goal 13). */
function pickSdgs(doc: IatiDoc): string[] {
  const codes = list(doc.tag_code);
  const vocabularies = list(doc.tag_vocabulary);
  if (!aligned(codes, vocabularies)) return [];
  const goals = new Set<string>();
  codes.forEach((code, index) => {
    if (vocabularies[index] !== "2" && vocabularies[index] !== "3") return;
    const goal = Number(code.split(".")[0]);
    if (Number.isInteger(goal) && goal >= 1 && goal <= 17) goals.add(String(goal));
  });
  return [...goals].sort((a, b) => Number(a) - Number(b));
}

/**
 * Total budget, only when we can be sure of it: one currency, and original budgets (type 1)
 * summed (or revised, type 2, if no originals), so revisions aren't counted twice.
 */
function pickBudget(doc: IatiDoc): { total: number | null; currency: string | null } {
  const values = list(doc.budget_value).map(Number);
  const defaultCurrency = first(doc.default_currency)?.toUpperCase() ?? null;
  if (!values.length) return { total: null, currency: defaultCurrency };

  const valueCurrencies = list(doc.budget_value_currency).map((c) => c.toUpperCase());
  const currencies = new Set([...valueCurrencies, ...(defaultCurrency ? [defaultCurrency] : [])]);
  if (currencies.size !== 1) return { total: null, currency: defaultCurrency };

  const types = list(doc.budget_type);
  let picked = values;
  if (types.length) {
    if (!aligned(values, types)) return { total: null, currency: [...currencies][0] };
    const originals = values.filter((_, i) => types[i] === "1");
    picked = originals.length ? originals : values.filter((_, i) => types[i] === "2");
  }
  const total = picked.filter(Number.isFinite).reduce((sum, value) => sum + value, 0);
  return { total: total > 0 ? Math.round(total * 100) / 100 : null, currency: [...currencies][0] };
}

function pickParticipatingOrgs(doc: IatiDoc): IatiActivityRow["participating_orgs"] {
  const roles = list(doc.participating_org_role);
  const names = list(doc.participating_org_narrative);
  const refs = list(doc.participating_org_ref);
  const types = list(doc.participating_org_type);
  // role is required on every participating-org, so it gives the count of organisations
  if (!roles.length) return [];
  const namesOk = aligned(roles, names);
  const refsOk = aligned(roles, refs);
  const typesOk = aligned(roles, types);
  return roles.slice(0, MAX_ORGS).map((role, i) => ({
    role: role || null,
    name: namesOk ? cleanText(names[i]) : null,
    ref: refsOk ? refs[i] || null : null,
    type: typesOk ? types[i] || null : null,
  }));
}

export type TransformResult = { row: IatiActivityRow } | { skip: string };

export function transformActivity(doc: IatiDoc): TransformResult {
  const identifier = first(doc.iati_identifier);
  if (!identifier) return { skip: "no identifier" };

  const title = cleanText(pickTitle(doc), 300) ?? identifier;
  const statusCode = first(doc.activity_status_code);
  const { start, end } = pickDates(doc);
  const locations = pickLocations(doc);
  const countries = pickCountries(doc);

  let lat: number | null = null;
  let lng: number | null = null;
  let precision: IatiActivityRow["point_precision"] = null;
  if (locations.length) {
    ({ lat, lng } = locations[0]);
    precision = "exact";
  } else {
    const centroid = countries.map((code) => COUNTRY_CENTROIDS[code]).find(Boolean);
    if (centroid) {
      [lat, lng] = centroid;
      precision = "country";
    }
  }

  const budget = pickBudget(doc);
  const humanitarian = list(doc.humanitarian).some((value) => value === "true" || value === "1");

  return {
    row: {
      iati_identifier: identifier,
      title,
      description: cleanText(pickDescription(doc), DESCRIPTION_MAX),
      reporting_org_ref: first(doc.reporting_org_ref),
      reporting_org_name: cleanText(first(doc.reporting_org_narrative), 300),
      reporting_org_type: first(doc.reporting_org_type),
      participating_orgs: pickParticipatingOrgs(doc),
      activity_status: statusCode && /^[1-6]$/.test(statusCode) ? Number(statusCode) : null,
      lifecycle_status: (statusCode && STATUS[statusCode]) || "planned",
      start_date: start,
      end_date: end,
      countries,
      regions: [...new Set(list(doc.recipient_region_code).filter(Boolean))],
      scope: first(doc.activity_scope_code),
      locations,
      lat,
      lng,
      point_precision: precision,
      dac_sectors: pickDacSectors(doc),
      policy_markers: pickPolicyMarkers(doc),
      humanitarian,
      sdgs: pickSdgs(doc),
      budget_total: budget.total,
      currency: budget.currency,
      links: [...new Set(list(doc.document_link_url).filter((url) => /^https?:\/\//i.test(url)))]
        .slice(0, MAX_LINKS)
        .map((url) => ({ url })),
      last_updated_at: first(doc.last_updated_datetime),
    },
  };
}
