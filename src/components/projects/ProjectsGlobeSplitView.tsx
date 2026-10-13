"use client";

import { useMemo } from "react";

import GlobeSplitView from "@/components/find/GlobeSplitView";
import type { MapClusterLayer } from "@/components/Map";
import ProjectsFilters from "@/components/projects/ProjectsFilters";
import { categoryMarkerColor, MARKER_COLORS } from "@/lib/markerColors";
import type { ProjectFilterOptions, ProjectMarker } from "@/lib/projects/findProjectsQuery";

type Props = {
  options: ProjectFilterOptions;
  markers: ProjectMarker[];
  totalCount: number;
  focusSlug: string | null;
  /** Query string for /api/iati/points (the page's filters), or null when IATI activities are hidden. */
  iatiQuery: string | null;
  iatiCount: number;
  /** Explains why IATI activities are hidden, if they are. */
  iatiNote?: string | null;
  /** False when only IATI activities are shown (source = IATI). */
  showCommunity?: boolean;
};

export default function ProjectsGlobeSplitView({
  options,
  markers,
  totalCount,
  focusSlug,
  iatiQuery,
  iatiCount,
  iatiNote = null,
  showCommunity = true,
}: Props) {
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

  const clusters = useMemo<MapClusterLayer | null>(
    () =>
      iatiQuery === null
        ? null
        : {
            url: `/api/iati/points${iatiQuery ? `?${iatiQuery}` : ""}`,
            color: MARKER_COLORS.iati,
            badge: "Published to IATI",
            ctaLabel: "View activity",
            detailsUrl: (id) => `/api/iati/activity?id=${encodeURIComponent(id)}`,
          },
    [iatiQuery],
  );

  const parts: string[] = [];
  if (showCommunity) {
    parts.push(`${markers.length.toLocaleString()} community projects on the globe`);
    parts.push(`${totalCount.toLocaleString()} match your filters`);
  }
  if (clusters) parts.push(`${iatiCount.toLocaleString()} ${iatiCount === 1 ? "activity" : "activities"} published to IATI`);
  const summary = [parts.join(" · "), iatiNote].filter(Boolean).join(". ");

  const legend = clusters ? (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full bg-white/95 px-3 py-1.5 text-xs text-soltas-text shadow-sm ring-1 ring-black/5">
      {showCommunity ? (
        <span className="inline-flex items-center gap-1.5">
          <Dot color={MARKER_COLORS.humanitarian} />
          <Dot color={MARKER_COLORS.environmental} />
          Community projects
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1.5">
        <Dot color={MARKER_COLORS.iati} />
        IATI
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Dot color={MARKER_COLORS.iati} hollow />
        Country only
      </span>
    </div>
  ) : null;

  return (
    <GlobeSplitView
      storageKey="find:projects:split"
      filters={<ProjectsFilters options={options} showSorting={false} />}
      markers={mapMarkers}
      clusters={clusters}
      legend={legend}
      summary={summary}
      focusSlug={focusSlug}
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
