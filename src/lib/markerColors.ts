/** Map marker colours (see docs/DESIGN.md). Always paired with a text label in popups/legends. */
export const MARKER_COLORS = {
  humanitarian: "#E07A3F",
  environmental: "#2F9E6B",
  default: "#2E6B8A",
  issue: "#D64545",
  /** All projects on the maps (community and imported): frosted-glass circles with an ocean core
   *  (src/components/map/projectLayer.ts). Dashed ring when only the country is known. */
  project: "#2E6B8A",
} as const;

export function categoryMarkerColor(category: string | null | undefined) {
  if (category === "humanitarian") return MARKER_COLORS.humanitarian;
  if (category === "environmental") return MARKER_COLORS.environmental;
  return MARKER_COLORS.default;
}
