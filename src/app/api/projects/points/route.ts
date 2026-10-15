import { NextResponse, type NextRequest } from "next/server";

import { fetchProjectPoints } from "@/lib/projects/findProjectsQuery";

/**
 * GeoJSON of every listed project (community and imported) matching the Find Projects filters (same query
 * string), for the clustered map layer. Public data, CDN-cached for 10 minutes.
 * Feature properties: id (slug), c (h = humanitarian, e = environmental), a (1 = country centre, approximate).
 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  try {
    const points = await fetchProjectPoints(params);
    return NextResponse.json(
      {
        type: "FeatureCollection",
        features: points.map((point) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [round(point.lng), round(point.lat)] },
          properties: { id: point.slug, c: point.category === "humanitarian" ? "h" : "e", a: point.approximate ? 1 : 0 },
        })),
      },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    console.error("Project points failed", error);
    return NextResponse.json({ type: "FeatureCollection", features: [] }, { status: 500 });
  }
}

const round = (value: number) => Math.round(value * 1e4) / 1e4;
