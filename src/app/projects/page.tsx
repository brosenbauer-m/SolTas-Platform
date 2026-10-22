import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import ProjectsFilters from "@/components/projects/ProjectsFilters";
import ProjectsGlobeSplitView from "@/components/projects/ProjectsGlobeSplitView";
import ProjectsTableView from "@/components/projects/ProjectsTableView";
import ProjectsViewToggle from "@/components/projects/ProjectsViewToggle";
import { COUNTRY_NAMES } from "@/lib/geo/countries";
import { fetchFindProjects, fetchProjectFilterOptions, type ProjectListRow } from "@/lib/projects/findProjectsQuery";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function FindProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params: SearchParams = searchParams ? await searchParams : {};

  const viewParam = typeof params.view === "string" ? params.view : "globe";
  const view: "globe" | "table" = viewParam === "table" ? "table" : "globe";

  let rows: ProjectListRow[] = [];
  let count = 0;
  let page = 1;
  let pageCount = 1;

  try {
    const result = await fetchFindProjects({ searchParams: params });
    rows = result.rows;
    count = result.count;
    page = result.page;
    pageCount = result.pageCount;
  } catch (error) {
    console.error("Find projects: list query failed", error);
  }

  const projectOptions = await fetchProjectFilterOptions().catch((error) => {
    console.error("Find projects: filter options failed", error);
    return { countries: [], regions: [], thematic: [], interventions: [], demographics: [], organisations: [] };
  });
  // Every country, not only those in use, so imported projects can be filtered by any country.
  const countryValues = new Set([...projectOptions.countries.map((option) => option.value), ...COUNTRY_NAMES]);
  const filterOptions = {
    ...projectOptions,
    countries: [...countryValues].sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value })),
  };

  return (
    <main className="flex w-full flex-1 min-h-0 flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <PageHeader
        compact
        title="Projects"
        description={
          <>
            Humanitarian and environmental projects from around the world.{" "}
            <span className="whitespace-nowrap">{count.toLocaleString()} projects</span>
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
            totalCount={count}
            pointsQuery={toQueryString(params, ["view", "focus", "page", "sort", "dir"])}
            results={
              <ProjectsTableView rows={rows} count={count} page={page} pageCount={pageCount} searchParams={params} />
            }
          />
        </div>
      ) : (
        <>
          <div className="card p-5 lg:p-6">
            <ProjectsFilters options={filterOptions} />
          </div>
          <ProjectsTableView rows={rows} count={count} page={page} pageCount={pageCount} searchParams={params} />
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
