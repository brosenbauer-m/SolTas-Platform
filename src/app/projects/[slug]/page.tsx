import Link from "next/link";
import { notFound } from "next/navigation";

import type { Database } from "@/lib/database.types";
import FollowButton from "@/components/FollowButton";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import ImportedProjectDetails, { publisherName, readSourceData } from "@/components/projects/ImportedProjectDetails";
import { SupportCard } from "@/components/projects/SupportCard";
import UpdatesSectionWithSocial, { type UpdateSummary } from "@/components/updates/UpdatesSectionWithSocial";
import { getServerSupabase } from "@/lib/supabaseServer";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type OrganisationRow = Database["public"]["Tables"]["organisations"]["Row"];

function formatMoney(amount: number | null, currency: string | null) {
  if (typeof amount !== "number") return null;
  const code = typeof currency === "string" && currency.trim().length > 0 ? currency : "USD";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
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

  // Imported from IATI: owned by the "IATI" system organisation; show the real publisher instead.
  const imported = project.source === "iati" && Boolean(project.iati_identifier);
  const sourceData = readSourceData(project.source_data);
  const publisher = imported ? publisherName(sourceData) : null;
  const budget = imported ? formatMoney(sourceData.budget_total ?? null, project.currency) : null;

  // Imported projects have no donations yet: show their budget instead of "Raised 0"
  const showRaised =
    (typeof project.donations_received === "number" || typeof project.amount_needed === "number") &&
    (!imported || (project.donations_received ?? 0) > 0 || (project.amount_needed ?? 0) > 0);

  const start = formatDate(project.start_date);
  const end = formatDate(project.end_date);

  const donations = formatMoney(project.donations_received, project.currency);
  const needed = formatMoney(project.amount_needed, project.currency);
  const raised = typeof project.donations_received === "number" ? project.donations_received : null;
  const target = typeof project.amount_needed === "number" && project.amount_needed > 0 ? project.amount_needed : null;
  const progress = target ? Math.min(100, Math.round(((raised ?? 0) / target) * 100)) : 0;
  const hasDetails = Boolean(
    project.type_of_intervention?.length ||
      project.target_demographics?.length ||
      project.target_demographic ||
      (Array.isArray(project.thematic_area) && project.thematic_area.length > 0),
  );

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
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={project.category === "humanitarian" ? "ocean" : "green"} className="capitalize">
              {project.category}
            </Badge>
            {imported ? <Badge variant="outline">Published to IATI</Badge> : null}
            {project.status !== "approved" && user ? (
              <Badge variant={project.status === "rejected" ? "rose" : "amber"} className="capitalize">
                {project.status === "pending" ? "Waiting for review" : project.status}
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-soltas-text sm:text-4xl">{project.name}</h1>

          {leadOrganisation?.name || locationLabel ? (
            <p className="mt-2 text-[15px] text-soltas-muted">
              {imported ? (
                <>
                  by <span className="font-medium text-soltas-text">{publisher ?? "the publisher"}</span> via{" "}
                  {leadOrganisation ? (
                    <Link className="font-medium text-soltas-ocean hover:underline" href={`/organisations/${leadOrganisation.id}`}>
                      IATI
                    </Link>
                  ) : (
                    "IATI"
                  )}
                </>
              ) : leadOrganisation?.name ? (
                <>
                  by{" "}
                  <Link className="font-medium text-soltas-ocean hover:underline" href={`/organisations/${leadOrganisation.id}`}>
                    {leadOrganisation.name}
                  </Link>
                </>
              ) : null}
              {leadOrganisation?.name && locationLabel ? <span aria-hidden="true"> · </span> : null}
              {locationLabel}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/projects/${slug}/edit`} className={buttonClasses({ size: "sm" })}>
                Edit
              </Link>
              <Link href={`/projects/${slug}/edit#sharing`} className={buttonClasses({ variant: "outline", size: "sm" })}>
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

      {/* Key facts */}
      {showRaised || budget || project.lives_improved != null || start || end ? (
        <section aria-label="Key facts" className="grid gap-3 sm:grid-cols-3">
          {budget ? (
            <div className="card p-5">
              <p className="text-xs font-medium text-soltas-muted">Budget</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-soltas-text">{budget}</p>
            </div>
          ) : null}
          {showRaised ? (
            <div className="card p-5">
              <p className="text-xs font-medium text-soltas-muted">Raised</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-soltas-text">{donations ?? "—"}</p>
              {target ? (
                <>
                  <div
                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-soltas-light"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                    aria-label="Funding progress"
                  >
                    <div className="h-full rounded-full bg-soltas-green" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-soltas-muted">
                    {progress}% of {needed}
                  </p>
                </>
              ) : null}
            </div>
          ) : null}
          {project.lives_improved != null ? (
            <div className="card p-5">
              <p className="text-xs font-medium text-soltas-muted">Lives improved</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-soltas-text">
                {Number(project.lives_improved).toLocaleString()}
              </p>
            </div>
          ) : null}
          {start || end ? (
            <div className="card p-5">
              <p className="text-xs font-medium text-soltas-muted">Timeline</p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-soltas-text">
                {start ?? "—"} – {end ?? "ongoing"}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {project.description ? (
        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">About this project</h2>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-soltas-text">{project.description}</p>
        </section>
      ) : null}

      {imported && project.iati_identifier ? (
        <ImportedProjectDetails data={sourceData} iatiIdentifier={project.iati_identifier} updatedAt={project.source_updated_at} />
      ) : null}

      {project.status === "approved" ? <SupportCard projectName={project.name} /> : null}

      <UpdatesSectionWithSocial
        updates={updates}
        isAuthenticated={Boolean(user)}
        canPost={Boolean(canEdit)}
        projectId={project.id}
      />

      {hasDetails ? (
      <section className="card p-6">
        <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Details</h2>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {project.type_of_intervention?.length ? (
            <div>
              <dt className="text-xs font-medium text-soltas-muted">
                Type of intervention
              </dt>
              <dd className="text-sm text-soltas-text">
                {project.type_of_intervention.join(", ")}
              </dd>
            </div>
          ) : null}

          {project.target_demographics?.length ? (
            <div>
              <dt className="text-xs font-medium text-soltas-muted">
                Target demographics
              </dt>
              <dd className="text-sm text-soltas-text">
                {project.target_demographics.join(", ")}
              </dd>
            </div>
          ) : project.target_demographic ? (
            <div>
              <dt className="text-xs font-medium text-soltas-muted">
                Target demographic
              </dt>
              <dd className="text-sm text-soltas-text">{project.target_demographic}</dd>
            </div>
          ) : null}

          {Array.isArray(project.thematic_area) && project.thematic_area.length > 0 ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs font-medium text-soltas-muted">
                Thematic areas
              </dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {(project.thematic_area as string[]).map((item: string) => (
                  <span
                    key={item}
                    className="rounded-full border border-soltas-line bg-white px-2 py-0.5 text-xs font-medium text-soltas-text"
                  >
                    {item}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>
      ) : null}

      {normalizedLinks.length > 0 ? (
      <section className="card p-6">
        <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Links</h2>

        {(
          <ul className="mt-3 space-y-2">
            {normalizedLinks.map((l, idx) => (
              <li
                key={`${l.url}-${idx}`}
                className="flex flex-col gap-1 rounded-xl bg-soltas-off-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-soltas-text">
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
      ) : null}

      {(projectMedia?.length ?? 0) > 0 ? (
      <section className="card p-6">
        <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Media</h2>

        {(
          <ul className="mt-3 space-y-2">
            {(projectMedia ?? []).map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 rounded-xl bg-soltas-off-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-soltas-text">
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
      ) : null}
    </main>
  );
}
