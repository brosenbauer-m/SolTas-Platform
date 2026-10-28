/** Absolute origin of the site, for metadata, the sitemap and links in emails. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://solarpunktaskforce.org").replace(/\/$/, "");

export const SITE_NAME = "Solarpunk Taskforce";

export const SITE_DESCRIPTION =
  "One living map of the world's humanitarian and environmental work: projects, organisations, funding and local issues.";

/** Shortens free text to one clean sentence-length line for page descriptions. */
export function metaDescription(value: string | null | undefined, fallback = SITE_DESCRIPTION, max = 160) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
