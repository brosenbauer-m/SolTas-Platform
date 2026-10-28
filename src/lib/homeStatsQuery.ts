import "server-only";

import { headers } from "next/headers";

import type { HomeStats } from "@/lib/homeStats";

let hasWarned = false;

const getBaseUrl = async () => {
  const headerList = await headers();
  const host = headerList.get("host");
  if (host) {
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    return `${protocol}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isOptionalNumber = (value: unknown) => value === undefined || (typeof value === "number" && !Number.isNaN(value));

const validateHomeStats = (stats: HomeStats) => {
  if (!isRecord(stats.projects) || !isRecord(stats.funding) || !isRecord(stats.issues)) return false;
  return (
    isOptionalNumber(stats.projects.projects_approved) &&
    isOptionalNumber(stats.projects.projects_ongoing) &&
    isOptionalNumber(stats.projects.organisations_registered) &&
    isOptionalNumber(stats.projects.changemakers) &&
    isOptionalNumber(stats.projects.lives_improved) &&
    isOptionalNumber(stats.projects.donations_received_eur) &&
    isOptionalNumber(stats.funding.opportunities_total) &&
    isOptionalNumber(stats.funding.funders_registered) &&
    isOptionalNumber(stats.funding.open_calls) &&
    isOptionalNumber(stats.issues.issues_total) &&
    isOptionalNumber(stats.issues.issues_open)
  );
};

export async function fetchHomeStats(): Promise<HomeStats> {
  const baseUrl = await getBaseUrl();
  const response = await fetch(`${baseUrl}/api/home-stats`, {
    cache: "force-cache",
    next: { revalidate: 600 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch home stats: ${response.status}`);
  }

  const stats = (await response.json()) as HomeStats;

  if (process.env.NODE_ENV === "development" && !hasWarned && !validateHomeStats(stats)) {
    hasWarned = true;
    console.warn("Home stats response failed basic validation. Check stats aggregation filters.");
  }

  return stats;
}
