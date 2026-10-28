import { NextResponse } from "next/server";

import type { ProjectPoint } from "@/lib/projects/findProjectsQuery";
import { pointsToGeoJson } from "@/lib/projects/pointsGeoJson";
import { getServerSupabase } from "@/lib/supabaseServer";

// Depends on who asks: never shared through the CDN.
export const dynamic = "force-dynamic";

const LIMIT = 2000;

type Row = {
  id: string;
  slug: string | null;
  lat: number | null;
  lng: number | null;
  category: string;
  point_precision: string | null;
};

/**
 * The signed-in person's "Following" view of the globe: projects they follow plus the listed projects of
 * organisations they follow, as the same GeoJSON as /api/projects/points. 401 when not signed in.
 */
export async function GET() {
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "Sign in to see what you follow." }, { status: 401 });

  const { data: edges, error: edgesError } = await supabase
    .from("follow_edges")
    .select("target_type,target_project_id,target_org_id")
    .eq("follower_user_id", auth.user.id)
    .in("target_type", ["project", "org"]);
  if (edgesError) return NextResponse.json({ error: edgesError.message }, { status: 500 });

  const projectIds = (edges ?? []).map((e) => e.target_project_id).filter((v): v is string => Boolean(v));
  const orgIds = (edges ?? []).map((e) => e.target_org_id).filter((v): v is string => Boolean(v));
  if (!projectIds.length && !orgIds.length) {
    return NextResponse.json(
      { ...pointsToGeoJson([]), total: 0 },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const conditions = [
    projectIds.length ? `id.in.(${projectIds.join(",")})` : null,
    orgIds.length ? `lead_org_id.in.(${orgIds.join(",")})` : null,
    orgIds.length ? `and(owner_type.eq.organisation,owner_id.in.(${orgIds.join(",")}))` : null,
  ].filter((c): c is string => Boolean(c));

  const { data, error } = await supabase
    .from("projects")
    .select("id,slug,lat,lng,category,point_precision")
    .or(conditions.join(","))
    .eq("status", "approved")
    .in("visibility", ["public", "unlisted"])
    .not("lat", "is", null)
    .not("lng", "is", null)
    .limit(LIMIT);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const points: ProjectPoint[] = ((data ?? []) as unknown as Row[])
    .filter((row) => row.lat != null && row.lng != null)
    .map((row) => ({
      slug: row.slug ?? row.id,
      lat: row.lat as number,
      lng: row.lng as number,
      category: row.category,
      approximate: row.point_precision === "country" || row.point_precision === "region",
    }));

  return NextResponse.json(
    { ...pointsToGeoJson(points), total: points.length },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
