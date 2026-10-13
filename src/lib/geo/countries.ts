import { COUNTRY_CENTROIDS } from "./countryCentroids";

/** ISO 3166-1 alpha-2 codes we can place on the map. */
export const COUNTRY_CODES = Object.keys(COUNTRY_CENTROIDS);

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

/** English country name for an ISO code ("KE" -> "Kenya"); the code itself if unknown. */
export function countryName(code: string): string {
  try {
    return displayNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

const codeByName = new Map(COUNTRY_CODES.map((code) => [countryName(code).toLowerCase(), code]));

/** ISO code for a country name as people type it in projects ("Kenya" -> "KE"), or null. */
export function countryCodeFromName(name: string): string | null {
  const trimmed = name.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed) && COUNTRY_CENTROIDS[trimmed.toUpperCase()]) return trimmed.toUpperCase();
  return codeByName.get(trimmed.toLowerCase()) ?? null;
}

/** Every country name, A-Z (for the Country filter). */
export const COUNTRY_NAMES = COUNTRY_CODES.map(countryName).sort((a, b) => a.localeCompare(b));
