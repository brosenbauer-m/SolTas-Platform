import { Lock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import GrantsFilters from "@/components/grants/GrantsFilters";
import GrantsGlobeSplitView from "@/components/grants/GrantsGlobeSplitView";
import GrantsTableView from "@/components/grants/GrantsTableView";
import GrantsViewToggle from "@/components/grants/GrantsViewToggle";
import {
  fetchFindGrants,
  fetchGrantFilterOptions,
  fetchGrantMarkers,
  type GrantListRow,
} from "@/lib/grants/findGrantsQuery";
import { getServerSupabase } from "@/lib/supabaseServer";
import Link from "next/link";
import { plural } from "@/lib/plural";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Find funding", description: "Open and upcoming grants for humanitarian and environmental projects, with deadlines, amounts and eligibility." };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function FindFundingPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params: SearchParams = searchParams ? await searchParams : {};

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Funding is only visible to authenticated users
  if (!user) {
    return (
      <main className="flex w-full flex-1 min-h-0 flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <PageHeader
          title="Funding"
          description="Grants and funding opportunities for environmental and humanitarian work."
        />
        <EmptyState
          icon={<Lock />}
          title="Log in to see funding opportunities"
          description="Funding details are shared with members. Creating an account is free."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/login?returnTo=/funding" className={buttonClasses()}>
                Log in
              </Link>
              <Link href="/signup?returnTo=/funding" className={buttonClasses({ variant: "outline" })}>
                Create an account
              </Link>
            </div>
          }
        />
      </main>
    );
  }

  const mapboxEnabled =
    typeof process.env.NEXT_PUBLIC_MAPBOX_TOKEN === "string" &&
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN.length > 0;

  const defaultView = mapboxEnabled ? "globe" : "table";
  const viewParam = typeof params.view === "string" ? params.view : defaultView;
  const view: "globe" | "table" = viewParam === "table" ? "table" : "globe";
  const safeView: "globe" | "table" = mapboxEnabled ? view : "table";
  const focus = typeof params.focus === "string" ? params.focus : null;

  const filterOptions = await fetchGrantFilterOptions();

  let rows: GrantListRow[] = [];
  let count = 0;
  let page = 1;
  let pageCount = 1;

  try {
    const result = await fetchFindGrants({ searchParams: params });
    rows = result.rows;
    count = result.count;
    page = result.page;
    pageCount = result.pageCount;
  } catch (error) {
    console.error("Find funding: list query failed", error);
  }

  let markers: Awaited<ReturnType<typeof fetchGrantMarkers>> = [];
  if (view === "globe") {
    try {
      markers = await fetchGrantMarkers({ searchParams: params });
    } catch (error) {
      console.error("Find funding: marker query failed", error);
    }
  }

  return (
    <main className="flex w-full flex-1 min-h-0 flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <PageHeader
        compact
        title="Funding"
        description={
          <>
            Grants and funding opportunities for environmental and humanitarian work.{" "}
            <span className="whitespace-nowrap">{plural(count, "funding opportunity", "funding opportunities")}</span>
          </>
        }
        actions={
          <>
            <GrantsViewToggle view={safeView} />
            <Link href="/funding/new" className={buttonClasses({ size: "sm" })}>
              Add funding
            </Link>
          </>
        }
      />

      {safeView === "globe" ? (
        <div className="flex-1 min-h-0">
          <GrantsGlobeSplitView
            options={filterOptions}
            markers={markers}
            totalCount={count}
            focusSlug={focus}
            results={<GrantsTableView rows={rows} count={count} page={page} pageCount={pageCount} searchParams={params} />}
          />
        </div>
      ) : (
        <>
          <div className="card p-5 lg:p-6">
            <GrantsFilters options={filterOptions} />
          </div>
          <GrantsTableView rows={rows} count={count} page={page} pageCount={pageCount} searchParams={params} />
        </>
      )}
    </main>
  );
}
