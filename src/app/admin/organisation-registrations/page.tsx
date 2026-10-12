import Link from "next/link";

import clsx from "clsx";

import { getServerSupabase } from "@/lib/supabaseServer";

const VIEWS = [
  { id: "pending", label: "Pending", description: "Organisations awaiting verification." },
  { id: "verified", label: "Verified", description: "Verified organisations are public." },
  { id: "rejected", label: "Rejected", description: "Rejected organisations remain private." },
] as const;

type OrganisationStatus = (typeof VIEWS)[number]["id"];

type OrganisationRow = {
  id: string;
  name: string | null;
  country_based: string | null;
  website: string | null;
  created_at: string | null;
  created_by: string | null;
  verification_status: OrganisationStatus | string | null;
  verified_at: string | null;
  verified_by: string | null;
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

export default async function OrganisationRegistrationsPage({
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

  const currentView: OrganisationStatus =
    currentViewParam === "verified" || currentViewParam === "rejected" ? currentViewParam : "pending";

  const messageParam = Array.isArray(resolvedSearchParams?.message)
    ? resolvedSearchParams?.message[0]
    : resolvedSearchParams?.message;

  const errorParam = Array.isArray(resolvedSearchParams?.error)
    ? resolvedSearchParams?.error[0]
    : resolvedSearchParams?.error;

  const { data: organisations, error } = await supabase
    .from("organisations")
    .select(
      "id,name,country_based,website,created_at,created_by,verification_status,verified_at,verified_by,rejected_at,rejected_by,rejection_reason",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  const grouped: Record<OrganisationStatus, OrganisationRow[]> = {
    pending: [],
    verified: [],
    rejected: [],
  };

  for (const raw of (organisations ?? []) as unknown as OrganisationRow[]) {
    const status = (raw.verification_status as OrganisationStatus | null) ?? "pending";
    if (status in grouped) grouped[status as OrganisationStatus].push(raw);
    else grouped.pending.push(raw);
  }

  const rows = grouped[currentView] ?? [];

  const baseColumnCount = 4;
  const columnCount =
    currentView === "pending" ? baseColumnCount + 1 : currentView === "verified" ? baseColumnCount + 2 : baseColumnCount + 3;

  return (
    <main className="p-6">
      <h1 className="mb-2 text-2xl font-semibold">Organisation Registrations</h1>
      <p className="mb-4 text-sm text-soltas-muted">Review organisation submissions and verify them for public listing.</p>

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
            href={{ pathname: "/admin/organisation-registrations", query: { view: view.id } }}
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
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Country</th>
              <th className="px-4 py-2">Website</th>
              <th className="px-4 py-2">Submitted</th>

              {currentView === "verified" && (
                <>
                  <th className="px-4 py-2">Verified On</th>
                  <th className="px-4 py-2">Verified By</th>
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
                  No {currentView} organisations found.
                </td>
              </tr>
            ) : (
              rows.map(org => (
                <tr key={org.id} className="border-t align-top">
                  <td className="px-4 py-3 font-medium text-soltas-text">{org.name ?? ""}</td>
                  <td className="px-4 py-3">{org.country_based ?? ""}</td>
                  <td className="px-4 py-3">
                    {org.website ? (
                      <a
                        href={org.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-soltas-ocean underline hover:text-soltas-ocean/80"
                      >
                        {org.website}
                      </a>
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="px-4 py-3">{formatDate(org.created_at)}</td>

                  {currentView === "verified" && (
                    <>
                      <td className="px-4 py-3">{formatDate(org.verified_at)}</td>
                      <td className="px-4 py-3">{org.verified_by ?? ""}</td>
                    </>
                  )}

                  {currentView === "rejected" && (
                    <>
                      <td className="px-4 py-3">{formatDate(org.rejected_at)}</td>
                      <td className="px-4 py-3">{org.rejected_by ?? ""}</td>
                      <td className="px-4 py-3">{org.rejection_reason ?? ""}</td>
                    </>
                  )}

                  {currentView === "pending" && (
                    <td className="px-4 py-3">
                      <form
                        action={`/api/admin/organisations/${org.id}/approve`}
                        method="post"
                        className="inline"
                      >
                        <button className="rounded border border-soltas-ocean px-3 py-1 text-soltas-ocean transition hover:bg-soltas-glacial/15">
                          Approve
                        </button>
                      </form>

                      <form
                        action={`/api/admin/organisations/${org.id}/reject`}
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
        Verified organisations are public in the organisation directory. Rejected organisations remain private.
      </p>
    </main>
  );
}
