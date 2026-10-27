import Link from "next/link";

import OrganisationsPagination from "@/components/organisations/OrganisationsPagination";
import { PAGE_SIZE, type OrganisationListRow } from "@/lib/organisations/findOrganisationsQuery";
import { plural } from "@/lib/plural";

const formatLocation = (organisation: OrganisationListRow) => {
  if (organisation.based_in_region && organisation.based_in_country) {
    return `${organisation.based_in_region}, ${organisation.based_in_country}`;
  }
  return organisation.based_in_region ?? organisation.based_in_country ?? "—";
};

const formatNumber = (value: number | null) => {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
};

const formatFunding = (value: number | null) => {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatAge = (value: number | null) => {
  if (typeof value !== "number") return "—";
  return `${value} yrs`;
};

type Props = {
  rows: OrganisationListRow[];
  count: number;
  page: number;
  pageCount: number;
  searchParams: Record<string, string | string[] | undefined>;
};

/** Find Organisations results: a table with pagination (table view, and under the filters in the globe view). */
export default function OrganisationsTableView({ rows, count, page, pageCount, searchParams: params }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-soltas-muted">
          Showing {rows.length} of {plural(count, "organisation")} · {PAGE_SIZE} per page
        </p>
        <OrganisationsPagination page={page} pageCount={pageCount} searchParams={params} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-soltas-line bg-white">
        <table className="min-w-[900px] divide-y divide-soltas-line text-sm">
          <thead className="bg-soltas-off-white text-left text-xs font-medium text-soltas-muted">
            <tr>
              <th className="px-4 py-3">Organisation</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Projects carried out</th>
              <th className="px-4 py-3">Ongoing projects</th>
              <th className="px-4 py-3">Followers</th>
              <th className="px-4 py-3">Funding needed</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-soltas-line">
            {rows.map((organisation) => (
              <tr key={organisation.id} className="align-top">
                <td className="px-4 py-4">
                  <Link
                    className="font-semibold text-soltas-ocean hover:text-soltas-abyssal transition-colors"
                    href={`/organisations/${organisation.id}`}
                  >
                    {organisation.name ?? "Untitled organisation"}
                  </Link>
                  <p className="mt-1 text-xs text-soltas-muted">{organisation.description ?? "No description yet."}</p>
                </td>

                <td className="px-4 py-4 text-soltas-muted">{formatLocation(organisation)}</td>
                <td className="px-4 py-4 text-soltas-muted">{formatNumber(organisation.projects_total_count)}</td>
                <td className="px-4 py-4 text-soltas-muted">{formatNumber(organisation.projects_ongoing_count)}</td>
                <td className="px-4 py-4 text-soltas-muted">{formatNumber(organisation.followers_count)}</td>
                <td className="px-4 py-4 text-soltas-muted">{formatFunding(organisation.funding_needed)}</td>
                <td className="px-4 py-4 text-soltas-muted">{formatAge(organisation.age_years)}</td>

                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/organisations/${organisation.id}`}
                    className="inline-flex items-center justify-center rounded-2xl bg-soltas-ocean px-3 py-2 text-xs font-semibold text-white hover:bg-soltas-abyssal"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-soltas-line p-8 text-center text-sm text-soltas-muted">
          No organisations match the selected filters.
        </div>
      ) : null}

      <OrganisationsPagination page={page} pageCount={pageCount} searchParams={params} />
    </section>
  );
}
