import Link from "next/link";

import clsx from "clsx";

import { getServerSupabase } from "@/lib/supabaseServer";

const VIEWS = [
  { id: "pending", label: "Pending", description: "Issues awaiting review." },
  { id: "approved", label: "Approved", description: "Approved issues are public." },
  { id: "rejected", label: "Rejected", description: "Rejected issues remain private." },
] as const;

type IssueStatus = (typeof VIEWS)[number]["id"];

type IssueRow = {
  id: string;
  title: string | null;
  description: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  sdgs: number[] | null;
  global_challenges: string[] | null;
  affected_demographics: string[] | null;
  affected_groups_text: string | null;
  urgency: number | null;
  date_observed: string | null;
  evidence_links: string[] | null;
  desired_outcome: string | null;
  contact_allowed: boolean | null;
  reporter_anonymous: boolean | null;
  status: IssueStatus | string | null;
  created_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

const formatDate = (value: string | null | undefined) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const formatLocation = (issue: IssueRow) => {
  const parts = [issue.city, issue.region, issue.country].filter(Boolean);
  if (parts.length) return parts.join(", ");
  if (issue.latitude != null && issue.longitude != null) return `${issue.latitude}, ${issue.longitude}`;
  return "";
};

const formatUrgency = (value: number | null | undefined) => {
  if (!value) return "";
  if (value <= 1) return "Low";
  if (value === 2) return "Guarded";
  if (value === 3) return "Elevated";
  if (value === 4) return "High";
  return "Critical";
};

export default async function IssueRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await getServerSupabase();
  const resolvedSearchParams = await searchParams;

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Not found</h1>
      </main>
    );
  }

  const currentViewParam = Array.isArray(resolvedSearchParams?.view)
    ? resolvedSearchParams?.view[0]
    : resolvedSearchParams?.view;

  const currentView: IssueStatus =
    currentViewParam === "approved" || currentViewParam === "rejected" ? currentViewParam : "pending";

  const messageParam = Array.isArray(resolvedSearchParams?.message)
    ? resolvedSearchParams?.message[0]
    : resolvedSearchParams?.message;

  const errorParam = Array.isArray(resolvedSearchParams?.error)
    ? resolvedSearchParams?.error[0]
    : resolvedSearchParams?.error;

  const { data: issues, error } = await supabase
    .from("watchdog_issues")
    .select(
      "id,title,description,country,region,city,latitude,longitude,sdgs,global_challenges,affected_demographics,affected_groups_text,urgency,date_observed,evidence_links,desired_outcome,contact_allowed,reporter_anonymous,status,created_at,approved_at,approved_by,rejected_at,rejected_by,rejection_reason",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  const grouped: Record<IssueStatus, IssueRow[]> = {
    pending: [],
    approved: [],
    rejected: [],
  };

  for (const raw of (issues ?? []) as unknown as IssueRow[]) {
    const status = (raw.status as IssueStatus | null) ?? "pending";
    if (status in grouped) grouped[status as IssueStatus].push(raw);
    else grouped.pending.push(raw);
  }

  const rows = grouped[currentView] ?? [];

  const baseColumnCount = 5;
  const columnCount =
    currentView === "pending" ? baseColumnCount + 1 : currentView === "approved" ? baseColumnCount + 2 : baseColumnCount + 3;

  return (
    <main className="p-6">
      <h1 className="mb-2 text-2xl font-semibold">Issue Registrations</h1>
      <p className="mb-4 text-sm text-soltas-muted">Review Watchdog issue submissions and approve them for the public map.</p>

      {(messageParam || errorParam) && (
        <div
          className={clsx(
            "mb-4 rounded-lg border px-4 py-3 text-sm",
            errorParam
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-soltas-glacial/30 bg-soltas-glacial/15 text-soltas-ocean",
          )}
        >
          {errorParam ? errorParam : messageParam}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {VIEWS.map(view => (
          <Link
            key={view.id}
            href={{ pathname: "/admin/issue-registrations", query: { view: view.id } }}
            className={clsx(
              "rounded-full border px-4 py-1 text-sm transition",
              currentView === view.id
                ? "border-blue-600 bg-blue-600 text-white shadow"
                : "border-soltas-line bg-white text-soltas-muted hover:border-blue-400 hover:text-blue-600",
            )}
            title={view.description}
          >
            {view.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-soltas-off-white text-left">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">Urgency</th>
              <th className="px-4 py-2">Submitted</th>
              <th className="px-4 py-2">Review</th>

              {currentView === "approved" && (
                <>
                  <th className="px-4 py-2">Approved On</th>
                  <th className="px-4 py-2">Approved By</th>
                </>
              )}

              {currentView === "rejected" && (
                <>
                  <th className="px-4 py-2">Rejected On</th>
                  <th className="px-4 py-2">Rejected By</th>
                  <th className="px-4 py-2">Reason</th>
                </>
              )}

              {currentView === "pending" && <th className="px-4 py-2">Actions</th>}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-soltas-muted" colSpan={columnCount}>
                  No {currentView} issues found.
                </td>
              </tr>
            ) : (
              rows.map(issue => (
                <tr key={issue.id} className="border-t align-top">
                  <td className="px-4 py-3 font-medium text-soltas-text">{issue.title ?? ""}</td>
                  <td className="px-4 py-3">{formatLocation(issue)}</td>
                  <td className="px-4 py-3">
                    {issue.urgency ? `${issue.urgency} · ${formatUrgency(issue.urgency)}` : ""}
                  </td>
                  <td className="px-4 py-3">{formatDate(issue.created_at)}</td>
                  <td className="px-4 py-3">
                    <details className="rounded-lg border border-soltas-line bg-white p-3">
                      <summary className="cursor-pointer text-sm font-medium text-soltas-text">View details</summary>
                      <div className="mt-3 space-y-2 text-xs text-soltas-muted">
                        <p className="text-sm text-soltas-text">{issue.description ?? ""}</p>
                        <div>
                          <span className="font-semibold text-soltas-text">SDGs:</span> {issue.sdgs?.join(", ") || "—"}
                        </div>
                        <div>
                          <span className="font-semibold text-soltas-text">IFRC challenges:</span> {issue.global_challenges?.join(", ") || "—"}
                        </div>
                        <div>
                          <span className="font-semibold text-soltas-text">Affected demographics:</span> {issue.affected_demographics?.join(", ") || "—"}
                        </div>
                        {issue.affected_groups_text ? (
                          <div>
                            <span className="font-semibold text-soltas-text">Affected groups (free text):</span> {issue.affected_groups_text}
                          </div>
                        ) : null}
                        <div>
                          <span className="font-semibold text-soltas-text">Date observed:</span> {issue.date_observed ?? "—"}
                        </div>
                        {issue.evidence_links?.length ? (
                          <div>
                            <span className="font-semibold text-soltas-text">Evidence links:</span>
                            <ul className="mt-1 list-disc pl-4">
                              {issue.evidence_links.map(link => (
                                <li key={link}>
                                  <a className="text-soltas-ocean underline" href={link} target="_blank" rel="noreferrer">
                                    {link}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {issue.desired_outcome ? (
                          <div>
                            <span className="font-semibold text-soltas-text">Desired outcome:</span> {issue.desired_outcome}
                          </div>
                        ) : null}
                        <div>
                          <span className="font-semibold text-soltas-text">Contact allowed:</span> {issue.contact_allowed ? "Yes" : "No"}
                        </div>
                        <div>
                          <span className="font-semibold text-soltas-text">Reporter anonymous:</span> {issue.reporter_anonymous ? "Yes" : "No"}
                        </div>
                      </div>
                    </details>
                  </td>

                  {currentView === "approved" && (
                    <>
                      <td className="px-4 py-3">{formatDate(issue.approved_at)}</td>
                      <td className="px-4 py-3">{issue.approved_by ?? ""}</td>
                    </>
                  )}

                  {currentView === "rejected" && (
                    <>
                      <td className="px-4 py-3">{formatDate(issue.rejected_at)}</td>
                      <td className="px-4 py-3">{issue.rejected_by ?? ""}</td>
                      <td className="px-4 py-3">{issue.rejection_reason ?? ""}</td>
                    </>
                  )}

                  {currentView === "pending" && (
                    <td className="px-4 py-3">
                      <form
                        action={`/api/admin/watchdog-issues/${issue.id}/approve`}
                        method="post"
                        className="inline"
                      >
                        <button className="rounded border border-soltas-ocean px-3 py-1 text-soltas-ocean transition hover:bg-soltas-glacial/15">
                          Approve
                        </button>
                      </form>

                      <form
                        action={`/api/admin/watchdog-issues/${issue.id}/reject`}
                        method="post"
                        className="ml-3 inline"
                      >
                        <input
                          name="reason"
                          placeholder="Reason"
                          className="mr-2 rounded border px-2 py-1"
                          aria-label="Rejection reason"
                        />
                        <button className="rounded border border-red-500 px-3 py-1 text-red-600 transition hover:bg-red-50">
                          Reject
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-soltas-muted">
        Approved issues are public on the Watchdog Community map and table. Rejected issues remain private.
      </p>
    </main>
  );
}
