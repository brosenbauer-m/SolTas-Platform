/**
 * Impact metrics (public.project_metrics): what a project counts, with a fixed unit list so figures add up
 * across projects on an organisation page. Outputs = what was delivered; outcomes = what changed.
 */

export const METRIC_UNITS = [
  { value: "people", label: "People reached", short: "people" },
  { value: "households", label: "Households", short: "households" },
  { value: "children", label: "Children", short: "children" },
  { value: "women_and_girls", label: "Women and girls", short: "women and girls" },
  { value: "volunteers", label: "Volunteers", short: "volunteers" },
  { value: "jobs", label: "Jobs created", short: "jobs" },
  { value: "trees", label: "Trees planted", short: "trees" },
  { value: "hectares", label: "Hectares", short: "ha" },
  { value: "tonnes_co2e", label: "Tonnes CO₂e avoided", short: "t CO₂e" },
  { value: "litres_water_per_day", label: "Litres of water per day", short: "L/day" },
  { value: "kwh", label: "Kilowatt-hours", short: "kWh" },
  { value: "trainings", label: "Trainings held", short: "trainings" },
  { value: "facilities", label: "Facilities built or repaired", short: "facilities" },
  { value: "kits", label: "Kits distributed", short: "kits" },
  { value: "meals", label: "Meals", short: "meals" },
  { value: "other", label: "Other (use the label)", short: "" },
] as const;

export type MetricUnit = (typeof METRIC_UNITS)[number]["value"];
export type MetricKind = "output" | "outcome";

export type ProjectMetric = {
  id: string;
  project_id: string;
  label: string;
  unit: MetricUnit;
  kind: MetricKind;
  value: number;
  as_of: string;
  note: string | null;
};

export const unitLabel = (unit: string) => METRIC_UNITS.find((u) => u.value === unit)?.label ?? unit;
export const unitShort = (unit: string) => METRIC_UNITS.find((u) => u.value === unit)?.short ?? "";

export const formatMetricValue = (value: number) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: Number.isInteger(value) ? 0 : 1 }).format(value);

export const formatAsOf = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(date);
};
