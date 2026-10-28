/**
 * The two goal frameworks projects are tagged with: the 17 UN Sustainable Development Goals (stored as
 * goal numbers in projects.sdgs, "1".."17") and the IFRC Strategy 2030 Global Challenges (stored as
 * codes in projects.ifrc_global_challenges). Both arrays are kept in step with the join tables by a
 * database trigger (migration 20260324120018), so filters and pages read the arrays.
 */

export type Sdg = { number: number; title: string; /** official UN goal colour, for the numbered tile */ color: string };

export const SDGS: readonly Sdg[] = [
  { number: 1, title: "No Poverty", color: "#E5243B" },
  { number: 2, title: "Zero Hunger", color: "#DDA63A" },
  { number: 3, title: "Good Health and Well-being", color: "#4C9F38" },
  { number: 4, title: "Quality Education", color: "#C5192D" },
  { number: 5, title: "Gender Equality", color: "#FF3A21" },
  { number: 6, title: "Clean Water and Sanitation", color: "#26BDE2" },
  { number: 7, title: "Affordable and Clean Energy", color: "#FCC30B" },
  { number: 8, title: "Decent Work and Economic Growth", color: "#A21942" },
  { number: 9, title: "Industry, Innovation and Infrastructure", color: "#FD6925" },
  { number: 10, title: "Reduced Inequalities", color: "#DD1367" },
  { number: 11, title: "Sustainable Cities and Communities", color: "#FD9D24" },
  { number: 12, title: "Responsible Consumption and Production", color: "#BF8B2E" },
  { number: 13, title: "Climate Action", color: "#3F7E44" },
  { number: 14, title: "Life Below Water", color: "#0A97D9" },
  { number: 15, title: "Life on Land", color: "#56C02B" },
  { number: 16, title: "Peace, Justice and Strong Institutions", color: "#00689D" },
  { number: 17, title: "Partnerships for the Goals", color: "#19486A" },
];

export const sdgByNumber = (value: string | number): Sdg | undefined => SDGS.find((s) => s.number === Number(value));

/** Goal numbers from a projects.sdgs array, valid and in order, without duplicates. */
export function sdgsFrom(values: readonly string[] | null | undefined): Sdg[] {
  const numbers = new Set((values ?? []).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 17));
  return SDGS.filter((s) => numbers.has(s.number));
}

export const SDG_OPTIONS = SDGS.map((s) => ({ value: String(s.number), label: `${s.number}. ${s.title}` }));

/** IFRC Strategy 2030 Global Challenges; codes match public.ifrc_challenges.code. */
export const IFRC_CHALLENGES: readonly { code: string; title: string }[] = [
  { code: "climate_environmental_crisis", title: "Climate and environmental crises" },
  { code: "evolving_crises_disasters", title: "Evolving crises and disasters" },
  { code: "growing_gaps_health_wellbeing", title: "Growing gaps in health and well-being" },
  { code: "migration_identity", title: "Migration and identity" },
  { code: "values_power_inclusion", title: "Values, power and inclusion" },
];

export const ifrcTitle = (code: string) => IFRC_CHALLENGES.find((c) => c.code === code)?.title ?? null;

export const IFRC_OPTIONS = IFRC_CHALLENGES.map((c) => ({ value: c.code, label: c.title }));
