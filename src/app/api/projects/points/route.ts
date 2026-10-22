import { NextResponse, type NextRequest } from "next/server";

import { fetchProjectPoints, type ProjectPoint } from "@/lib/projects/findProjectsQuery";

export const maxDuration = 60;

/**
 * GeoJSON of every listed project (community and imported) matching the Find Projects filters (same query
 * string), for the clustered map layer. Public data, CDN-cached for 10 minutes.
 *
 * Projects at exactly the same spot (often a country centre or a city) become one feature, so the map can show
 * how many are there instead of drawing them on top of each other:
 *   n  number of projects at this spot (cluster circles add these up)
 *   id slug, when n = 1
 *   k  "lng,lat" of the spot, when n > 1 (for /api/projects/at)
 *   a  1 = only the country (or region) is known, the dot is its centre
 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  try {
    const points = await fetchProjectPoints(params);
    const spots = new Map<string, { lng: number; lat: number; items: ProjectPoint[] }>();
    for (const point of points) {
      const lng = round(point.lng);
      const lat = round(point.lat);
      const key = `${lng},${lat}`;
      const spot = spots.get(key);
      if (spot) spot.items.push(point);
      else spots.set(key, { lng, lat, items: [point] });
    }
    const features = [...spots.entries()].map(([key, spot]) => {
      const single = spot.items.length === 1;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [spot.lng, spot.lat] },
        properties: single
          ? { id: spot.items[0].slug, n: 1, a: spot.items[0].approximate ? 1 : 0 }
          : { k: key, n: spot.items.length, a: spot.items.every((item) => item.approximate) ? 1 : 0 },
      };
    });
    return NextResponse.json(
      { type: "FeatureCollection", features },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    console.error("Project points failed", error);
    return NextResponse.json({ type: "FeatureCollection", features: [] }, { status: 500 });
  }
}

/** 4 decimals ≈ 11 m: projects closer than that share one spot on the map. */
const round = (value: number) => Math.round(value * 1e4) / 1e4;
