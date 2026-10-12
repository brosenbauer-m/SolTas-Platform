import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import clsx from "clsx";

import { getServerSupabase } from "@/lib/supabaseServer";

type OrganisationStatus = "pending" | "verified" | "rejected";

type OrganisationRow = {
  id: string;
  name?: string | null;
  country_based?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  verification_status?: OrganisationStatus | string | null;
  verified_at?: string | null;
  verified_by?: string | null;
};

type ViewKey = OrganisationStatus | "all";

type SearchParams = Record<string, string | string[] | undefined>;

const VIEWS: { id: ViewKey; label: string; description: string; empty: string }[] = [
  {
    id: "pending",
    label: "Pending",
    description: "Organisations waiting for verification.",
    empty: "No pending organisations right now.",
  },
  {
    id: "verified",
    label: "Verified",
    description: "Organisations already approved for public discovery.",
    empty: "No verified organisations yet.",
  },
  {
    id: "rejected",
    label: "Rejected",
    description: "Organisations that were rejected during review.",
    empty: "No rejected organisations right now.",
  },
  {
    id: "all",
    label: "All",
    description: "All organisations across statuses.",
    empty: "No organisations found.",
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

async function verifyOrganisation(formData: FormData) {
  "use server";

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    throw new Error("Missing organisation id.");
  }

  const supabase = await getServerSupabase();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.id) {
    throw new Error("Unable to resolve user session.");
  }

  const { error } = await supabase
    .from("organisations")
    .update({
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      verified_by: userData.user.id,
    })
    .eq("id", id);

  if (error) throw error;

  // Verified organisations surface immediately in the signup dropdown via public.verified_organisations.
  revalidatePath("/admin/organisations");
}

async function rejectOrganisation(formData: FormData) {
  "use server";

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    throw new Error("Missing organisation id.");
  }

  const supabase = await getServerSupabase();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase
    .from("organisations")
    .update({
      verification_status: "rejected",
      verified_at: null,
      verified_by: null,
    })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/organisations");
}

export default async function AdminOrganisationsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const supabase = await getServerSupabase();
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentViewParam = Array.isArray(resolvedSearchParams?.status)
    ? resolvedSearchParams?.status[0]
    : resolvedSearchParams?.status;

  const currentView: ViewKey =
    currentViewParam === "verified" ||
    currentViewParam === "rejected" ||
    currentViewParam === "all"
      ? currentViewParam
      : "pending";

  let query = supabase
    .from("organisations")
    .select(
      "id,name,country_based,created_at,created_by,verification_status,verified_at,verified_by",
    )
    .order("created_at", { ascending: false });

  if (currentView !== "all") {
    query = query.eq("verification_status", currentView);
  }

  const { data, error } = await query;
  if (error) throw error;

  const organisations = (data ?? []) as OrganisationRow[];

  const currentViewConfig = VIEWS.find(view => view.id === currentView) ?? VIEWS[0];

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Organisation Verification</h1>
          <p className="text-sm text-soltas-muted">{currentViewConfig.description}</p>
        </div>
        <Link
          href="/admin/organisations/submissions"
          className="rounded bg-soltas-ocean px-4 py-2 text-sm font-medium text-white transition hover:bg-soltas-ocean/90"
        >
          View Submissions
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map(view => (
          <Link
            key={view.id}
            href={{
              pathname: "/admin/organisations",
              query: view.id === "pending" ? {} : { status: view.id },
            }}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              currentView === view.id
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-soltas-line text-soltas-muted hover:border-soltas-line hover:text-soltas-text",
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
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Country based</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Created by</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {organisations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-soltas-muted">
                  {currentViewConfig.empty}
                </td>
              </tr>
            ) : (
              organisations.map(org => {
                const status = (org.verification_status ?? "pending") as OrganisationStatus;
                const isPending = status === "pending";
                const statusLabel =
                  status === "verified" ? "Verified" : status === "rejected" ? "Rejected" : "Pending";
                const badgeClass = clsx(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                  status === "verified"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : status === "rejected"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-amber-200 bg-amber-50 text-amber-700",
                );

                return (
                  <tr key={org.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-soltas-text">{org.name ?? "—"}</div>
                      <div className="text-xs text-soltas-muted">{org.id}</div>
                    </td>
                    <td className="px-4 py-3">{org.country_based ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(org.created_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{org.created_by ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={badgeClass}>
                        {status === "verified" && <span aria-hidden>✓</span>}
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isPending ? (
                        <div className="flex flex-wrap gap-2">
                          <form action={verifyOrganisation}>
                            <input type="hidden" name="id" value={org.id} />
                            <button className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700">
                              Verify
                            </button>
                          </form>
                          <form action={rejectOrganisation}>
                            <input type="hidden" name="id" value={org.id} />
                            <button className="rounded border border-rose-500 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50">
                              Reject
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className="text-xs text-soltas-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
