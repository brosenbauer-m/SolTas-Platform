import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import ProjectsFilters from "@/components/projects/ProjectsFilters";
import ProjectsGlobeSplitView from "@/components/projects/ProjectsGlobeSplitView";
import ProjectsTableView from "@/components/projects/ProjectsTableView";
import ProjectsViewToggle from "@/components/projects/ProjectsViewToggle";
import IatiTableView from "@/components/projects/IatiTableView";
import { COUNTRY_NAMES } from "@/lib/geo/countries";
import {
  countIatiActivities,
  fetchIatiList,
  iatiHiddenByFilters,
  parseIatiFilters,
  parseSource,
} from "@/lib/iati/query";
import {
  fetchFindProjects,
  fetchProjectFilterOptions,
  fetchProjectMarkers,
  type ProjectListRow,
} from "@/lib/projects/findProjectsQuery";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function FindProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params: SearchParams = searchParams ? await searchParams : {};

  const viewParam = typeof params.view === "string" ? params.view : "globe";
  const view: "globe" | "table" = viewParam === "table" ? "table" : "globe";
  const focus = typeof params.focus === "string" ? params.focus : null;
  const source = parseSource(params);
  const showCommunity = source !== "iati";
  const iatiFilters = parseIatiFilters(params);
  const iatiNote = iatiHiddenByFilters(params)
    ? "IATI activities are hidden because some of your filters only apply to community projects"
    : null;

  let rows: ProjectListRow[] = [];
  let count = 0;
  let page = 1;
  let pageCount = 1;

  if (showCommunity) {
    try {
      const result = await fetchFindProjects({ searchParams: params });
      rows = result.rows;
      count = result.count;
      page = result.page;
      pageCount = result.pageCount;
    } catch (error) {
      console.error("Find projects: list query failed", error);
    }
  }

  const iatiCount = iatiFilters
    ? await countIatiActivities(iatiFilters).catch((error) => {
        console.error("Find projects: IATI count failed", error);
        return 0;
      })
    : 0;

  // Same filters for the IATI points API (minus page-only params).
  const iatiQuery = iatiFilters ? toQueryString(params, ["view", "focus", "page"]) : null;

  const iatiList =
    view === "table" && source === "iati" && iatiFilters
      ? await fetchIatiList(iatiFilters, Number(params.page) || 1).catch((error) => {
          console.error("Find projects: IATI list failed", error);
          return null;
        })
      : null;

  const projectOptions = await fetchProjectFilterOptions().catch((error) => {
    console.error("Find projects: filter options failed", error);
    return { countries: [], regions: [], thematic: [], interventions: [], demographics: [], organisations: [] };
  });
  // Every country, not only those community projects use, so IATI activities can be filtered too.
  const countryValues = new Set([...projectOptions.countries.map((option) => option.value), ...COUNTRY_NAMES]);
  const filterOptions = {
    ...projectOptions,
    countries: [...countryValues].sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value })),
  };

  let markers: Awaited<ReturnType<typeof fetchProjectMarkers>> = [];
  if (view === "globe" && showCommunity) {
    try {
      markers = await fetchProjectMarkers({ searchParams: params });
    } catch (error) {
      console.error("Find projects: marker query failed", error);
    }
  }

  return (
    <main className="flex w-full flex-1 min-h-0 flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <PageHeader
        compact
        title="Projects"
        description={
          <>
            Humanitarian and environmental projects from around the world.{" "}
            <span className="whitespace-nowrap">
              {[
                showCommunity ? `${count.toLocaleString()} community projects` : null,
                iatiFilters ? `${iatiCount.toLocaleString()} published to IATI` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </>
        }
        actions={
          <>
            <ProjectsViewToggle view={view} />
            <Link href="/projects/new" className={buttonClasses({ size: "sm" })}>
              New project
            </Link>
          </>
        }
      />

      {view === "globe" ? (
        <div className="flex-1 min-h-0">
          <ProjectsGlobeSplitView
            options={filterOptions}
            markers={markers}
            totalCount={count}
            focusSlug={focus}
            iatiQuery={iatiQuery}
            iatiCount={iatiCount}
            iatiNote={iatiNote}
            showCommunity={showCommunity}
          />
        </div>
      ) : (
        <>
          <div className="card p-5 lg:p-6">
            <ProjectsFilters options={filterOptions} />
          </div>
          {source === "iati" ? (
            iatiList ? (
              <IatiTableView {...iatiList} searchParams={params} />
            ) : (
              <p className="text-sm text-soltas-muted">{iatiNote ?? "IATI activities couldn’t be loaded."}</p>
            )
          ) : (
            <>
              <ProjectsTableView rows={rows} count={count} page={page} pageCount={pageCount} searchParams={params} />
              {source === "all" && iatiCount > 0 ? (
                <p className="text-sm text-soltas-muted">
                  Plus {iatiCount.toLocaleString()} activities published to IATI.{" "}
                  <Link
                    href={`/projects?${toQueryString({ ...params, source: "iati" }, ["page"])}`}
                    className="font-medium text-soltas-ocean hover:underline"
                  >
                    Show them
                  </Link>
                </p>
              ) : null}
            </>
          )}
        </>
      )}
    </main>
  );
}

function toQueryString(params: SearchParams, omit: string[]) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (omit.includes(key) || value == null) continue;
    const joined = Array.isArray(value) ? value.join(",") : value;
    if (joined) query.set(key, joined);
  }
  return query.toString();
}
