import { NextResponse } from "next/server";

import { getPublicSupabase } from "@/lib/supabasePublic";
import type { HomeStats } from "@/lib/homeStats";

export const revalidate = 600;

const numberFrom = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.length) return Number(value);
  return undefined;
};

export async function GET() {
  const supabase = getPublicSupabase();
  const { data, error } = await supabase.rpc("get_home_stats");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Columns added in migration 20260324120024 are typed here until the generated types catch up.
  const row = (Array.isArray(data) ? data[0] : data) as
    | ((typeof data extends (infer R)[] ? R : typeof data) & { projects_changemakers?: unknown; projects_lives_improved?: unknown })
    | null
    | undefined;

  const response: HomeStats = {
    updated_at: row?.updated_at ?? new Date().toISOString(),
    projects: {
      projects_approved: numberFrom(row?.projects_projects_approved),
      projects_ongoing: numberFrom(row?.projects_projects_ongoing),
      organisations_registered: numberFrom(row?.projects_organisations_registered),
      changemakers: numberFrom(row?.projects_changemakers),
      lives_improved: numberFrom(row?.projects_lives_improved),
      donations_received_eur: numberFrom(row?.projects_donations_received_eur),
    },
    funding: {
      opportunities_total: numberFrom(row?.funding_opportunities_total),
      funders_registered: numberFrom(row?.funding_funders_registered),
      open_calls: numberFrom(row?.funding_open_calls),
    },
    issues: {
      issues_total: numberFrom(row?.issues_issues_total),
      issues_open: numberFrom(row?.issues_issues_open),
    },
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
