import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { countryName } from "@/lib/geo/countries";
import { ORGANISATION_TYPES, POLICY_MARKERS, policySignificanceLabel, sectorLabel } from "@/lib/iati/codelists";

/** projects.source_data for imported projects (written by scripts/iati/sync.ts). */
export type ImportedSourceData = {
  reporting_org?: { ref?: string | null; name?: string | null; type?: string | null } | null;
  participating_orgs?: { role: string | null; ref: string | null; name: string | null; type: string | null }[];
  countries?: string[];
  locations?: { name: string | null; lat: number; lng: number }[];
  dac_sectors?: string[];
  policy_markers?: { code: string; significance: number | null }[];
  budget_total?: number | null;
  links?: { url: string }[];
};

/** IATI OrganisationRole, in plain words. */
const ROLE_LABELS: Record<string, string> = {
  "1": "Funded by",
  "4": "Implemented by",
  "2": "Accountable",
  "3": "Passes funds through",
};

export function readSourceData(value: unknown): ImportedSourceData {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as ImportedSourceData) : {};
}

export function publisherName(data: ImportedSourceData) {
  return data.reporting_org?.name ?? null;
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

/** "Published details" card for projects imported from IATI, with attribution and a link to the source. */
export default function ImportedProjectDetails({
  data,
  iatiIdentifier,
  updatedAt,
}: {
  data: ImportedSourceData;
  iatiIdentifier: string;
  updatedAt: string | null;
}) {
  const orgs = data.participating_orgs ?? [];
  const groups = ["1", "4", "2", "3"]
    .map((role) => ({
      role,
      label: ROLE_LABELS[role],
      names: [...new Set(orgs.filter((o) => o.role === role && o.name).map((o) => o.name as string))],
    }))
    .filter((group) => group.names.length);
  const markers = (data.policy_markers ?? [])
    .map((m) => ({ ...m, label: POLICY_MARKERS[m.code], focus: policySignificanceLabel(m.significance) }))
    .filter((m) => m.label && m.focus);
  const places = (data.locations ?? []).map((l) => l.name).filter(Boolean) as string[];
  const countries = (data.countries ?? []).map(countryName);
  const publisher = publisherName(data);
  const publisherType = data.reporting_org?.type ? ORGANISATION_TYPES[data.reporting_org.type] : null;
  const updated = formatDate(updatedAt);
  const source = `https://d-portal.org/ctrack.html#view=act&aid=${encodeURIComponent(iatiIdentifier)}`;

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Published details</h2>
        <a href={source} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "outline", size: "sm" })}>
          View source <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>

      <dl className="mt-4 grid gap-5 sm:grid-cols-2">
        {publisher ? (
          <div>
            <dt className="text-xs font-medium text-soltas-muted">Published by</dt>
            <dd className="mt-1.5 text-[15px] text-soltas-text">
              {publisher}
              {publisherType ? <span className="text-soltas-muted"> · {publisherType}</span> : null}
            </dd>
          </div>
        ) : null}
        {countries.length ? (
          <div>
            <dt className="text-xs font-medium text-soltas-muted">Countries</dt>
            <dd className="mt-1.5 text-[15px] text-soltas-text">{countries.join(", ")}</dd>
          </div>
        ) : null}
        {data.dac_sectors?.length ? (
          <div>
            <dt className="text-xs font-medium text-soltas-muted">Sectors</dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {data.dac_sectors.slice(0, 12).map((code) => (
                <Badge key={code} variant="outline">
                  {sectorLabel(code)}
                </Badge>
              ))}
            </dd>
          </div>
        ) : null}
        {markers.length ? (
          <div>
            <dt className="text-xs font-medium text-soltas-muted">Focus</dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {markers.map((m) => (
                <Badge key={m.code} variant="outline">
                  {m.label} · {m.focus}
                </Badge>
              ))}
            </dd>
          </div>
        ) : null}
        {places.length ? (
          <div>
            <dt className="text-xs font-medium text-soltas-muted">Places</dt>
            <dd className="mt-1.5 text-[15px] text-soltas-text">
              {places.slice(0, 10).join(", ")}
              {places.length > 10 ? ` and ${places.length - 10} more` : null}
            </dd>
          </div>
        ) : null}
        {groups.map((group) => (
          <div key={group.role}>
            <dt className="text-xs font-medium text-soltas-muted">{group.label}</dt>
            <dd className="mt-1.5 text-[15px] text-soltas-text">{group.names.join(", ")}</dd>
          </div>
        ))}
      </dl>

      {data.links?.length ? (
        <div className="mt-6">
          <p className="text-xs font-medium text-soltas-muted">Documents and links</p>
          <ul className="mt-1.5 space-y-1">
            {data.links.map((link) => (
              <li key={link.url} className="truncate">
                <a href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="text-[15px] text-soltas-ocean hover:underline">
                  {link.url.replace(/^https?:\/\//, "")}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-6 text-sm leading-6 text-soltas-muted">
        Published by {publisher ?? "the reporting organisation"} to the{" "}
        <a href="https://iatistandard.org" target="_blank" rel="noopener noreferrer" className="text-soltas-ocean hover:underline">
          International Aid Transparency Initiative (IATI)
        </a>
        {updated ? `, last updated ${updated}` : ""} and imported automatically. IATI identifier:{" "}
        <span className="break-all">{iatiIdentifier}</span>.
      </p>
    </section>
  );
}
