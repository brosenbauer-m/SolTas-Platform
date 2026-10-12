import Link from "next/link";
import { notFound } from "next/navigation";

import type { Database } from "@/lib/database.types";
import FollowButton from "@/components/FollowButton";
import UpdatesSectionWithSocial, { type UpdateSummary } from "@/components/updates/UpdatesSectionWithSocial";
import { getServerSupabase } from "@/lib/supabaseServer";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type OrganisationRow = Database["public"]["Tables"]["organisations"]["Row"];

function formatMoney(amount: number | null, currency: string | null) {
  if (typeof amount !== "number") return null;
  const code = typeof currency === "string" && currency.trim().length > 0 ? currency : "USD";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${code}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeJsonLinks(value: ProjectRow["links"]) {
  // projects.links is Json | null (may be array or object depending on legacy data)
  const out: Array<{ label?: string; url: string }> = [];
  if (!value) return out;

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!isRecord(item)) continue;

      const url = item["url"];
      const label = item["label"];

      if (typeof url === "string" && url.trim()) {
        out.push({
          url: url.trim(),
          label: typeof label === "string" && label.trim() ? label.trim() : undefined,
        });
      }
    }
    return out;
  }

  if (isRecord(value)) {
    // If it's a map like { website: "https://..." }
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === "string" && v.trim()) out.push({ label: k, url: v.trim() });
    }
  }

  return out;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!slug || typeof slug !== "string") notFound();

  const supabase = await getServerSupabase();

  // 1) Fetch the project by slug WITHOUT over-filtering.
  // RLS is the source of truth: if user can't see it, PostgREST will return no rows or a permission error.
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .single();

  if (projectError || !project) {
    // Only 404 for "not found" or "blocked by RLS"
    if (projectError?.code === "PGRST116" || projectError?.code === "42501") notFound();
    // Anything else is a real bug (schema mismatch, bad select, etc.) and should not masquerade as 404.
    throw new Error(projectError?.message ?? "Failed to load project.");
  }

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  // 3) Load related data with separate queries to avoid embedded-select relationship name mismatches
  // (which can cause errors and accidental 404s).
  let leadOrganisation: Pick<OrganisationRow, "id" | "name" | "website"> | null = null;

  if (project.lead_org_id) {
    const { data: org, error: orgError } = await supabase
      .from("organisations")
      .select("id,name,website")
      .eq("id", project.lead_org_id)
      .maybeSingle();

    // If org is blocked by RLS or missing, we just show nothing (not a 404).
    if (!orgError && org) leadOrganisation = org;
  }

  const { data: projectLinks } = await supabase
    .from("project_links")
    .select("id,label,url,created_at,project_id")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true });

  const { data: projectMedia } = await supabase
    .from("project_media")
    .select("id,path,caption,mime_type,created_at,project_id")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  // 4) Can the current viewer edit? (used only for buttons)
  const { data: canEdit } = await supabase.rpc("user_can_edit_project", { pid: project.id });

  const { count: followerCount, error: followerCountError } = await supabase
    .from("follow_edges")
    .select("id", { count: "exact", head: true })
    .eq("target_type", "project")
    .eq("target_project_id", project.id);

  const { data: followEdge, error: followEdgeError } = user
    ? await supabase
        .from("follow_edges")
        .select("id")
        .eq("target_type", "project")
        .eq("target_project_id", project.id)
        .eq("follower_user_id", user.id)
        .maybeSingle()
    : { data: null, error: null };

  // RLS returns "project"-visibility updates only to project members (owner, collaborators, shares).
  const { data: projectUpdates, error: updatesError } = await supabase
    .from("project_updates")
    .select("id,project_id,author_user_id,title,body,visibility,published_at,created_at")
    .eq("project_id", project.id)
    .order("published_at", { ascending: false });

  if (updatesError) throw new Error(updatesError.message);

  const authorIds = Array.from(new Set((projectUpdates ?? []).map((u) => u.author_user_id)));
  const { data: authorProfiles } = authorIds.length
    ? await supabase.from("profiles").select("id,first_name,last_name,full_name").in("id", authorIds)
    : { data: [] as Array<{ id: string; first_name: string | null; last_name: string | null; full_name: string | null }> };
  const authorNames = new Map(
    (authorProfiles ?? []).map((p) => [
      p.id,
      [p.first_name, p.last_name].filter(Boolean).join(" ") || p.full_name || undefined,
    ]),
  );

  const resolvedFollowerCount = followerCountError ? null : followerCount ?? 0;
  const isFollowing = Boolean(followEdge && !followEdgeError);

  const normalizedLinks = [
    ...(projectLinks ?? []).map((l) => ({
      label: l.label ?? undefined,
      url: l.url,
    })),
    ...normalizeJsonLinks(project.links),
  ].filter((l) => typeof l.url === "string" && l.url.trim().length > 0);

  const locationParts = [project.place_name, project.region, project.country].filter(
    Boolean
  ) as string[];
  const locationLabel = locationParts.length > 0 ? locationParts.join(", ") : null;

  const start = formatDate(project.start_date);
  const end = formatDate(project.end_date);

  const donations = formatMoney(project.donations_received, project.currency);
  const needed = formatMoney(project.amount_needed, project.currency);

  // Map project_updates to UpdateSummary format
  const updates: UpdateSummary[] = (projectUpdates ?? []).map((update) => ({
    id: update.id,
    title: update.title,
    summary: update.body,
    created_at: update.published_at,
    author_name: authorNames.get(update.author_user_id),
    visibility: update.visibility === "project" ? "project" : "public",
  }));

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:space-y-8 sm:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-soltas-bark">
              {project.name}
            </h1>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-soltas-muted">
              {project.category}
            </span>
            {project.status !== "approved" && user ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                {project.status}
              </span>
            ) : null}
          </div>

          {leadOrganisation?.name ? (
            <p className="mt-1 text-sm text-soltas-muted">
              Lead organisation:{" "}
              {leadOrganisation.website ? (
                <Link
                  className="font-medium text-soltas-ocean hover:underline"
                  href={leadOrganisation.website}
                  target="_blank"
                  rel="noreferrer"
                >
                  {leadOrganisation.name}
                </Link>
              ) : (
                <span className="font-medium text-soltas-bark">{leadOrganisation.name}</span>
              )}
            </p>
          ) : null}

          {locationLabel ? <p className="mt-1 text-sm text-soltas-muted">{locationLabel}</p> : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/projects/${slug}/edit`}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Edit
              </Link>
              <Link
                href={`/projects/${slug}/edit#sharing`}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-soltas-bark hover:bg-slate-50"
              >
                Share
              </Link>
            </div>
          ) : null}
          <FollowButton
            targetType="project"
            targetId={project.id}
            initialIsFollowing={isFollowing}
            initialFollowerCount={resolvedFollowerCount}
            isAuthenticated={Boolean(user)}
          />
        </div>
      </header>

      {project.description ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-soltas-muted">
            Description
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-soltas-bark">
            {project.description}
          </p>
        </section>
      ) : null}

      <UpdatesSectionWithSocial
        updates={updates}
        isAuthenticated={Boolean(user)}
        canPost={Boolean(canEdit)}
        projectId={project.id}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-soltas-muted">Details</h2>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-soltas-muted">
              Category
            </dt>
            <dd className="text-sm text-soltas-bark">{project.category}</dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-soltas-muted">
              Timeline
            </dt>
            <dd className="text-sm text-soltas-bark">
              {start || end ? (
                <span>
                  {start ?? "—"} <span className="text-slate-400">→</span> {end ?? "—"}
                </span>
              ) : (
                "—"
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-soltas-muted">Funding</dt>
            <dd className="text-sm text-soltas-bark">
              {donations || needed ? (
                <span>
                  {donations ? <>Received: {donations}</> : null}
                  {donations && needed ? <span className="text-slate-400"> · </span> : null}
                  {needed ? <>Needed: {needed}</> : null}
                </span>
              ) : (
                "—"
              )}
            </dd>
          </div>

          {project.lives_improved != null ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-soltas-muted">
                Lives improved
              </dt>
              <dd className="text-sm text-soltas-bark">
                {Number(project.lives_improved).toLocaleString()}
              </dd>
            </div>
          ) : null}

          {project.type_of_intervention?.length ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-soltas-muted">
                Type of intervention
              </dt>
              <dd className="text-sm text-soltas-bark">
                {project.type_of_intervention.join(", ")}
              </dd>
            </div>
          ) : null}

          {project.target_demographics?.length ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-soltas-muted">
                Target demographics
              </dt>
              <dd className="text-sm text-soltas-bark">
                {project.target_demographics.join(", ")}
              </dd>
            </div>
          ) : project.target_demographic ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-soltas-muted">
                Target demographic
              </dt>
              <dd className="text-sm text-soltas-bark">{project.target_demographic}</dd>
            </div>
          ) : null}

          {Array.isArray(project.thematic_area) && project.thematic_area.length > 0 ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-soltas-muted">
                Thematic areas
              </dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {(project.thematic_area as string[]).map((item: string) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-soltas-text"
                  >
                    {item}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-soltas-muted">Links</h2>

        {normalizedLinks.length === 0 ? (
          <p className="mt-3 text-sm text-soltas-muted">No links added yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {normalizedLinks.map((l, idx) => (
              <li
                key={`${l.url}-${idx}`}
                className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-soltas-bark">
                    {l.label ?? l.url}
                  </div>
                  {l.label ? <div className="truncate text-xs text-soltas-muted">{l.url}</div> : null}
                </div>
                <Link
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-soltas-ocean hover:underline"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-soltas-muted">Media</h2>

        {(projectMedia?.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-soltas-muted">No media uploaded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(projectMedia ?? []).map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-soltas-bark">
                    {item.caption || item.path}
                  </div>
                  <div className="text-xs text-soltas-muted">{item.mime_type || "Unknown type"}</div>
                </div>
                <Link
                  href={item.path}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-soltas-ocean hover:underline"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
