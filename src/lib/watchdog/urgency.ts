/** Watchdog urgency is stored as 1–5 (see watchdog_issues_urgency_check). */
export const URGENCY_LEVELS = [
  { value: 1, label: "Low" },
  { value: 2, label: "Guarded" },
  { value: 3, label: "Elevated" },
  { value: 4, label: "High" },
  { value: 5, label: "Critical" },
] as const;

export function urgencyLabel(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const clamped = Math.min(Math.max(Math.round(value), 1), 5);
  return URGENCY_LEVELS[clamped - 1].label;
}

/** Badge variant for an urgency level: green-ish for low, amber in the middle, rose for high. */
export function urgencyTone(value: number | null | undefined): "green" | "amber" | "rose" | "default" {
  if (value == null) return "default";
  if (value >= 4) return "rose";
  if (value === 3) return "amber";
  return "green";
}
