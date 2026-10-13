"use client";

import { useMemo } from "react";

import GlobeSplitView from "@/components/find/GlobeSplitView";
import WatchdogFilters from "@/components/watchdog/WatchdogFilters";
import type { WatchdogFilterOptions, WatchdogIssueMarker } from "@/lib/watchdog/findWatchdogIssuesQuery";


type Props = {
  markers: WatchdogIssueMarker[];
  totalCount: number;
  focusId: string | null;
  options: WatchdogFilterOptions;
};

const URGENCY_COLORS = [
  "#22c55e",
  "#84cc16",
  "#f59e0b",
  "#f97316",
  "#ef4444",
];

const resolveMarkerColor = (urgency: number | null) => {
  if (!urgency || urgency < 1) return URGENCY_COLORS[0];
  return URGENCY_COLORS[Math.min(Math.max(urgency, 1), 5) - 1];
};

const formatPlaceName = (marker: WatchdogIssueMarker) => {
  const parts = [marker.city, marker.region, marker.country].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
};

export default function WatchdogGlobeSplitView({ markers, totalCount, focusId, options }: Props) {
  const mapMarkers = useMemo(
    () =>
      markers.map((marker) => ({
        id: marker.id,
        slug: marker.id,
        lng: typeof marker.longitude === "number" ? marker.longitude : Number.NaN,
        lat: typeof marker.latitude === "number" ? marker.latitude : Number.NaN,
        title: marker.title ?? "Untitled issue",
        placeName: formatPlaceName(marker),
        description: marker.description,
        ctaHref: `/watchdog/${marker.id}`,
        markerColor: resolveMarkerColor(marker.urgency ?? null),
      })),
    [markers],
  );

  return (
    <GlobeSplitView
      storageKey="find:issues:split"
      filters={<WatchdogFilters options={options} basePath="/watchdog" showSorting={false} variant="inline" />}
      markers={mapMarkers}
      summary={`${markers.length} on the globe · ${totalCount} matching your filters`}
      focusSlug={focusId}
      ctaLabel="See issue"
    />
  );
}
