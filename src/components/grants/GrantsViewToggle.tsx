"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { segmentClass, segmentedTrack } from "@/components/ui/segmented";

type GrantsViewToggleProps = {
  view: "globe" | "table";
};

export default function GrantsViewToggle({ view }: GrantsViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setView = useCallback(
    (nextView: "globe" | "table") => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", nextView);
      const query = params.toString();
      router.push(query ? `/funding?${query}` : "/funding");
    },
    [router, searchParams],
  );

  return (
    <div className={segmentedTrack} role="group" aria-label="View">
      <button type="button" aria-pressed={view === "globe"} className={segmentClass(view === "globe")} onClick={() => setView("globe")}>
        Globe
      </button>
      <button type="button" aria-pressed={view === "table"} className={segmentClass(view === "table")} onClick={() => setView("table")}>
        List
      </button>
    </div>
  );
}
