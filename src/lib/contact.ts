/** Public contact address of Solarpunk Taskforce (footer, legal pages, service requests). */
export const CONTACT_EMAIL = "contact@solarpunktaskforce.org";

export const SERVICE_KINDS = [
  { value: "intelligence", label: "Comparative intelligence (what others do, where the gaps are)" },
  { value: "storytelling", label: "Marketing and storytelling" },
  { value: "both", label: "Both" },
  { value: "unsure", label: "Not sure yet, let's talk" },
] as const;

export type ServiceKind = (typeof SERVICE_KINDS)[number]["value"];
