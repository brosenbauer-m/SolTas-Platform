import type { ProjectMarker } from "@/lib/projects/findProjectsQuery";
import { getPublicSupabase } from "@/lib/supabasePublic";

const DEFAULT_LIMIT = 120;

export async function fetchHomeProjectMarkers(limit: number = DEFAULT_LIMIT): Promise<ProjectMarker[]> {
  // Same for everyone: only approved, public projects (never someone's pending or rejected ones).
  const supabase = getPublicSupabase();
  const query = supabase
    .from("projects")
    .select("id,slug,name,category,lat,lng,place_name,description")
    // Imported (IATI) projects are drawn as a separate dot layer on the home globe.
    .filter("source", "eq", "community")
    // Unlisted/private projects are reachable by link only, never listed.
    .eq("visibility", "public")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as ProjectMarker[];
}
