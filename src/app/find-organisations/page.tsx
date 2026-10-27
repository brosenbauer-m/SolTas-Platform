import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
// src/app/find-organisations/page.tsx
import Link from "next/link";

import OrganisationsGlobeSplitView from "@/components/organisations/OrganisationsGlobeSplitView";
import OrganisationsFilters from "@/components/organisations/OrganisationsFilters";
import OrganisationsTableView from "@/components/organisations/OrganisationsTableView";
import OrganisationsViewToggle from "@/components/organisations/OrganisationsViewToggle";
import {
  fetchFindOrganisations,
  fetchOrganisationFilterOptions,
  fetchOrganisationMarkers,
  type OrganisationListRow,
} from "@/lib/organisations/findOrganisationsQuery";
import { plural } from "@/lib/plural";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function FindOrganisationsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params: SearchParams = searchParams ? await searchParams : {};

  const viewParam = typeof params.view === "string" ? params.view : "globe";
  const view: "globe" | "table" = viewParam === "table" ? "table" : "globe";
  const focus = typeof params.focus === "string" ? params.focus : null;

  const filterOptions = await fetchOrganisationFilterOptions();

  let rows: OrganisationListRow[] = [];
  let count = 0;
  let page = 1;
  let pageCount = 1;

  try {
    const result = await fetchFindOrganisations({ searchParams: params });
    rows = result.rows;
    count = result.count;
    page = result.page;
    pageCount = result.pageCount;
  } catch (e) {
    console.error("Find organisations: list query failed", e);
  }

  let markers: Awaited<ReturnType<typeof fetchOrganisationMarkers>> = [];
  if (view === "globe") {
    try {
      markers = await fetchOrganisationMarkers({ searchParams: params });
    } catch (e) {
      console.error("Find organisations: marker query failed", e);
    }
  }

  return (
    // CRITICAL: this must be a flex child that can grow
    <main className="flex w-full flex-1 min-h-0 flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <PageHeader
        compact
        title="Organisations"
        description={
          <>
            Verified organisations, where they work and what they need.{" "}
            <span className="whitespace-nowrap">{plural(count, "organisation")}</span>
          </>
        }
        actions={
          <>
            <OrganisationsViewToggle view={view} />
            <Link href="/organisations/create" className={buttonClasses({ size: "sm" })}>
              Register organisation
            </Link>
          </>
        }
      />

      {view === "globe" ? (
        // CRITICAL: allow the split view to fill remaining height under header
        <div className="flex-1 min-h-0">
          <OrganisationsGlobeSplitView
            options={filterOptions}
            markers={markers}
            totalCount={count}
            focusSlug={focus}
            results={
              <OrganisationsTableView rows={rows} count={count} page={page} pageCount={pageCount} searchParams={params} />
            }
          />
        </div>
      ) : (
        <>
          <div className="card p-5 lg:p-6">
            <OrganisationsFilters options={filterOptions} showSorting />
          </div>

          <OrganisationsTableView rows={rows} count={count} page={page} pageCount={pageCount} searchParams={params} />
        </>
      )}
    </main>
  );
}
