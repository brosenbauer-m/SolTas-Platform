"use client";

import type { ReactNode } from "react";

import GlobeSplitView from "@/components/find/GlobeSplitView";
import OrganisationsFilters from "@/components/organisations/OrganisationsFilters";
import type { OrganisationFilterOptions, OrganisationMarker } from "@/lib/organisations/findOrganisationsQuery";

type Props = {
  options: OrganisationFilterOptions;
  markers: OrganisationMarker[];
  totalCount: number;
  focusSlug: string | null;
  /** The matching results (table), shown under the filters */
  results?: ReactNode;
};

export default function OrganisationsGlobeSplitView({ options, markers, totalCount, focusSlug, results }: Props) {
  return (
    <GlobeSplitView
      results={results}
      storageKey="find:organisations:split"
      filters={<OrganisationsFilters options={options} />}
      markers={markers}
      summary={`${markers.length} on the globe · ${totalCount} matching your filters`}
      focusSlug={focusSlug}
    />
  );
}
