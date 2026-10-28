import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import WatchdogFilters from "@/components/watchdog/WatchdogFilters";
import WatchdogGlobeSplitView from "@/components/watchdog/WatchdogGlobeSplitView";
import WatchdogTableView from "@/components/watchdog/WatchdogTableView";
import WatchdogViewToggle from "@/components/watchdog/WatchdogViewToggle";
import {
  fetchWatchdogFilterOptions,
  fetchWatchdogIssues,
  fetchWatchdogMarkers,
  type WatchdogIssueListRow,
} from "@/lib/watchdog/findWatchdogIssuesQuery";
import { plural } from "@/lib/plural";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Issues", description: "Local humanitarian and environmental issues raised by the people who live them." };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function WatchdogPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params: SearchParams = searchParams ? await searchParams : {};

  const mapboxEnabled =
    typeof process.env.NEXT_PUBLIC_MAPBOX_TOKEN === "string" &&
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN.length > 0;

  const defaultView = mapboxEnabled ? "globe" : "table";
  const viewParam = typeof params.view === "string" ? params.view : defaultView;
  const view: "globe" | "table" = viewParam === "table" ? "table" : "globe";
  const safeView: "globe" | "table" = mapboxEnabled ? view : "table";
  const focus = typeof params.focus === "string" ? params.focus : null;

  const filterOptions = await fetchWatchdogFilterOptions();

  let rows: WatchdogIssueListRow[] = [];
  let count = 0;
  let page = 1;
  let pageCount = 1;

  try {
    const result = await fetchWatchdogIssues({ searchParams: params });
    rows = result.rows;
    count = result.count;
    page = result.page;
    pageCount = result.pageCount;
  } catch (error) {
    console.error("Issues: list query failed", error);
  }

  let markers: Awaited<ReturnType<typeof fetchWatchdogMarkers>> = [];
  if (safeView === "globe") {
    try {
      markers = await fetchWatchdogMarkers({ searchParams: params });
    } catch (error) {
      console.error("Issues: marker query failed", error);
    }
  }

  return (
    <main className="flex w-full flex-1 min-h-0 flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <PageHeader
        compact
        title="Issues"
        description={
          <>
            Issues raised by local advocates and reviewed by the Solarpunk Taskforce.{" "}
            <span className="whitespace-nowrap">{plural(count, "issue")}</span>
          </>
        }
        actions={
          <>
            <WatchdogViewToggle view={safeView} />
            <Link href="/issues/new" className={buttonClasses({ size: "sm" })}>
              Report an issue
            </Link>
          </>
        }
      />

      {safeView === "globe" ? (
        <div className="flex-1 min-h-0">
          <WatchdogGlobeSplitView
            markers={markers}
            totalCount={count}
            focusId={focus}
            options={filterOptions}
            results={<WatchdogTableView rows={rows} count={count} page={page} pageCount={pageCount} searchParams={params} />}
          />
        </div>
      ) : (
        <>
          <div className="card p-5 lg:p-6">
            <WatchdogFilters options={filterOptions} />
          </div>
          <WatchdogTableView rows={rows} count={count} page={page} pageCount={pageCount} searchParams={params} />
        </>
      )}
    </main>
  );
}
