import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import ProjectsFilters from "@/components/projects/ProjectsFilters";
import ProjectsGlobeSplitView from "@/components/projects/ProjectsGlobeSplitView";
import ProjectsTableView from "@/components/projects/ProjectsTableView";
import ProjectsViewToggle from "@/components/projects/ProjectsViewToggle";
import {
  fetchFindProjects,
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

  let markers: Awaited<ReturnType<typeof fetchProjectMarkers>> = [];
  if (view === "globe") {
    try {
      markers = await fetchProjectMarkers({ searchParams: params });
    } catch (error) {
      console.error("Find projects: marker query failed", error);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 min-h-0 flex-col gap-5 px-4 py-8 sm:gap-6 sm:px-6 sm:py-10">
      <PageHeader
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
          <ProjectsGlobeSplitView markers={markers} totalCount={count} focusSlug={focus} />
        </div>
      ) : (
        <>
          <ProjectsFilters basePath="/projects" showSorting variant="panel" />
          <ProjectsTableView rows={rows} count={count} page={page} pageCount={pageCount} searchParams={params} />
        </>
      )}
    </main>
  );
}
