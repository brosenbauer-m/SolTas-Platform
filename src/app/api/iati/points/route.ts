import { NextResponse, type NextRequest } from "next/server";

import { fetchIatiPoints, parseIatiFilters } from "@/lib/iati/query";

/**
 * GeoJSON of IATI activity points for the Find Projects globe, filtered like the page
 * (same query string). Public data, cached by the CDN for an hour.
 * Feature properties: id (IATI identifier), a = 1 when the point is a country centre (approximate).
 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseIatiFilters(params);

  try {
    const points = filters ? await fetchIatiPoints(filters) : [];
    const body = {
      type: "FeatureCollection",
      features: points.map((point) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [round(point.lng), round(point.lat)] },
        properties: { id: point.id, a: point.approximate ? 1 : 0 },
      })),
    };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("IATI points failed", error);
    return NextResponse.json({ type: "FeatureCollection", features: [] }, { status: 500 });
  }
}

const round = (value: number) => Math.round(value * 1e4) / 1e4;
