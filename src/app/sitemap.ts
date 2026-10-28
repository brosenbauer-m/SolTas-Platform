import type { MetadataRoute } from "next";

import { IATI_ORG_ID } from "@/lib/iati/systemOrg";
import { SITE_URL } from "@/lib/siteUrl";
import { getPublicSupabase } from "@/lib/supabasePublic";

export const revalidate = 86400; // rebuilt once a day

const LIMIT = 5000;

/**
 * Pages worth indexing: the main sections, community projects, organisations, funding and issues.
 * Imported IATI projects are left out on purpose (25k pages that exist on d-portal already).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getPublicSupabase();
  const now = new Date();
  const statics: MetadataRoute.Sitemap = [
    "",
    "/projects",
    "/find-organisations",
    "/funding",
    "/issues",
    "/feed",
    "/about",
    "/privacy",
    "/legal",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
  }));

  let projects, organisations, grants, issues;
  try {
    [projects, organisations, grants, issues] = await Promise.all([
      supabase
        .from("projects")
        .select("slug,created_at")
        .eq("status", "approved")
        .eq("visibility", "public")
        .eq("source", "community")
        .not("slug", "is", null)
        .limit(LIMIT),
      supabase
        .from("organisations")
        .select("id,created_at")
        .eq("verification_status", "verified")
        .neq("id", IATI_ORG_ID)
        .limit(LIMIT),
      supabase.from("grants").select("slug,created_at").not("slug", "is", null).limit(LIMIT),
      supabase.from("watchdog_issues").select("id,created_at").eq("status", "approved").limit(LIMIT),
    ]);
  } catch (error) {
    console.error("Sitemap: database unavailable, static pages only", error);
    return statics;
  }

  const entry = (path: string, date: string | null): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    lastModified: date ? new Date(date) : now,
  });

  return [
    ...statics,
    ...(projects.data ?? []).map((p) => entry(`/projects/${encodeURIComponent(p.slug as string)}`, p.created_at)),
    ...(organisations.data ?? []).map((o) => entry(`/organisations/${o.id}`, o.created_at)),
    ...(grants.data ?? []).map((g) => entry(`/funding/${encodeURIComponent(g.slug as string)}`, g.created_at)),
    ...(issues.data ?? []).map((i) => entry(`/issues/${i.id}`, i.created_at)),
  ];
}
