/** Map marker colours (see docs/DESIGN.md). Always paired with a text label in popups/legends. */
export const MARKER_COLORS = {
  humanitarian: "#E07A3F",
  environmental: "#2F9E6B",
  default: "#2E6B8A",
  issue: "#D64545",
  /** Activities imported from IATI (brand "abyssal"); hollow when the point is only the country centre. */
  iati: "#1A3F54",
} as const;

export function categoryMarkerColor(category: string | null | undefined) {
  if (category === "humanitarian") return MARKER_COLORS.humanitarian;
  if (category === "environmental") return MARKER_COLORS.environmental;
  return MARKER_COLORS.default;
}
