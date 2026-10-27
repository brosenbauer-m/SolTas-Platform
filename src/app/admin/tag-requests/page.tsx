import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { PageHeader } from "@/components/ui/page-header";
import { getServerSupabase } from "@/lib/supabaseServer";
import { tagSlug } from "@/lib/tags/iatiSectors";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tag requests" };

type RequestRow = {
  id: string;
  label: string;
  reason: string | null;
  status: string;
  created_at: string;
  project: { name: string | null; slug: string | null } | null;
};

/** Approve: create the tag (or reuse one with the same name) and add it to the project it was asked for. */
async function approve(formData: FormData) {
  "use server";
  const supabase = await getServerSupabase();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return;
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim().replace(/\s+/g, " ");
  const slug = tagSlug(label);
  if (!id || label.length < 2 || !slug) return;

  const { data: request } = await supabase.from("tag_requests").select("id,project_id,status").eq("id", id).maybeSingle();
  if (!request || request.status !== "pending") return;

  let { data: tag } = await supabase.from("tags").select("id").eq("slug", slug).maybeSingle();
  if (!tag) {
    const created = await supabase.from("tags").insert({ slug, label, origin: "admin" }).select("id").single();
    if (created.error) throw created.error;
    tag = created.data;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase
    .from("tag_requests")
    .update({ status: "approved", tag_id: tag.id, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (request.project_id) {
    await supabase
      .from("project_tags")
      .upsert({ project_id: request.project_id, tag_id: tag.id, added_by: "user" }, { ignoreDuplicates: true });
  }
  revalidatePath("/admin/tag-requests");
}

async function reject(formData: FormData) {
  "use server";
  const supabase = await getServerSupabase();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return;
  const id = String(formData.get("id") ?? "");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase
    .from("tag_requests")
    .update({ status: "rejected", reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  revalidatePath("/admin/tag-requests");
}

export default async function TagRequestsPage() {
  const supabase = await getServerSupabase();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound();

  const [{ data: pending }, { count: tagCount }] = await Promise.all([
    supabase
      .from("tag_requests")
      .select("id,label,reason,status,created_at,project:projects(name,slug)")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(200),
    supabase.from("tags").select("id", { count: "exact", head: true }),
  ]);
  const rows = (pending ?? []) as unknown as RequestRow[];

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-5 pb-20 pt-10 sm:pt-14">
      <PageHeader
        title="Tag requests"
        description={`People can only pick tags from the shared list (${(tagCount ?? 0).toLocaleString()} tags). Here they ask for new ones. Approving creates the tag (you can correct the name first) and adds it to the project.`}
      />
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="card p-5">
              <form className="space-y-3">
                <input type="hidden" name="id" value={row.id} />
                <div>
                  <label htmlFor={`label-${row.id}`} className="text-xs font-medium text-soltas-muted">
                    Tag name
                  </label>
                  <input
                    id={`label-${row.id}`}
                    name="label"
                    defaultValue={row.label}
                    maxLength={80}
                    className="mt-1 w-full rounded-xl border border-soltas-line px-3 py-2 text-[15px]"
                  />
                </div>
                {row.reason ? <p className="text-sm text-soltas-muted">“{row.reason}”</p> : null}
                <p className="text-xs text-soltas-muted">
                  {new Date(row.created_at).toLocaleDateString()}
                  {row.project?.slug ? (
                    <>
                      {" · for "}
                      <Link className="text-soltas-ocean hover:underline" href={`/projects/${encodeURIComponent(row.project.slug)}`}>
                        {row.project.name ?? "a project"}
                      </Link>
                    </>
                  ) : null}
                </p>
                <div className="flex gap-2">
                  <button
                    formAction={approve}
                    className="rounded-full bg-soltas-ocean px-4 py-2 text-sm font-semibold text-white hover:bg-soltas-abyssal"
                  >
                    Approve
                  </button>
                  <button
                    formAction={reject}
                    className="rounded-full border border-soltas-line px-4 py-2 text-sm font-medium text-soltas-text hover:bg-soltas-off-white"
                  >
                    Reject
                  </button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card p-6 text-sm text-soltas-muted">No tag requests waiting.</p>
      )}
    </main>
  );
}
