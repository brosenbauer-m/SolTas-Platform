"use client";

import { useMemo } from "react";

import GlobeSplitView from "@/components/find/GlobeSplitView";
import ProjectsFilters from "@/components/projects/ProjectsFilters";
import { categoryMarkerColor } from "@/lib/markerColors";
import type { ProjectFilterOptions, ProjectMarker } from "@/lib/projects/findProjectsQuery";

type Props = {
  options: ProjectFilterOptions;
  markers: ProjectMarker[];
  totalCount: number;
  focusSlug: string | null;
};

export default function ProjectsGlobeSplitView({ options, markers, totalCount, focusSlug }: Props) {
  const mapMarkers = useMemo(
    () =>
      markers.map((marker) => ({
        id: marker.id,
        slug: marker.slug ?? marker.id,
        lng: typeof marker.lng === "number" ? marker.lng : Number.NaN,
        lat: typeof marker.lat === "number" ? marker.lat : Number.NaN,
        title: marker.name ?? "Untitled project",
        placeName: marker.place_name,
        description: marker.description,
        ctaHref: `/projects/${marker.slug ?? marker.id}`,
        markerColor: categoryMarkerColor(marker.category),
      })),
    [markers],
  );

  return (
    <GlobeSplitView
      storageKey="find:projects:split"
      filters={<ProjectsFilters options={options} showSorting={false} />}
      markers={mapMarkers}
      summary={`${markers.length} on the globe · ${totalCount} matching your filters`}
      focusSlug={focusSlug}
    />
  );
}
