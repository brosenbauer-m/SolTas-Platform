"use client";

import { useMemo } from "react";

import GlobeSplitView from "@/components/find/GlobeSplitView";
import GrantsFilters from "@/components/grants/GrantsFilters";
import type { GrantFilterOptions, GrantMarker } from "@/lib/grants/findGrantsQuery";
import { MARKER_COLORS } from "@/lib/markerColors";

type Props = {
  options: GrantFilterOptions;
  markers: GrantMarker[];
  totalCount: number;
  focusSlug: string | null;
};

const resolveMarkerColor = (projectType: string | null) => {
  if (projectType === "humanitarian") return MARKER_COLORS.humanitarian;
  if (projectType === "environmental") return MARKER_COLORS.environmental;
  return MARKER_COLORS.default;
};

export default function GrantsGlobeSplitView({ options, markers, totalCount, focusSlug }: Props) {
  const mapMarkers = useMemo(
    () =>
      markers.map((marker) => ({
        id: marker.id,
        slug: marker.slug ?? marker.id,
        lng: typeof marker.longitude === "number" ? marker.longitude : Number.NaN,
        lat: typeof marker.latitude === "number" ? marker.latitude : Number.NaN,
        title: marker.title ?? "Untitled funding",
        placeName: marker.location_name,
        description: marker.summary,
        ctaHref: `/funding/${marker.slug ?? marker.id}`,
        markerColor: resolveMarkerColor(marker.project_type),
      })),
    [markers],
  );

  return (
    <GlobeSplitView
      storageKey="find:funding:split"
      filters={<GrantsFilters basePath="/funding" options={options} showSorting={false} variant="inline" />}
      markers={mapMarkers}
      summary={`${markers.length} on the globe · ${totalCount} matching your filters`}
      focusSlug={focusSlug}
      ctaLabel="See details"
    />
  );
}
