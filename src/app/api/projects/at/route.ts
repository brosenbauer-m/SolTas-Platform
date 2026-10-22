import { NextResponse, type NextRequest } from "next/server";

import { fetchProjectsAt } from "@/lib/projects/findProjectsQuery";

/**
 * Projects at one spot of the map: /api/projects/at?k=<lng>,<lat>&<Find Projects filters>.
 * Used by the popup of a dot that stands for several projects. Public data, CDN-cached for 10 minutes.
 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const [lng, lat] = (params.k ?? "").split(",").map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return NextResponse.json({ error: "Missing or bad k (lng,lat)" }, { status: 400 });
  }
  try {
    const result = await fetchProjectsAt(params, lng, lat);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("Projects at spot failed", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
