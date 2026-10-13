import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { countryName } from "@/lib/geo/countries";
import {
  ORGANISATION_TYPES,
  POLICY_MARKERS,
  policySignificanceLabel,
  sectorLabel,
} from "@/lib/iati/codelists";
import { decodeIdentifier, fetchIatiActivity, type IatiActivity } from "@/lib/iati/query";

export const revalidate = 3600;

type Params = { id: string };

/** IATI OrganisationRole, in plain words. */
const ROLE_LABELS: Record<string, string> = {
  "1": "Funded by",
  "4": "Implemented by",
  "2": "Accountable",
  "3": "Passes funds through",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  ongoing: "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled",
  paused: "Paused",
};

type Org = { role: string | null; ref: string | null; name: string | null; type: string | null };
type Location = { name: string | null; lat: number; lng: number };
type Marker = { code: string; significance: number | null };

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatMoney(amount: number | null, currency: string | null) {
  if (amount == null) return null;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency ?? "USD",
      maximumFractionDigits: 0,
      notation: amount >= 10_000_000 ? "compact" : "standard",
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency ?? ""}`.trim();
  }
}

async function load(params: Promise<Params>): Promise<IatiActivity | null> {
  const { id } = await params;
  return fetchIatiActivity(decodeIdentifier(id)).catch((error) => {
    console.error("IATI activity page failed", error);
    return null;
  });
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const activity = await load(params);
  return { title: activity ? `${activity.title} | Solarpunk Taskforce` : "Activity not found" };
}

export default async function IatiActivityPage({ params }: { params: Promise<Params> }) {
  const activity = await load(params);
  if (!activity) notFound();

  const countries = activity.countries.map(countryName);
  const orgs = asArray<Org>(activity.participating_orgs);
  const locations = asArray<Location>(activity.locations).filter((loc) => loc.name);
  const markers = asArray<Marker>(activity.policy_markers)
    .map((marker) => ({ ...marker, label: POLICY_MARKERS[marker.code], focus: policySignificanceLabel(marker.significance) }))
    .filter((marker) => marker.label && marker.focus);
  const links = asArray<{ url: string }>(activity.links);
  const start = formatDate(activity.start_date);
  const end = formatDate(activity.end_date);
  const budget = formatMoney(activity.budget_total, activity.currency);
  const updated = formatDate(activity.last_updated_at);
  const orgsByRole = ["1", "4", "2", "3"]
    .map((role) => ({ role, label: ROLE_LABELS[role], names: orgs.filter((o) => o.role === role && o.name) }))
    .filter((group) => group.names.length);
  const dPortal = `https://d-portal.org/ctrack.html#view=act&aid=${encodeURIComponent(activity.iati_identifier)}`;
  const mapHref = `/projects?source=iati${activity.countries[0] ? `&country=${encodeURIComponent(countries[0])}` : ""}`;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Published to IATI</Badge>
            {activity.humanitarian ? <Badge variant="ocean">Humanitarian</Badge> : null}
            <Badge variant="outline">{STATUS_LABELS[activity.lifecycle_status] ?? activity.lifecycle_status}</Badge>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-soltas-text sm:text-4xl">{activity.title}</h1>
          <p className="mt-2 text-[15px] text-soltas-muted">
            {activity.reporting_org_name ? <>by {activity.reporting_org_name}</> : null}
            {activity.reporting_org_name && countries.length ? <span aria-hidden="true"> · </span> : null}
            {countries.join(", ")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a href={dPortal} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "outline", size: "sm" })}>
            View source <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
          <Link href={mapHref} className={buttonClasses({ variant: "outline", size: "sm" })}>
            See on the map
          </Link>
        </div>
      </header>

      {start || end || budget ? (
        <section aria-label="Key facts" className="grid gap-3 sm:grid-cols-3">
          {start || end ? (
            <div className="card p-5">
              <p className="text-xs font-medium text-soltas-muted">Timeline</p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-soltas-text">
                {start ?? "—"} – {end ?? "ongoing"}
              </p>
            </div>
          ) : null}
          {budget ? (
            <div className="card p-5">
              <p className="text-xs font-medium text-soltas-muted">Budget</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-soltas-text">{budget}</p>
            </div>
          ) : null}
          {activity.reporting_org_type ? (
            <div className="card p-5">
              <p className="text-xs font-medium text-soltas-muted">Reported by</p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-soltas-text">
                {ORGANISATION_TYPES[activity.reporting_org_type] ?? "Organisation"}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {activity.description ? (
        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">About this activity</h2>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-soltas-text">{activity.description}</p>
        </section>
      ) : null}

      <section className="card p-6">
        <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Details</h2>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2">
          {activity.dac_sectors.length ? (
            <div>
              <dt className="text-xs font-medium text-soltas-muted">Sectors</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {activity.dac_sectors.slice(0, 12).map((code) => (
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
                {markers.map((marker) => (
                  <Badge key={marker.code} variant="outline">
                    {marker.label} · {marker.focus}
                  </Badge>
                ))}
              </dd>
            </div>
          ) : null}
          {activity.sdgs.length ? (
            <div>
              <dt className="text-xs font-medium text-soltas-muted">Sustainable Development Goals</dt>
              <dd className="mt-1.5 text-[15px] text-soltas-text">{activity.sdgs.map((goal) => `SDG ${goal}`).join(", ")}</dd>
            </div>
          ) : null}
          {locations.length ? (
            <div>
              <dt className="text-xs font-medium text-soltas-muted">Places</dt>
              <dd className="mt-1.5 text-[15px] text-soltas-text">
                {locations.slice(0, 10).map((loc) => loc.name).join(", ")}
                {locations.length > 10 ? ` and ${locations.length - 10} more` : null}
              </dd>
            </div>
          ) : null}
          {orgsByRole.map((group) => (
            <div key={group.role}>
              <dt className="text-xs font-medium text-soltas-muted">{group.label}</dt>
              <dd className="mt-1.5 text-[15px] text-soltas-text">
                {[...new Set(group.names.map((org) => org.name))].join(", ")}
              </dd>
            </div>
          ))}
        </dl>
        {links.length ? (
          <div className="mt-6">
            <p className="text-xs font-medium text-soltas-muted">Documents and links</p>
            <ul className="mt-1.5 space-y-1">
              {links.map((link) => (
                <li key={link.url} className="truncate">
                  <a href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="text-[15px] text-soltas-ocean hover:underline">
                    {link.url.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <p className="text-sm leading-6 text-soltas-muted">
        Published by {activity.reporting_org_name ?? "the reporting organisation"} to the{" "}
        <a href="https://iatistandard.org" target="_blank" rel="noopener noreferrer" className="text-soltas-ocean hover:underline">
          International Aid Transparency Initiative (IATI)
        </a>
        {updated ? `, last updated ${updated}` : ""}. IATI identifier: <span className="break-all">{activity.iati_identifier}</span>.
        Shown here as published; Solarpunk Taskforce doesn’t edit it.
      </p>
    </main>
  );
}
