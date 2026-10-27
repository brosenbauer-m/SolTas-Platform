import { NextResponse } from "next/server";

import { fetchHomeGrantMarkers } from "@/lib/grants/homeGrantsQuery";
import { fetchHomeProjectMarkers } from "@/lib/projects/homeProjectsQuery";
import { fetchHomeWatchdogMarkers } from "@/lib/watchdog/homeWatchdogQuery";

// Funding markers are for signed-in people only, so the answer depends on who asks: never share it through
// the CDN (an admin's or member's answer must not reach anonymous visitors, and the other way round).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [projectMarkers, grantMarkers, issueMarkers] = await Promise.all([
      fetchHomeProjectMarkers(),
      fetchHomeGrantMarkers(),
      fetchHomeWatchdogMarkers(),
    ]);

    return NextResponse.json(
      {
        projectMarkers,
        grantMarkers,
        issueMarkers,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load home markers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
