import { cn } from "@/lib/utils";

/** iOS-style segmented control: grey track, the selected segment is a white pill. */
export const segmentedTrack = "inline-flex items-center gap-1 rounded-full bg-soltas-light p-1 text-sm";

export function segmentClass(active: boolean) {
  return cn(
    "inline-flex h-8 items-center justify-center rounded-full px-4 text-sm font-medium transition-all duration-200",
    active ? "bg-white text-soltas-text shadow-sm" : "text-soltas-muted hover:text-soltas-text",
  );
}
