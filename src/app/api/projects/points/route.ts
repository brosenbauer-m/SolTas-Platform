import { NextResponse, type NextRequest } from "next/server";

import { fetchProjectPoints } from "@/lib/projects/findProjectsQuery";
import { pointsToGeoJson } from "@/lib/projects/pointsGeoJson";

export const maxDuration = 60;

/**
 * GeoJSON of every listed project (community and imported) matching the Find Projects filters (same query
 * string), for the clustered map layer. Public data, CDN-cached for 10 minutes.
 *
 * Feature shape: see src/lib/projects/pointsGeoJson.ts.
 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  try {
    const points = await fetchProjectPoints(params);
    return NextResponse.json(pointsToGeoJson(points), {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("Project points failed", error);
    return NextResponse.json({ type: "FeatureCollection", features: [] }, { status: 500 });
  }
}
