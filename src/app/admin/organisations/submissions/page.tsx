import Link from "next/link";
import { notFound } from "next/navigation";

import type { Database } from "@/lib/database.types";
import { fetchProfilesByIds, one, profileDisplayName } from "@/lib/profiles/byIds";
import { getServerSupabase } from "@/lib/supabaseServer";
import { cn } from "@/lib/utils";

type SubmissionRow = Database["public"]["Tables"]["organisation_verification_submissions"]["Row"];
type OrganisationRow = Database["public"]["Tables"]["organisations"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type SubmissionListItem = Pick<
  SubmissionRow,
  "id" | "organisation_id" | "submitted_by" | "status" | "created_at" | "reviewed_at" | "reviewed_by"
> & {
  organisation: Pick<OrganisationRow, "name"> | null;
  submitted_by_profile: Pick<ProfileRow, "full_name"> | null;
};

type RawSubmissionListItem = Omit<
  SubmissionListItem,
  "organisation" | "submitted_by_profile"
> & {
  organisation: Pick<OrganisationRow, "name"> | Pick<OrganisationRow, "name">[] | null;
};

type SubmissionStatus = "pending" | "approved" | "rejected";

type ViewKey = SubmissionStatus | "all";

const VIEWS: { id: ViewKey; label: string; description: string; empty: string }[] = [
  {
    id: "pending",
    label: "Pending",
    description: "Organisation verification submissions waiting for review.",
    empty: "No pending submissions right now.",
  },
  {
    id: "approved",
    label: "Approved",
    description: "Submissions that have been approved.",
    empty: "No approved submissions yet.",
  },
  {
    id: "rejected",
    label: "Rejected",
    description: "Submissions that were rejected during review.",
    empty: "No rejected submissions right now.",
  },
  {
    id: "all",
    label: "All",
    description: "All verification submissions across statuses.",
    empty: "No submissions found.",
  },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default async function AdminOrganisationSubmissionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const supabase = await getServerSupabase();
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentViewParam = resolvedSearchParams?.status;

  const currentView: ViewKey =
    currentViewParam === "approved" ||
    currentViewParam === "rejected" ||
    currentViewParam === "all"
      ? currentViewParam
      : "pending";

  let query = supabase
    .from("organisation_verification_submissions")
    .select(
      `id,organisation_id,submitted_by,status,created_at,reviewed_at,reviewed_by,
       organisation:organisations(name)
      `
    )
    .order("created_at", { ascending: false });

  if (currentView !== "all") {
    query = query.eq("status", currentView);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data as RawSubmissionListItem[] | null) ?? [];
  const profiles = await fetchProfilesByIds(supabase, rows.map(submission => submission.submitted_by));
  const submissions: SubmissionListItem[] = rows.map(submission => {
    const profile = submission.submitted_by ? profiles.get(submission.submitted_by) : undefined;
    return {
      ...submission,
      organisation: one(submission.organisation),
      submitted_by_profile: profile ? { full_name: profileDisplayName(profile) } : null,
    };
  });

  const currentViewConfig = VIEWS.find(view => view.id === currentView) ?? VIEWS[0];

  return (
    <main className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Organisation Verification Submissions</h1>
        <p className="text-sm text-soltas-muted">{currentViewConfig.description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map(view => (
          <Link
            key={view.id}
            href={{
              pathname: "/admin/organisations/submissions",
              query: view.id === "pending" ? {} : { status: view.id },
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              currentView === view.id
                ? "border-soltas-ocean bg-soltas-glacial/15 text-soltas-ocean"
                : "border-soltas-line text-soltas-muted hover:border-soltas-line hover:text-soltas-text"
            )}
          >
            {view.label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-soltas-off-white text-left text-xs font-medium text-soltas-muted">
            <tr>
              <th className="px-4 py-3">Organisation</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Submitted by</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reviewed</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-soltas-muted">
                  {currentViewConfig.empty}
                </td>
              </tr>
            ) : (
              submissions.map(submission => {
                const status = (submission.status ?? "pending") as SubmissionStatus;
                const statusLabel =
                  status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending";
                const badgeClass = cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                  status === "approved"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : status === "rejected"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                );

                return (
                  <tr key={submission.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-soltas-text">
                        {submission.organisation?.name ?? "—"}
                      </div>
                      <div className="text-xs text-soltas-muted">{submission.organisation_id}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(submission.created_at)}</td>
                    <td className="px-4 py-3">
                      {submission.submitted_by_profile?.full_name ?? submission.submitted_by}
                    </td>
                    <td className="px-4 py-3">
                      <span className={badgeClass}>
                        {status === "approved" && <span aria-hidden>✓</span>}
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(submission.reviewed_at)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/organisations/submissions/${submission.id}`}
                        className="text-xs font-medium text-soltas-ocean hover:underline"
                      >
                        View details
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div>
        <Link
          href="/admin/organisations"
          className="text-sm font-medium text-soltas-ocean hover:underline"
        >
          ← Back to organisations
        </Link>
      </div>
    </main>
  );
}
