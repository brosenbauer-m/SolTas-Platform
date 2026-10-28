/** Who may apply for a grant (grants.applicant_types), a fixed list so it can be filtered. */
export const APPLICANT_TYPES = [
  { value: "ngo", label: "NGOs and non-profits" },
  { value: "grassroots_group", label: "Grassroots and community groups" },
  { value: "social_enterprise", label: "Social enterprises" },
  { value: "research_institution", label: "Research institutions and universities" },
  { value: "local_government", label: "Local governments" },
  { value: "individual", label: "Individuals" },
  { value: "company", label: "Companies" },
  { value: "other", label: "Other" },
] as const;

export type ApplicantType = (typeof APPLICANT_TYPES)[number]["value"];

export const APPLICANT_TYPE_OPTIONS = APPLICANT_TYPES.map((t) => ({ value: t.value, label: t.label }));

export const applicantTypeLabel = (value: string) => APPLICANT_TYPES.find((t) => t.value === value)?.label ?? value;

export const isApplicantType = (value: string): value is ApplicantType =>
  APPLICANT_TYPES.some((t) => t.value === value);
