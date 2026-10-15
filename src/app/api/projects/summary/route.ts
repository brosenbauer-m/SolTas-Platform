import { NextResponse, type NextRequest } from "next/server";

import { getPublicSupabase } from "@/lib/supabasePublic";

type SourceData = { reporting_org?: { name?: string | null } | null } | null;

/** Short summary of one project for map popups: /api/projects/summary?slug=<slug>. */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const { data, error } = await getPublicSupabase()
    .from("projects")
    .select("slug,name,description,place_name,country,category,source,source_data,point_precision,lead_org:organisations!projects_lead_org_id_fkey(name)")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("Project summary failed", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const imported = data.source === "iati";
  const leadOrg = Array.isArray(data.lead_org) ? data.lead_org[0] : data.lead_org;
  const organisation = imported ? ((data.source_data as SourceData)?.reporting_org?.name ?? null) : (leadOrg?.name ?? null);

  return NextResponse.json(
    {
      title: data.name,
      eyebrow: imported ? "Published to IATI" : data.category === "humanitarian" ? "Humanitarian project" : "Environmental project",
      organisation,
      place: data.place_name ?? data.country,
      description: data.description,
      approximate: data.point_precision === "country" || data.point_precision === "region",
      href: `/projects/${encodeURIComponent(data.slug ?? slug)}`,
    },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" } },
  );
}
