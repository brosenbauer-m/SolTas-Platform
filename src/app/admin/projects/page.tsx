import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectApprovalActions } from "@/components/admin/ProjectApprovalActions";
import type { Database } from "@/lib/database.types";
import { fetchProfilesByIds } from "@/lib/profiles/byIds";
import { MissingSupabaseEnvError } from "@/lib/supabaseConfig";
import { getServerSupabase } from "@/lib/supabaseServer";
import { cn } from "@/lib/utils";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProjectMediaRow = Database["public"]["Tables"]["project_media"]["Row"];
type ProjectLinksRow = Database["public"]["Tables"]["project_links"]["Row"];

type ProjectListItem = Pick<
  ProjectRow,
  | "id"
  | "name"
  | "created_at"
  | "created_by"
  | "place_name"
  | "links"
  | "status"
  | "approved_at"
  | "approved_by"
  | "rejected_at"
  | "rejected_by"
  | "rejection_reason"
> & {
  project_media: Pick<ProjectMediaRow, "id">[] | null;
  project_links: Pick<ProjectLinksRow, "id">[] | null;
  created_by_profile: Pick<ProfileRow, "full_name" | "organisation_name"> | null;
  approved_by_profile: Pick<ProfileRow, "full_name" | "organisation_name"> | null;
  rejected_by_profile: Pick<ProfileRow, "full_name" | "organisation_name"> | null;
};

type RawProjectListItem = Omit<
  ProjectListItem,
  "created_by_profile" | "approved_by_profile" | "rejected_by_profile"
>;

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch (error) {
    console.error("date-format", error);
    return value;
  }
}

function getLinksCount(project: ProjectListItem) {
  if (Array.isArray(project.project_links)) {
    return project.project_links.length;
  }
  const jsonValue = project.links;
  if (Array.isArray(jsonValue)) {
    return jsonValue.length;
  }
  return 0;
}

function getMediaCount(project: ProjectListItem) {
  if (Array.isArray(project.project_media)) {
    return project.project_media.length;
  }
  return 0;
}

function getProfileName(profile: Pick<ProfileRow, "full_name" | "organisation_name"> | null) {
  if (profile?.full_name) return profile.full_name;
  if (profile?.organisation_name) return profile.organisation_name;
  return null;
}

function getCreatedBy(project: ProjectListItem) {
  return (
    getProfileName(project.created_by_profile) ?? project.created_by ?? "—"
  );
}

function getApprovedBy(project: ProjectListItem) {
  return (
    getProfileName(project.approved_by_profile) ?? project.approved_by ?? "—"
  );
}

function getRejectedBy(project: ProjectListItem) {
  return (
    getProfileName(project.rejected_by_profile) ?? project.rejected_by ?? "—"
  );
}

const views = {
  pending: {
    label: "Pending",
    description:
      "Review the latest pending projects and approve or reject them.",
    empty: "No pending projects right now.",
  },
  approved: {
    label: "Approved",
    description: "Projects that are currently visible on the public map.",
    empty: "No approved projects yet.",
  },
  rejected: {
    label: "Rejected",
    description: "Projects that were rejected during moderation.",
    empty: "No rejected projects right now.",
  },
} as const;

type ViewKey = keyof typeof views;

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  let supabase;

  try {
    supabase = await getServerSupabase();
  } catch (error) {
    if (error instanceof MissingSupabaseEnvError) {
      return (
        <main className="space-y-6 p-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Project Approvals</h1>
            <p className="text-sm text-soltas-muted">
              Review the latest pending projects and approve or reject them.
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium">Supabase configuration required</p>
            <p className="mt-1">
              {error.message} Update your <code>.env.local</code> with the correct values
              from the Supabase dashboard and restart the development server.
            </p>
          </div>
        </main>
      );
    }
    throw error;
  }
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const selectedView = ((): ViewKey => {
    const value = resolvedSearchParams?.status;
    if (value === "approved" || value === "rejected") {
      return value;
    }
    return "pending";
  })();

  const { data, error } = await supabase
    .from("projects")
    .select(
      `id,name,created_at,created_by,place_name,links,status,
       approved_at,approved_by,rejected_at,rejected_by,rejection_reason,
       project_links:project_links(id),
       project_media:project_media(id)
      `
    )
    .eq("status", selectedView)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  const rows = (data as RawProjectListItem[] | null) ?? [];
  const profiles = await fetchProfilesByIds(
    supabase,
    rows.flatMap(project => [project.created_by, project.approved_by, project.rejected_by]),
  );
  const projects: ProjectListItem[] = rows.map(project => ({
    ...project,
    created_by_profile: project.created_by ? profiles.get(project.created_by) ?? null : null,
    approved_by_profile: project.approved_by ? profiles.get(project.approved_by) ?? null : null,
    rejected_by_profile: project.rejected_by ? profiles.get(project.rejected_by) ?? null : null,
  }));

  return (
    <main className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Project Approvals</h1>
        <p className="text-sm text-soltas-muted">{views[selectedView].description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(views) as ViewKey[]).map(view => {
          const isActive = selectedView === view;
          const query = view === "pending" ? {} : { status: view };
          return (
            <Link
              key={view}
              href={{ pathname: "/admin/projects", query }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                isActive
                  ? "border-soltas-ocean bg-soltas-glacial/15 text-soltas-ocean"
                  : "border-soltas-line text-soltas-muted hover:border-soltas-line hover:text-soltas-text"
              )}
            >
              {views[view].label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-soltas-off-white text-left text-xs font-medium text-soltas-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Created by</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Links</th>
              <th className="px-4 py-3">Media</th>
              <th className="px-4 py-3">
                {selectedView === "pending"
                  ? "Actions"
                  : selectedView === "approved"
                    ? "Approval"
                    : "Rejection"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {projects.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-soltas-muted">
                  {views[selectedView].empty}
                </td>
              </tr>
            ) : (
              projects.map(project => {
                const created = formatDate(project.created_at);
                const linksCount = getLinksCount(project);
                const mediaCount = getMediaCount(project);
                return (
                  <tr key={project.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-soltas-text">{project.name}</div>
                      <div className="text-xs text-soltas-muted">{project.id}</div>
                      <Link
                        href={`/admin/projects/${project.id}`}
                        className="mt-2 inline-flex text-xs font-medium text-soltas-ocean hover:underline"
                      >
                        View details
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{created}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{getCreatedBy(project)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {project.place_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{linksCount}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{mediaCount}</td>
                    <td className="px-4 py-3">
                      {selectedView === "pending" ? (
                        <ProjectApprovalActions
                          projectId={project.id}
                          projectName={project.name}
                          layout="inline"
                        />
                      ) : null}
                      {selectedView === "approved" ? (
                        <div className="space-y-2 text-xs text-soltas-muted">
                          <div>
                            <span className="font-medium text-soltas-text">Approved:</span>{" "}
                            {formatDate(project.approved_at)}
                          </div>
                          <div>
                            <span className="font-medium text-soltas-text">By:</span>{" "}
                            {getApprovedBy(project)}
                          </div>
                          <ProjectApprovalActions
                            projectId={project.id}
                            projectName={project.name}
                            layout="inline"
                            status="approved"
                          />
                        </div>
                      ) : null}
                      {selectedView === "rejected" ? (
                        <div className="space-y-2 text-xs text-soltas-muted">
                          <div>
                            <span className="font-medium text-soltas-text">Rejected:</span>{" "}
                            {formatDate(project.rejected_at)}
                          </div>
                          <div>
                            <span className="font-medium text-soltas-text">By:</span>{" "}
                            {getRejectedBy(project)}
                          </div>
                          {project.rejection_reason ? (
                            <div className="rounded bg-rose-50 p-2 text-soltas-muted">
                              <span className="font-medium text-rose-600">Reason:</span>{" "}
                              {project.rejection_reason}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
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
