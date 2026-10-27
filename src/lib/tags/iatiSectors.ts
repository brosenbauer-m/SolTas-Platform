import { DAC_SECTOR_CATEGORIES, DAC_SECTORS } from "../iati/codelists";

/**
 * Tag label for an IATI (OECD DAC) sector code: the published name, without numbering or editorial notes.
 * "14030" -> "Basic drinking water supply and basic sanitation", "140" -> "Water supply and sanitation".
 * Several codes can share one label (e.g. two "Lower secondary education" codes): they become one tag.
 */
export function iatiSectorTagLabel(code: string): string | null {
  const raw = DAC_SECTORS[code] ?? DAC_SECTOR_CATEGORIES[code];
  if (!raw) return null;
  const label = raw
    .replace(/^[IVX]+(\.\d+)*(\.[a-z])?\.\s*/i, "") // "I.4. ", "II.3.b. "
    .replace(/\s*\([^)]*\)\s*/g, " ") // "(modified and includes ...)"
    .replace(/\s+/g, " ")
    .trim();
  if (!label || /^(other|unallocated|unspecified)/i.test(label)) return null;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** URL-safe tag key: "Basic drinking water supply" -> "basic-drinking-water-supply". */
export function tagSlug(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
