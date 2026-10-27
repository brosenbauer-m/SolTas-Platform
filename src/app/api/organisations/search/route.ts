import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { IATI_ORG_ID } from "@/lib/iati/systemOrg";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ organisations: [] });
  }

  const supabase = await getServerSupabase();

  // Search only verified organisations using the view
  const { data, error } = await supabase
    .from("verified_organisations")
    .select("id, name")
    .ilike("name", `%${query}%`)
    .limit(10);

  if (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search organisations" },
      { status: 500 }
    );
  }

  // Fetch additional details for each organisation
  const orgIds = (data || []).map((org) => org.id);

  if (orgIds.length === 0) {
    return NextResponse.json({ organisations: [] });
  }

  const { data: orgsWithDetails, error: detailsError } = await supabase
    .from("organisations")
    .select("id, name, logo_url, country_based")
    .in("id", orgIds)
    .neq("id", IATI_ORG_ID)
    .eq("verification_status", "verified");

  if (detailsError) {
    console.error("Details error:", detailsError);
    return NextResponse.json(
      { error: "Failed to fetch organisation details" },
      { status: 500 }
    );
  }

  return NextResponse.json({ organisations: orgsWithDetails || [] });
}
