import Link from "next/link";

import ProjectsPagination from "@/components/projects/ProjectsPagination";
import { Badge } from "@/components/ui/badge";
import { countryName } from "@/lib/geo/countries";
import { iatiActivityHref, type IatiListRow } from "@/lib/iati/query";

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  ongoing: "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled",
  paused: "Paused",
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
};

type Props = {
  rows: IatiListRow[];
  count: number;
  page: number;
  pageCount: number;
  searchParams: Record<string, string | string[] | undefined>;
};

/** Find Projects table for activities imported from IATI (source = IATI). */
export default function IatiTableView({ rows, count, page, pageCount, searchParams }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-soltas-muted">
          Showing {rows.length} of {count.toLocaleString()} activities published to IATI
        </p>
        <ProjectsPagination page={page} pageCount={pageCount} searchParams={searchParams} basePath="/projects" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-soltas-line bg-white">
        <table className="w-full min-w-[760px] divide-y divide-soltas-line text-sm">
          <thead className="bg-soltas-off-white text-left text-xs font-medium text-soltas-muted">
            <tr>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3">Reported by</th>
              <th className="px-4 py-3">Countries</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-soltas-line">
            {rows.map((row) => (
              <tr key={row.iati_identifier} className="align-top">
                <td className="max-w-[28rem] px-4 py-4">
                  <Link
                    href={iatiActivityHref(row.iati_identifier)}
                    className="font-semibold text-soltas-ocean transition-colors hover:text-soltas-abyssal"
                  >
                    {row.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      IATI
                    </Badge>
                    {row.humanitarian ? (
                      <Badge variant="outline" className="text-xs">
                        Humanitarian
                      </Badge>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-4 text-soltas-muted">{row.reporting_org_name ?? "—"}</td>
                <td className="px-4 py-4 text-soltas-muted">
                  {row.countries.length ? row.countries.slice(0, 3).map(countryName).join(", ") : "—"}
                  {row.countries.length > 3 ? ` +${row.countries.length - 3}` : null}
                </td>
                <td className="px-4 py-4 text-soltas-text">{STATUS_LABELS[row.lifecycle_status] ?? row.lifecycle_status}</td>
                <td className="px-4 py-4 text-soltas-muted">{formatDate(row.last_updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-soltas-line p-8 text-center text-sm text-soltas-muted">
          No IATI activities match the selected filters.
        </div>
      ) : null}

      <ProjectsPagination page={page} pageCount={pageCount} searchParams={searchParams} basePath="/projects" />
    </section>
  );
}
