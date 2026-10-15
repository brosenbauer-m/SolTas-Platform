"use client";

import { useMemo } from "react";

import GlobeSplitView from "@/components/find/GlobeSplitView";
import type { MapProjectLayer } from "@/components/Map";
import ProjectsFilters from "@/components/projects/ProjectsFilters";
import { MARKER_COLORS } from "@/lib/markerColors";
import type { ProjectFilterOptions } from "@/lib/projects/findProjectsQuery";

type Props = {
  options: ProjectFilterOptions;
  /** Number of projects matching the filters */
  totalCount: number;
  /** Query string with the page's filters, for /api/projects/points */
  pointsQuery: string;
};

/** Find Projects: filters on the left, every matching project (community and imported) on the globe. */
export default function ProjectsGlobeSplitView({ options, totalCount, pointsQuery }: Props) {
  const projects = useMemo<MapProjectLayer>(
    () => ({
      url: `/api/projects/points${pointsQuery ? `?${pointsQuery}` : ""}`,
      color: MARKER_COLORS.project,
      ctaLabel: "Open project",
      summaryUrl: (id) => `/api/projects/summary?slug=${encodeURIComponent(id)}`,
    }),
    [pointsQuery],
  );

  const legend = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full bg-white/95 px-3 py-1.5 text-xs text-soltas-text shadow-sm ring-1 ring-black/5">
      <span className="inline-flex items-center gap-1.5">
        <Dot color={MARKER_COLORS.project} />
        Project
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Dot color={MARKER_COLORS.project} hollow />
        Country only
      </span>
    </div>
  );

  return (
    <GlobeSplitView
      storageKey="find:projects:split"
      filters={<ProjectsFilters options={options} showSorting={false} />}
      markers={[]}
      projects={projects}
      legend={legend}
      summary={`${totalCount.toLocaleString()} ${totalCount === 1 ? "project matches" : "projects match"} your filters`}
      focusSlug={null}
    />
  );
}

function Dot({ color, hollow = false }: { color: string; hollow?: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={hollow ? { border: `2px solid ${color}`, background: "#fff" } : { background: color }}
    />
  );
}
