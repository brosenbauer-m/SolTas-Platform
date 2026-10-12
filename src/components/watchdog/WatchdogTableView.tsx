import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { WatchdogIssueListRow } from "@/lib/watchdog/findWatchdogIssuesQuery";
import WatchdogPagination from "@/components/watchdog/WatchdogPagination";

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
};

const formatLocation = (issue: WatchdogIssueListRow) => {
  const parts = [issue.city, issue.region, issue.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
};

const formatUrgency = (value: number | null) => {
  if (!value) return "—";
  if (value <= 1) return "Low";
  if (value === 2) return "Guarded";
  if (value === 3) return "Elevated";
  if (value === 4) return "High";
  return "Critical";
};

type WatchdogTableViewProps = {
  rows: WatchdogIssueListRow[];
  count: number;
  page: number;
  pageCount: number;
  searchParams: Record<string, string | string[] | undefined>;
};

export default function WatchdogTableView({
  rows,
  count,
  page,
  pageCount,
  searchParams,
}: WatchdogTableViewProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-soltas-muted">Showing {rows.length} of {count} approved issues</p>
        <WatchdogPagination page={page} pageCount={pageCount} searchParams={searchParams} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-soltas-line bg-white">
        <table className="min-w-[700px] divide-y divide-soltas-line text-sm">
          <thead className="bg-soltas-off-white text-left text-xs font-medium text-soltas-muted">
            <tr>
              <th className="px-4 py-3">Issue</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Observed</th>
              <th className="px-4 py-3">Urgency</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-soltas-line">
            {rows.map(issue => {
              const mapParams = new URLSearchParams();
              mapParams.set("view", "globe");
              mapParams.set("focus", issue.id);
              const mapHref = `/watchdog?${mapParams.toString()}`;

              const sdgTags = issue.sdgs ?? [];
              const challengeTags = issue.global_challenges ?? [];
              const demographicTags = issue.affected_demographics ?? [];

              return (
                <tr key={issue.id} className="align-top">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-soltas-text">{issue.title}</div>
                    <p className="mt-1 text-sm text-soltas-muted">
                      {issue.description.length > 160
                        ? `${issue.description.slice(0, 160).trimEnd()}…`
                        : issue.description}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-soltas-muted">{formatLocation(issue)}</td>
                  <td className="px-4 py-4 text-soltas-muted">{formatDate(issue.date_observed ?? issue.created_at)}</td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-soltas-text">{issue.urgency ?? "—"}</div>
                    <div className="text-xs text-soltas-muted">{formatUrgency(issue.urgency)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {sdgTags.slice(0, 3).map(tag => (
                        <Badge key={`sdg-${tag}`} variant="outline" className="text-xs">
                          SDG {tag}
                        </Badge>
                      ))}
                      {challengeTags.slice(0, 2).map(tag => (
                        <Badge key={`challenge-${tag}`} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {demographicTags.slice(0, 2).map(tag => (
                        <Badge key={`demo-${tag}`} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {sdgTags.length + challengeTags.length + demographicTags.length === 0 ? (
                        <span className="text-xs text-soltas-muted">No tags</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={mapHref}
                      className="inline-flex items-center justify-center rounded-2xl border border-soltas-line px-3 py-1 text-sm font-semibold text-soltas-text hover:bg-soltas-light"
                    >
                      See on map
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-soltas-line p-8 text-center text-sm text-soltas-muted">
          No approved watchdog issues match the selected filters.
        </div>
      ) : null}

      <WatchdogPagination page={page} pageCount={pageCount} searchParams={searchParams} />
    </section>
  );
}
