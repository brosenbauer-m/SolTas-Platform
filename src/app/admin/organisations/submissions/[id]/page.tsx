import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import type { Database } from "@/lib/database.types";
import { fetchProfilesByIds, one, profileDisplayName } from "@/lib/profiles/byIds";
import { getServerSupabase } from "@/lib/supabaseServer";
import { cn } from "@/lib/utils";

type SubmissionRow = Database["public"]["Tables"]["organisation_verification_submissions"]["Row"];
type OrganisationRow = Database["public"]["Tables"]["organisations"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type SubmissionDetail = SubmissionRow & {
  organisation: OrganisationRow | null;
  submitted_by_profile: Pick<ProfileRow, "full_name"> | null;
  reviewed_by_profile: Pick<ProfileRow, "full_name"> | null;
};

type RawSubmissionDetail = Omit<
  SubmissionDetail,
  "organisation" | "submitted_by_profile" | "reviewed_by_profile"
> & {
  organisation: OrganisationRow | OrganisationRow[] | null;
};

function formatDateTime(value: string | null | undefined) {
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

function renderJsonField(label: string, value: unknown): React.ReactElement {
  if (value === null || value === undefined) {
    return (
      <div key={label}>
        <dt className="text-xs font-medium text-soltas-muted">{label}</dt>
        <dd className="text-sm text-soltas-muted">—</dd>
      </div>
    );
  }

  if (typeof value === "string") {
    // Check if it's a URL
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return (
        <div key={label}>
          <dt className="text-xs font-medium text-soltas-muted">{label}</dt>
          <dd className="text-sm">
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="text-soltas-ocean hover:underline"
            >
              {value}
            </a>
          </dd>
        </div>
      );
    }
    return (
      <div key={label}>
        <dt className="text-xs font-medium text-soltas-muted">{label}</dt>
        <dd className="text-sm text-soltas-text">{value}</dd>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div key={label}>
        <dt className="text-xs font-medium text-soltas-muted">{label}</dt>
        <dd className="text-sm text-soltas-text">
          <ul className="list-inside list-disc space-y-1">
            {value.map((item, index) => (
              <li key={index}>
                {typeof item === "string" &&
                (item.startsWith("http://") || item.startsWith("https://")) ? (
                  <a
                    href={item}
                    target="_blank"
                    rel="noreferrer"
                    className="text-soltas-ocean hover:underline"
                  >
                    {item}
                  </a>
                ) : (
                  String(item)
                )}
              </li>
            ))}
          </ul>
        </dd>
      </div>
    );
  }

  if (typeof value === "object") {
    return (
      <div key={label}>
        <dt className="text-xs font-medium text-soltas-muted">{label}</dt>
        <dd className="text-sm text-soltas-text">
          <dl className="mt-2 space-y-2 rounded bg-soltas-off-white p-3">
            {Object.entries(value as Record<string, unknown>).map(([key, val]) => (
              <div key={key}>
                <dt className="text-xs font-medium text-soltas-muted">{key}:</dt>
                <dd className="ml-2 text-xs">
                  {typeof val === "string" &&
                  (val.startsWith("http://") || val.startsWith("https://")) ? (
                    <a
                      href={val}
                      target="_blank"
                      rel="noreferrer"
                      className="text-soltas-ocean hover:underline"
                    >
                      {val}
                    </a>
                  ) : (
                    String(val)
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </dd>
      </div>
    );
  }

  return (
    <div key={label}>
      <dt className="text-xs font-medium text-soltas-muted">{label}</dt>
      <dd className="text-sm text-soltas-text">{String(value)}</dd>
    </div>
  );
}

async function approveSubmission(formData: FormData) {
  "use server";

  const id = formData.get("id");
  const organisationId = formData.get("organisation_id");
  const adminNotes = formData.get("admin_notes");

  if (typeof id !== "string" || !id) {
    throw new Error("Missing submission id.");
  }
  if (typeof organisationId !== "string" || !organisationId) {
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

  const now = new Date().toISOString();

  // Update the organisation to verified
  const { error: orgError } = await supabase
    .from("organisations")
    .update({
      verification_status: "verified",
      verified_at: now,
      verified_by: userData.user.id,
    })
    .eq("id", organisationId);

  if (orgError) throw orgError;

  // Update the submission to approved
  const { error: submissionError } = await supabase
    .from("organisation_verification_submissions")
    .update({
      status: "approved",
      reviewed_at: now,
      reviewed_by: userData.user.id,
      admin_notes: adminNotes && typeof adminNotes === "string" ? adminNotes : null,
    })
    .eq("id", id);

  if (submissionError) throw submissionError;

  revalidatePath("/admin/organisations");
  revalidatePath("/admin/organisations/submissions");
  redirect(`/admin/organisations/submissions/${id}?message=Submission approved successfully`);
}

async function rejectSubmission(formData: FormData) {
  "use server";

  const id = formData.get("id");
  const organisationId = formData.get("organisation_id");
  const adminNotes = formData.get("admin_notes");

  if (typeof id !== "string" || !id) {
    throw new Error("Missing submission id.");
  }
  if (typeof organisationId !== "string" || !organisationId) {
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

  const now = new Date().toISOString();

  // Keep the organisation as pending (don't change its status)
  // The submission itself is rejected

  // Update the submission to rejected
  const { error: submissionError } = await supabase
    .from("organisation_verification_submissions")
    .update({
      status: "rejected",
      reviewed_at: now,
      reviewed_by: userData.user.id,
      admin_notes: adminNotes && typeof adminNotes === "string" ? adminNotes : null,
    })
    .eq("id", id);

  if (submissionError) throw submissionError;

  revalidatePath("/admin/organisations");
  revalidatePath("/admin/organisations/submissions");
  redirect(`/admin/organisations/submissions/${id}?message=Submission rejected`);
}

export default async function AdminSubmissionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ message?: string; error?: string }>;
}) {
  const supabase = await getServerSupabase();
  const { id } = await params;
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    notFound();
  }

  const { data, error } = await supabase
    .from("organisation_verification_submissions")
    .select(
      `*,
       organisation:organisations(*)
      `
    )
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    notFound();
  }

  const rawSubmission = data as RawSubmissionDetail;

  const people = await fetchProfilesByIds(supabase, [rawSubmission.submitted_by, rawSubmission.reviewed_by]);
  const nameOf = (id: string | null) => {
    const profile = id ? people.get(id) : undefined;
    return profile ? { full_name: profileDisplayName(profile) } : null;
  };
  const submission: SubmissionDetail = {
    ...rawSubmission,
    organisation: one(rawSubmission.organisation),
    submitted_by_profile: nameOf(rawSubmission.submitted_by),
    reviewed_by_profile: nameOf(rawSubmission.reviewed_by),
  };

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const message = resolvedSearchParams?.message;
  const errorMessage = resolvedSearchParams?.error;

  const status = submission.status ?? "pending";
  const isPending = status === "pending";

  const statusBadge = cn(
    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium",
    status === "approved"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : status === "rejected"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-amber-200 bg-amber-50 text-amber-700"
  );

  const evidence = submission.evidence as Record<string, unknown> | null;

  return (
    <main className="space-y-6 p-6">
      {message ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-soltas-text">
            Verification Submission
          </h1>
          <p className="text-sm text-soltas-muted">
            Organisation: {submission.organisation?.name ?? "—"}
          </p>
          <p className="text-xs text-soltas-muted">Submission ID: {submission.id}</p>
        </div>
        <span className={statusBadge}>
          {status === "approved" && <span aria-hidden>✓</span>}
          {status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending"}
        </span>
      </div>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-lg font-semibold text-soltas-text">Submission Details</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-soltas-muted">
              Submitted
            </dt>
            <dd className="text-sm text-soltas-text">{formatDateTime(submission.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-soltas-muted">
              Submitted by
            </dt>
            <dd className="text-sm text-soltas-text">
              {submission.submitted_by_profile?.full_name ?? submission.submitted_by}
            </dd>
          </div>
          {submission.reviewed_at ? (
            <>
              <div>
                <dt className="text-xs font-medium text-soltas-muted">
                  Reviewed
                </dt>
                <dd className="text-sm text-soltas-text">{formatDateTime(submission.reviewed_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-soltas-muted">
                  Reviewed by
                </dt>
                <dd className="text-sm text-soltas-text">
                  {submission.reviewed_by_profile?.full_name ?? submission.reviewed_by ?? "—"}
                </dd>
              </div>
            </>
          ) : null}
        </dl>
        {submission.admin_notes ? (
          <div className="mt-4 rounded bg-soltas-off-white p-3">
            <dt className="text-xs font-medium text-soltas-muted">
              Admin Notes
            </dt>
            <dd className="mt-1 whitespace-pre-line text-sm text-soltas-text">
              {submission.admin_notes}
            </dd>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-lg font-semibold text-soltas-text">Organisation Details</h2>
        {submission.organisation ? (
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-soltas-muted">Name</dt>
              <dd className="text-sm text-soltas-text">{submission.organisation.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-soltas-muted">
                Country Based
              </dt>
              <dd className="text-sm text-soltas-text">
                {submission.organisation.country_based ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-soltas-muted">
                Verification Status
              </dt>
              <dd className="text-sm text-soltas-text">
                {submission.organisation.verification_status}
              </dd>
            </div>
            {submission.organisation.description ? (
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="text-xs font-medium text-soltas-muted">
                  Description
                </dt>
                <dd className="mt-1 text-sm text-soltas-text">
                  {submission.organisation.description}
                </dd>
              </div>
            ) : null}
            {submission.organisation.website ? (
              <div>
                <dt className="text-xs font-medium text-soltas-muted">
                  Website
                </dt>
                <dd className="text-sm">
                  <a
                    href={submission.organisation.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-soltas-ocean hover:underline"
                  >
                    {submission.organisation.website}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="text-sm text-soltas-muted">Organisation not found.</p>
        )}
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 text-lg font-semibold text-soltas-text">Evidence Submitted</h2>
        {evidence ? (
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(evidence).map(([key, value]) =>
              renderJsonField(
                key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, c => c.toUpperCase()),
                value
              )
            )}
          </dl>
        ) : (
          <p className="text-sm text-soltas-muted">No evidence provided.</p>
        )}
      </section>

      {isPending ? (
        <section className="rounded-xl border p-4">
          <h2 className="mb-4 text-lg font-semibold text-soltas-text">Review Actions</h2>
          <div className="flex flex-col gap-4 sm:flex-row">
            <form action={approveSubmission} className="flex-1">
              <input type="hidden" name="id" value={submission.id} />
              <input type="hidden" name="organisation_id" value={submission.organisation_id} />
              <div className="space-y-3">
                <div>
                  <label htmlFor="approve-notes" className="block text-sm font-medium text-soltas-text">
                    Admin Notes (optional)
                  </label>
                  <textarea
                    id="approve-notes"
                    name="admin_notes"
                    rows={3}
                    className="mt-1 w-full rounded-md border border-soltas-line px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Optional notes about this approval..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  Approve Submission
                </button>
              </div>
            </form>

            <form action={rejectSubmission} className="flex-1">
              <input type="hidden" name="id" value={submission.id} />
              <input type="hidden" name="organisation_id" value={submission.organisation_id} />
              <div className="space-y-3">
                <div>
                  <label htmlFor="reject-notes" className="block text-sm font-medium text-soltas-text">
                    Admin Notes (optional)
                  </label>
                  <textarea
                    id="reject-notes"
                    name="admin_notes"
                    rows={3}
                    className="mt-1 w-full rounded-md border border-soltas-line px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    placeholder="Optional notes about this rejection..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded border border-rose-500 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  Reject Submission
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : null}

      <div>
        <Link
          href="/admin/organisations/submissions"
          className="text-sm font-medium text-soltas-ocean hover:underline"
        >
          ← Back to submissions
        </Link>
      </div>
    </main>
  );
}
