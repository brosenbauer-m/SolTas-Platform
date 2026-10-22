import Link from "next/link";

import IatiTag from "@/components/iati/IatiTag";
import ProjectsPagination from "@/components/projects/ProjectsPagination";
import { Badge } from "@/components/ui/badge";
import type { ProjectListRow } from "@/lib/projects/findProjectsQuery";
import { cn } from "@/lib/utils";

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short" }).format(date);
};

const formatDateRange = (start: string | null, end: string | null) => {
  const startLabel = formatDate(start);
  const endLabel = formatDate(end);
  if (startLabel === "—" && endLabel === "—") {
    return "—";
  }
  return `${startLabel} → ${endLabel}`;
};

const formatCurrency = (amount: number | null, currency: string | null) => {
  if (typeof amount !== "number") return "—";
  const resolvedCurrency = currency ?? "USD";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: resolvedCurrency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    console.error("currency-format", error);
    return `${amount.toLocaleString()} ${resolvedCurrency}`;
  }
};

const getLocationLabel = (project: ProjectListRow) => {
  if (project.place_name) return project.place_name;
  if (project.region && project.country) return `${project.region}, ${project.country}`;
  if (project.region) return project.region;
  if (project.country) return project.country;
  return "—";
};

const getTagPreview = (project: ProjectListRow) => {
  const tags = project.thematic_area?.filter(Boolean) ?? [];
  if (tags.length) return tags.slice(0, 3);
  const interventions = project.type_of_intervention?.filter(Boolean) ?? [];
  return interventions.slice(0, 3);
};

const getProjectSlug = (project: ProjectListRow) => project.slug ?? project.id;

const buttonClasses =
  "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-soltas-ocean disabled:pointer-events-none disabled:opacity-50";

const buttonSizes = {
  sm: "h-9 px-3",
} as const;

const buttonVariants = {
  secondary: "bg-soltas-ocean text-white hover:bg-soltas-abyssal",
  outline: "border border-soltas-line text-soltas-text hover:bg-soltas-light",
} as const;

type ProjectsTableViewProps = {
  rows: ProjectListRow[];
  count: number;
  page: number;
  pageCount: number;
  searchParams: Record<string, string | string[] | undefined>;
};

export default function ProjectsTableView({
  rows,
  count,
  page,
  pageCount,
  searchParams,
}: ProjectsTableViewProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-soltas-muted">Showing {rows.length} of {count} projects</p>
        <ProjectsPagination page={page} pageCount={pageCount} searchParams={searchParams} basePath="/projects" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-soltas-line bg-white">
        <table className="w-full min-w-[800px] divide-y divide-soltas-line text-sm">
          <thead className="bg-soltas-off-white text-left text-xs font-medium text-soltas-muted">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Timeline</th>
              <th className="px-4 py-3">Funding</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-soltas-line">
            {rows.map(project => {
              const slugForPath = getProjectSlug(project);
              const tags = getTagPreview(project);
              const mapParams = new URLSearchParams();
              mapParams.set("view", "globe");
              if (project.country) {
                mapParams.set("country", project.country);
              }
              const mapHref = `/projects?${mapParams.toString()}`;

              return (
                <tr key={project.id} className="align-top">
                  <td className="px-4 py-4">
                    <Link
                      className="font-semibold text-soltas-ocean hover:text-soltas-abyssal transition-colors"
                      href={`/projects/${encodeURIComponent(slugForPath)}`}
                    >
                      {project.name}
                    </Link>
                    {project.source === "iati" ? <IatiTag className="ml-2" /> : null}
                  </td>
                  <td className="px-4 py-4 capitalize text-soltas-text">{project.category}</td>
                  <td className="px-4 py-4 text-soltas-muted">{getLocationLabel(project)}</td>
                  <td className="px-4 py-4 text-soltas-muted">
                    {formatDateRange(project.start_date, project.end_date)}
                  </td>
                  <td className="px-4 py-4 text-soltas-muted">
                    <div>{formatCurrency(project.donations_received, project.currency)}</div>
                    <div className="text-xs text-soltas-muted">
                      of {formatCurrency(project.amount_needed, project.currency)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {tags.length > 0 ? (
                        tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-soltas-muted">No tags</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                      <Link
                        href={`/projects/${encodeURIComponent(slugForPath)}`}
                        className={cn(buttonClasses, buttonSizes.sm, buttonVariants.secondary)}
                      >
                        Open
                      </Link>
                      <Link href={mapHref} className={cn(buttonClasses, buttonSizes.sm, buttonVariants.outline)}>
                        See on the map
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-soltas-line p-8 text-center text-sm text-soltas-muted">
          No projects match the selected filters.
        </div>
      ) : null}

      <ProjectsPagination page={page} pageCount={pageCount} searchParams={searchParams} basePath="/projects" />
    </section>
  );
}
