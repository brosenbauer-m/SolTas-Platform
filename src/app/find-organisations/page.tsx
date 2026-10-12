import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
// src/app/find-organisations/page.tsx
import Link from "next/link";

import OrganisationsGlobeSplitView from "@/components/organisations/OrganisationsGlobeSplitView";
import OrganisationsFilters from "@/components/organisations/OrganisationsFilters";
import OrganisationsPagination from "@/components/organisations/OrganisationsPagination";
import OrganisationsViewToggle from "@/components/organisations/OrganisationsViewToggle";
import {
  PAGE_SIZE,
  fetchFindOrganisations,
  fetchOrganisationFilterOptions,
  fetchOrganisationMarkers,
  type OrganisationListRow,
} from "@/lib/organisations/findOrganisationsQuery";

const formatLocation = (organisation: OrganisationListRow) => {
  if (organisation.based_in_region && organisation.based_in_country) {
    return `${organisation.based_in_region}, ${organisation.based_in_country}`;
  }
  return organisation.based_in_region ?? organisation.based_in_country ?? "—";
};

const formatNumber = (value: number | null) => {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
};

const formatFunding = (value: number | null) => {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatAge = (value: number | null) => {
  if (typeof value !== "number") return "—";
  return `${value} yrs`;
};

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
    <main className="mx-auto flex w-full max-w-7xl flex-1 min-h-0 flex-col gap-5 px-4 py-8 sm:gap-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Organisations"
        description={
          <>
            Verified organisations, where they work and what they need.{" "}
            <span className="whitespace-nowrap">{count.toLocaleString()} organisations</span>
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
          />
        </div>
      ) : (
        <>
          <OrganisationsFilters options={filterOptions} showSorting variant="panel" />

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-soltas-muted">
                Showing {rows.length} of {count} organisations · {PAGE_SIZE} per page
              </p>
              <OrganisationsPagination page={page} pageCount={pageCount} searchParams={params} />
            </div>

            <div className="overflow-x-auto rounded-lg border border-soltas-line bg-white">
              <table className="min-w-[900px] divide-y divide-soltas-line text-sm">
                <thead className="bg-soltas-off-white text-left text-xs font-medium text-soltas-muted">
                  <tr>
                    <th className="px-4 py-3">Organisation</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Projects carried out</th>
                    <th className="px-4 py-3">Ongoing projects</th>
                    <th className="px-4 py-3">Followers</th>
                    <th className="px-4 py-3">Funding needed</th>
                    <th className="px-4 py-3">Age</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-soltas-line">
                  {rows.map((organisation) => (
                    <tr key={organisation.id} className="align-top">
                      <td className="px-4 py-4">
                        <Link
                          className="font-semibold text-soltas-ocean hover:text-soltas-abyssal transition-colors"
                          href={`/organisations/${organisation.id}`}
                        >
                          {organisation.name ?? "Untitled organisation"}
                        </Link>
                        <p className="mt-1 text-xs text-soltas-muted">
                          {organisation.description ?? "No description yet."}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-soltas-muted">{formatLocation(organisation)}</td>
                      <td className="px-4 py-4 text-soltas-muted">{formatNumber(organisation.projects_total_count)}</td>
                      <td className="px-4 py-4 text-soltas-muted">{formatNumber(organisation.projects_ongoing_count)}</td>
                      <td className="px-4 py-4 text-soltas-muted">{formatNumber(organisation.followers_count)}</td>
                      <td className="px-4 py-4 text-soltas-muted">{formatFunding(organisation.funding_needed)}</td>
                      <td className="px-4 py-4 text-soltas-muted">{formatAge(organisation.age_years)}</td>

                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/organisations/${organisation.id}`}
                          className="inline-flex items-center justify-center rounded-2xl bg-soltas-ocean px-3 py-2 text-xs font-semibold text-white hover:bg-soltas-abyssal"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-soltas-line p-8 text-center text-sm text-soltas-muted">
                No organisations match the selected filters.
              </div>
            ) : null}

            <OrganisationsPagination page={page} pageCount={pageCount} searchParams={params} />
          </section>
        </>
      )}
    </main>
  );
}
