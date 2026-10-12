import { notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";

import ProjectForm from "@/components/projects/ProjectForm";
import { sendEmail } from "@/lib/email/sendEmail";
import { getServerSupabase } from "@/lib/supabaseServer";

type ProjectRow = {
  id: string;
  slug: string | null;
  name: string | null;
  description: string | null;
  category: string | null;
  lead_org_id: string | null;
  lat: number | null;
  lng: number | null;
  place_name: string | null;
  type_of_intervention: string[] | null;
  target_demographic: string | null;
  lives_improved: number | null;
  start_date: string | null;
  end_date: string | null;
  thematic_area: string[] | null;
  donations_received: number | null;
  amount_needed: number | null;
  currency: string | null;
};

type LinkRow = { label: string | null; url: string | null };
type PartnerRow = { organisation_id: string | null };
type SdgRow = { sdg_id: number | null };
type IfrcRow = { challenge_id: number | null };

type CollaboratorRole = "viewer" | "editor";

type Collaborator = {
  user_id: string;
  role: CollaboratorRole;
  email: string | null;
  full_name: string | null;
  organisation_name: string | null;
};

type CollaborationEmailType = "invited" | "role_changed" | "removed";

function asOptionalString(value: string | null | undefined) {
  return typeof value === "string" ? value : undefined;
}

function asOptionalNumber(value: number | null | undefined) {
  return typeof value === "number" ? value : undefined;
}

function asOptionalDate(value: string | null | undefined) {
  if (typeof value !== "string" || !value.length) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function normalizeRole(value: unknown): CollaboratorRole {
  return value === "editor" ? "editor" : "viewer";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) throw new Error("Missing NEXT_PUBLIC_SITE_URL.");
  return siteUrl.replace(/\/$/, "");
}

function buildProjectLink(slug: string, role: CollaboratorRole) {
  const path = role === "editor" ? `/projects/${slug}/edit#sharing` : `/projects/${slug}`;
  return `${getSiteUrl()}${path}`;
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildCollaborationEmail({
  type,
  projectName,
  projectUrl,
  role,
}: {
  type: CollaborationEmailType;
  projectName: string;
  projectUrl: string;
  role: CollaboratorRole;
}) {
  const safeProjectName = escapeHtml(projectName);
  const subjectMap: Record<CollaborationEmailType, string> = {
    invited: `You were added to ${safeProjectName}`,
    role_changed: `Your access changed for ${safeProjectName}`,
    removed: `You were removed from ${safeProjectName}`,
  };

  const safeRole = escapeHtml(role);
  const roleLine =
    type === "removed"
      ? ""
      : `<p style="margin: 0 0 12px;">Role: <strong>${safeRole}</strong></p>`;
  const textRoleLine = type === "removed" ? "" : `Role: ${role}\n`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <h2 style="margin: 0 0 12px;">${subjectMap[type]}</h2>
      <p style="margin: 0 0 12px;">Project: <strong>${safeProjectName}</strong></p>
      ${roleLine}
      <p style="margin: 0 0 16px;">
        <a href="${projectUrl}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">
          Open project
        </a>
      </p>
      <p style="margin: 0; font-size: 13px; color: #555;">
        If you did not expect this, please contact the project owner.
      </p>
    </div>
  `;

  const text = `${subjectMap[type]}
Project: ${projectName}
${textRoleLine}Link: ${projectUrl}
`;

  return { subject: subjectMap[type], html, text };
}

async function fetchCollaborators(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  pid: string,
) {
  const { data, error } = await supabase.rpc("get_project_collaborators", { pid });
  if (error) throw new Error(error.message);
  return (data ?? []) as Collaborator[];
}

async function maybeSendCollaborationEmail({
  supabase,
  collaborator,
  projectName,
  projectSlugOrId,
  type,
}: {
  supabase: Awaited<ReturnType<typeof getServerSupabase>>;
  collaborator: Collaborator;
  projectName: string;
  projectSlugOrId: string;
  type: CollaborationEmailType;
}) {
  if (!collaborator.email) return;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email_notifications_enabled")
    .eq("id", collaborator.user_id)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (profile?.email_notifications_enabled === false) return;

  const projectUrl = buildProjectLink(projectSlugOrId, collaborator.role);
  const { subject, html, text } = buildCollaborationEmail({
    type,
    projectName,
    projectUrl,
    role: collaborator.role,
  });

  await sendEmail({ to: collaborator.email, subject, html, text });
}

export default async function ProjectEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await getServerSupabase();
  const { slug } = await params;

  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      id,
      slug,
      name,
      description,
      category,
      lead_org_id,
      lat,
      lng,
      place_name,
      type_of_intervention,
      target_demographic,
      lives_improved,
      start_date,
      end_date,
      thematic_area,
      donations_received,
      amount_needed,
      currency,
      project_links:project_links(label,url),
      project_partners:project_partners(organisation_id),
      project_sdgs:project_sdgs(sdg_id),
      project_ifrc_challenges:project_ifrc_challenges(challenge_id)
      `,
    )
    .eq("slug", slug)
    .single();

  if (error || !data) notFound();

  const project = data as unknown as ProjectRow & {
    project_links?: LinkRow[] | null;
    project_partners?: PartnerRow[] | null;
    project_sdgs?: SdgRow[] | null;
    project_ifrc_challenges?: IfrcRow[] | null;
  };

  const { data: canEdit } = await supabase.rpc("user_can_edit_project", { pid: project.id });
  if (!canEdit) notFound();

  const projectSlugOrId = project.slug ?? project.id;
  const projectName = project.name ?? "this project";

  // ---------- Server Actions ----------
  async function inviteCollaborator(formData: FormData) {
    "use server";
    const supabase = await getServerSupabase();

    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const role = normalizeRole(formData.get("role"));

    if (!email) throw new Error("Email is required.");

    const { error } = await supabase.rpc("add_project_collaborator_by_email", {
      pid: project.id,
      email,
      role,
    });

    if (error) throw new Error(error.message);

    const collaborators = await fetchCollaborators(supabase, project.id);
    const target = collaborators.find(c => (c.email ?? "").toLowerCase() === email);

    if (target) {
      await maybeSendCollaborationEmail({
        supabase,
        collaborator: target,
        projectName,
        projectSlugOrId,
        type: "invited",
      });
    }

    revalidatePath(`/projects/${slug}/edit`);
  }

  async function updateCollaboratorRole(formData: FormData) {
    "use server";
    const supabase = await getServerSupabase();

    const userId = String(formData.get("user_id") ?? "").trim();
    const role = normalizeRole(formData.get("role"));

    if (!userId) throw new Error("Missing user id.");

    const { error } = await supabase
      .from("project_collaborators")
      .update({ role })
      .eq("project_id", project.id)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    const collaborators = await fetchCollaborators(supabase, project.id);
    const target = collaborators.find(c => c.user_id === userId);

    if (target) {
      await maybeSendCollaborationEmail({
        supabase,
        collaborator: target,
        projectName,
        projectSlugOrId,
        type: "role_changed",
      });
    }

    revalidatePath(`/projects/${slug}/edit`);
  }

  async function removeCollaborator(formData: FormData) {
    "use server";
    const supabase = await getServerSupabase();

    const userId = String(formData.get("user_id") ?? "").trim();
    if (!userId) throw new Error("Missing user id.");

    const beforeDelete = await fetchCollaborators(supabase, project.id);
    const beforeTarget = beforeDelete.find(c => c.user_id === userId) ?? null;

    const { error } = await supabase
      .from("project_collaborators")
      .delete()
      .eq("project_id", project.id)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    // after delete, the collaborator won't exist in list; use beforeTarget
    if (beforeTarget) {
      await maybeSendCollaborationEmail({
        supabase,
        collaborator: beforeTarget,
        projectName,
        projectSlugOrId,
        type: "removed",
      });
    }

    revalidatePath(`/projects/${slug}/edit`);
  }

  async function createProjectUpdate(formData: FormData) {
    "use server";
    const supabase = await getServerSupabase();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user ?? null;

    if (!user) throw new Error("You must be signed in to publish updates.");

    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const visibility = String(formData.get("visibility") ?? "project");

    if (!title || !body) throw new Error("Title and body are required.");
    if (!["public", "project"].includes(visibility)) throw new Error("Invalid visibility.");

    const { error } = await supabase.from("project_updates").insert({
      project_id: project.id,
      author_user_id: user.id,
      title,
      body,
      visibility,
    });

    if (error) throw new Error(error.message);

    revalidatePath(`/projects/${slug}`);
    revalidatePath(`/projects/${slug}/edit`);
    revalidatePath(`/feed`);
  }
  // ---------- /Server Actions ----------

  // Collaborators list (Sharing UI)
  const { data: collaboratorsData, error: collaboratorsError } = await supabase.rpc(
    "get_project_collaborators",
    {
      pid: project.id,
    },
  );
  if (collaboratorsError) throw new Error(collaboratorsError.message);

  const collaborators = (collaboratorsData ?? []) as Collaborator[];

  const { data: projectUpdates, error: updatesError } = await supabase
    .from("project_updates")
    .select("id,title,body,visibility,published_at,created_at,author_user_id")
    .eq("project_id", project.id)
    .order("published_at", { ascending: false });

  if (updatesError) throw new Error(updatesError.message);

  const normalizedCategory: "humanitarian" | "environmental" =
    project.category === "humanitarian" ? "humanitarian" : "environmental";

  const hasLocation =
    typeof project.lat === "number" &&
    typeof project.lng === "number" &&
    typeof project.place_name === "string" &&
    project.place_name.length > 0;

  const initialValues = {
    category: normalizedCategory,
    name: project.name ?? "",
    description: project.description ?? "",
    lead_org_id: asOptionalString(project.lead_org_id),
    location: hasLocation
      ? {
          lat: project.lat as number,
          lng: project.lng as number,
          place_name: project.place_name as string,
        }
      : null,
    type_of_intervention: Array.isArray(project.type_of_intervention) ? project.type_of_intervention : [],
    thematic_area: Array.isArray(project.thematic_area) ? project.thematic_area : [],
    target_demographic: project.target_demographic ?? "",
    lives_improved: asOptionalNumber(project.lives_improved),
    donations_received: asOptionalNumber(project.donations_received),
    amount_needed: asOptionalNumber(project.amount_needed),
    start_date: asOptionalDate(project.start_date),
    end_date: asOptionalDate(project.end_date),
    currency: project.currency ?? "USD",
    links:
      project.project_links?.length
        ? project.project_links
            .filter(l => typeof l.url === "string" && l.url.length > 0)
            .map(l => ({ url: l.url as string, label: l.label ?? undefined }))
        : [{ url: "", label: undefined }],
    partner_org_ids:
      project.project_partners
        ?.map(p => p.organisation_id)
        .filter((v): v is string => typeof v === "string" && v.length > 0) ?? [],
    sdg_ids:
      project.project_sdgs?.map(s => s.sdg_id).filter((v): v is number => typeof v === "number") ?? [],
    ifrc_ids:
      project.project_ifrc_challenges
        ?.map(i => i.challenge_id)
        .filter((v): v is number => typeof v === "number") ?? [],
  };

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-soltas-text">Edit project</h1>
        <p className="text-sm text-soltas-muted">
          Changes are saved under the same access rules (owner/admin/shared editors).
        </p>
      </div>

      <ProjectForm mode="edit" projectId={project.id} initialValues={initialValues} />

      {/* Sharing */}
      <section id="sharing" className="rounded-2xl border border-soltas-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Sharing</h2>
            <p className="mt-1 text-sm text-soltas-muted">
              Invite collaborators to view or edit this project. Access is enforced by Supabase RLS.
            </p>
          </div>

          <Link
            href={`/projects/${encodeURIComponent(projectSlugOrId)}`}
            className="inline-flex items-center justify-center rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm font-medium text-soltas-text hover:bg-soltas-off-white"
          >
            View public page
          </Link>
        </div>

        {/* Invite */}
        <form
          action={inviteCollaborator}
          className="mt-5 flex flex-col gap-3 rounded-xl border border-soltas-line bg-soltas-off-white p-4 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className="block text-xs font-medium text-soltas-muted">
              Invite by email
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="person@example.com"
              className="mt-1 w-full rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:w-44">
            <label className="block text-xs font-medium text-soltas-muted">Role</label>
            <select
              name="role"
              defaultValue="viewer"
              className="mt-1 w-full rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
          </div>

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-soltas-ocean px-4 text-sm font-medium text-white hover:bg-soltas-abyssal"
          >
            Invite
          </button>
        </form>

        {/* List */}
        <div className="mt-5 space-y-3">
          <h3 className="text-sm font-semibold text-soltas-text">Collaborators</h3>

          {collaborators.length ? (
            <ul className="space-y-2">
              {collaborators.map((c: Collaborator) => {
                const display = c.full_name ?? c.organisation_name ?? c.email ?? c.user_id;

                return (
                  <li
                    key={c.user_id}
                    className="flex flex-col gap-2 rounded-xl border border-soltas-line bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-soltas-text">{display}</div>
                      <div className="truncate text-xs text-soltas-muted">{c.email ?? "—"}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <form action={updateCollaboratorRole} className="flex items-center gap-2">
                        <input type="hidden" name="user_id" value={c.user_id} />
                        <select
                          name="role"
                          defaultValue={c.role}
                          className="h-9 rounded-lg border border-soltas-line bg-white px-2 text-sm"
                        >
                          <option value="viewer">viewer</option>
                          <option value="editor">editor</option>
                        </select>
                        <button
                          type="submit"
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-soltas-line bg-white px-3 text-sm font-medium text-soltas-text hover:bg-soltas-off-white"
                        >
                          Update
                        </button>
                      </form>

                      <form action={removeCollaborator}>
                        <input type="hidden" name="user_id" value={c.user_id} />
                        <button
                          type="submit"
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 hover:bg-rose-100"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-soltas-muted">No collaborators yet.</p>
          )}

          <p className="text-xs text-soltas-muted">
            Notifications are generated automatically when collaborators change. Collaborators can check the bell icon or
            visit <span className="font-medium text-soltas-text">/notifications</span>.
          </p>
        </div>
      </section>

      <section id="updates" className="rounded-2xl border border-soltas-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-soltas-text">
              Updates
            </h2>
            <p className="mt-1 text-sm text-soltas-muted">
              Publish short project updates for followers. Public updates appear on the project page.
            </p>
          </div>
          <Link
            href={`/projects/${encodeURIComponent(projectSlugOrId)}#updates`}
            className="inline-flex items-center justify-center rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm font-medium text-soltas-text hover:bg-soltas-off-white"
          >
            View public updates
          </Link>
        </div>

        <form
          action={createProjectUpdate}
          className="mt-5 space-y-4 rounded-xl border border-soltas-line bg-soltas-off-white p-4"
        >
          <div>
            <label className="block text-xs font-medium text-soltas-muted">
              Title
            </label>
            <input
              name="title"
              required
              placeholder="What changed since the last update?"
              className="mt-1 w-full rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-soltas-muted">
              Update details
            </label>
            <textarea
              name="body"
              required
              rows={4}
              placeholder="Share progress, milestones, or needs."
              className="mt-1 w-full rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:w-56">
            <label className="block text-xs font-medium text-soltas-muted">
              Visibility
            </label>
            <select
              name="visibility"
              defaultValue="project"
              className="mt-1 w-full rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm"
            >
              <option value="project">Project members</option>
              <option value="public">Public</option>
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-soltas-ocean px-4 text-sm font-medium text-white hover:bg-soltas-abyssal"
          >
            Publish update
          </button>
        </form>

        <div className="mt-5 space-y-3">
          <h3 className="text-sm font-semibold text-soltas-text">Recent updates</h3>
          {projectUpdates && projectUpdates.length > 0 ? (
            <ul className="space-y-3">
              {projectUpdates.map((update) => (
                <li
                  key={update.id}
                  className="rounded-xl border border-soltas-line bg-white px-4 py-3"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-medium text-soltas-text">{update.title}</div>
                    <span className="text-xs text-soltas-muted">
                      {formatDate(update.published_at)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-soltas-text">{update.body}</p>
                  <p className="mt-2 text-xs font-medium text-soltas-muted">
                    Visibility: {update.visibility}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-soltas-muted">No updates yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
