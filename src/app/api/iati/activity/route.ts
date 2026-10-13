import { NextResponse, type NextRequest } from "next/server";

import { countryName } from "@/lib/geo/countries";
import { fetchIatiActivity, iatiActivityHref } from "@/lib/iati/query";

/** Short summary of one IATI activity for the globe popup: /api/iati/activity?id=<IATI identifier>. */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const activity = await fetchIatiActivity(id);
    if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(
      {
        title: activity.title,
        organisation: activity.reporting_org_name,
        place: activity.countries.map(countryName).join(", ") || null,
        description: activity.description,
        approximate: activity.point_precision !== "exact",
        href: iatiActivityHref(activity.iati_identifier),
      },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    console.error("IATI activity failed", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
