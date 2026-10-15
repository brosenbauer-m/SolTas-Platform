import type { ProjectMarker } from "@/lib/projects/findProjectsQuery";
import { getServerSupabase } from "@/lib/supabaseServer";

const DEFAULT_LIMIT = 120;

export async function fetchHomeProjectMarkers(limit: number = DEFAULT_LIMIT): Promise<ProjectMarker[]> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("projects")
    .select("id,slug,name,category,lat,lng,place_name,description")
    // Imported (IATI) projects are drawn as a separate dot layer on the home globe.
    .filter("source", "eq", "community")
    .order("created_at", { ascending: false })
    .limit(limit);

  // Unlisted/private projects are reachable by link only, never listed.
  query = query.eq("visibility", "public");

  if (!user) {
    query = query.eq("status", "approved");
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as ProjectMarker[];
}
