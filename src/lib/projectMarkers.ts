import { getServerSupabase } from "@/lib/supabaseServer";

export type ProjectMarker = {
  id: string;
  slug: string;
  title: string;
  lat: number;
  lng: number;
  placeName?: string | null;
  description?: string | null;
};

type MarkerFilters = {
  category?: string;
  limit?: number;
};

export async function fetchApprovedProjectMarkers(filters: MarkerFilters = {}): Promise<ProjectMarker[]> {
  const supabase = await getServerSupabase();

  let query = supabase
    .from("projects")
    .select("id, slug, name, description, place_name, lat, lng")
    .eq("status", "approved")
    .eq("visibility", "public")
    .not("lat", "is", null)
    .not("lng", "is", null);

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load approved projects for map", error);
    return [];
  }

  return (data ?? []).map(project => ({
    id: project.id,
    slug: project.slug ?? project.id,
    title: project.name,
    lat: project.lat!,
    lng: project.lng!,
    placeName: project.place_name,
    description: project.description ?? undefined,
  }));
}
