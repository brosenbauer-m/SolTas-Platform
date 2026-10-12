import Link from "next/link";

import clsx from "clsx";

import { getServerSupabase } from "@/lib/supabaseServer";

const VIEWS = [
  { id: "pending", label: "Pending", description: "Grants awaiting review." },
  { id: "approved", label: "Approved", description: "Approved grants are public." },
  { id: "rejected", label: "Rejected", description: "Rejected grants remain private." },
] as const;

type GrantStatus = (typeof VIEWS)[number]["id"];

type GrantRow = {
  id: string;
  title: string | null;
  funder_name: string | null;
  funding_type: string | null;
  amount_min: number | null;
  amount_max: number | null;
  currency: string | null;
  deadline: string | null;
  location_name: string | null;
  moderation_status: GrantStatus | string | null;
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

const formatAmount = (min: number | null, max: number | null, currency: string | null) => {
  if (!min && !max) return "";
  const curr = currency ?? "USD";
  if (min && max) return `${curr} ${min.toLocaleString()} - ${max.toLocaleString()}`;
  if (min) return `${curr} ${min.toLocaleString()}+`;
  if (max) return `Up to ${curr} ${max.toLocaleString()}`;
  return "";
};

export default async function FundingRegistrationsPage({
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

  const currentView: GrantStatus =
    currentViewParam === "approved" || currentViewParam === "rejected" ? currentViewParam : "pending";

  const messageParam = Array.isArray(resolvedSearchParams?.message)
    ? resolvedSearchParams?.message[0]
    : resolvedSearchParams?.message;

  const errorParam = Array.isArray(resolvedSearchParams?.error)
    ? resolvedSearchParams?.error[0]
    : resolvedSearchParams?.error;

  const { data: grants, error } = await supabase
    .from("grants")
    .select(
      "id,title,funder_name,funding_type,amount_min,amount_max,currency,deadline,location_name,moderation_status,created_at,approved_at,approved_by,rejected_at,rejected_by,rejection_reason",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  const grouped: Record<GrantStatus, GrantRow[]> = {
    pending: [],
    approved: [],
    rejected: [],
  };

  for (const raw of (grants ?? []) as unknown as GrantRow[]) {
    const status = (raw.moderation_status as GrantStatus | null) ?? "pending";
    if (status in grouped) grouped[status as GrantStatus].push(raw);
    else grouped.pending.push(raw);
  }

  const rows = grouped[currentView] ?? [];

  const baseColumnCount = 5;
  const columnCount =
    currentView === "pending" ? baseColumnCount + 1 : currentView === "approved" ? baseColumnCount + 2 : baseColumnCount + 3;

  return (
    <main className="p-6">
      <h1 className="mb-2 text-2xl font-semibold">Funding Registrations</h1>
      <p className="mb-4 text-sm text-soltas-muted">Review grant submissions and approve them for public listing.</p>

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
            href={{ pathname: "/admin/funding-registrations", query: { view: view.id } }}
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
              <th className="px-4 py-2">Funder</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Deadline</th>
              <th className="px-4 py-2">Submitted</th>

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
                  No {currentView} grants found.
                </td>
              </tr>
            ) : (
              rows.map(grant => (
                <tr key={grant.id} className="border-t align-top">
                  <td className="px-4 py-3 font-medium text-soltas-text">{grant.title ?? ""}</td>
                  <td className="px-4 py-3">{grant.funder_name ?? ""}</td>
                  <td className="px-4 py-3">{formatAmount(grant.amount_min, grant.amount_max, grant.currency)}</td>
                  <td className="px-4 py-3">{grant.deadline ? formatDate(grant.deadline) : ""}</td>
                  <td className="px-4 py-3">{formatDate(grant.created_at)}</td>

                  {currentView === "approved" && (
                    <>
                      <td className="px-4 py-3">{formatDate(grant.approved_at)}</td>
                      <td className="px-4 py-3">{grant.approved_by ?? ""}</td>
                    </>
                  )}

                  {currentView === "rejected" && (
                    <>
                      <td className="px-4 py-3">{formatDate(grant.rejected_at)}</td>
                      <td className="px-4 py-3">{grant.rejected_by ?? ""}</td>
                      <td className="px-4 py-3">{grant.rejection_reason ?? ""}</td>
                    </>
                  )}

                  {currentView === "pending" && (
                    <td className="px-4 py-3">
                      <form
                        action={`/api/admin/grants/${grant.id}/approve`}
                        method="post"
                        className="inline"
                      >
                        <button className="rounded border border-soltas-ocean px-3 py-1 text-soltas-ocean transition hover:bg-soltas-glacial/15">
                          Approve
                        </button>
                      </form>

                      <form
                        action={`/api/admin/grants/${grant.id}/reject`}
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
        Approved grants are public on the funding opportunities page. Rejected grants remain private.
      </p>
    </main>
  );
}
