"use client";

import { useMemo, type ReactNode } from "react";

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
  /** The matching results (table), shown under the filters */
  results?: ReactNode;
};

/** Find Projects: filters on the left, every matching project (community and imported) on the globe. */
export default function ProjectsGlobeSplitView({ options, totalCount, pointsQuery, results }: Props) {
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
    <div className="glass-card flex flex-wrap items-center gap-x-3 gap-y-1 !rounded-full px-3 py-1.5 text-xs text-soltas-text">
      <span className="inline-flex items-center gap-1.5">
        <Dot color={MARKER_COLORS.project} />
        Project
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="soltas-map-glass !h-5 !w-5 !text-[10px]">
          3
        </span>
        Projects at one place
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Dot color={MARKER_COLORS.project} hollow />
        Country only
      </span>
    </div>
  );

  return (
    <GlobeSplitView
      results={results}
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
      className={`soltas-map-glass soltas-map-glass--point !h-4 !w-4 ${hollow ? "soltas-map-glass--approx" : ""}`}
    >
      <span
        className="soltas-map-glass__core !h-2 !w-2 !border-[1.5px]"
        style={{ borderColor: color, background: hollow ? "transparent" : color }}
      />
    </span>
  );
}
