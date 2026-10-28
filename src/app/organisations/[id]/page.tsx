import { BadgeCheck, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { organisationMetadata } from "@/lib/pageMetadata";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import FollowButton from "@/components/FollowButton";
import { buttonClasses } from "@/components/ui/button";
import { SocialLinks } from "@/components/profiles/SocialLinks";
import OrganisationUpdateForm from "@/components/organisations/OrganisationUpdateForm";
import UpdatesSection, { type UpdateSummary } from "@/components/updates/UpdatesSection";
import { plural } from "@/lib/plural";
import { getServerSupabase } from "@/lib/supabaseServer";
import { IATI_ORG_ID } from "@/lib/iati/systemOrg";
import type { Database } from "@/lib/database.types";

type OrganisationRow = Database["public"]["Tables"]["organisations"]["Row"];

/** Columns added in migration 20260324120019 (typed here until the generated types catch up). */
type TrustFields = {
  legal_form: string | null;
  registration_number: string | null;
  registration_country: string | null;
  founded_year: number | null;
  annual_report_url: string | null;
  contact_email: string | null;
  looking_for: string[] | null;
};

const LOOKING_FOR_LABELS: Record<string, string> = {
  funding: "Funding",
  partners: "Partner organisations",
  volunteers: "Volunteers",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return organisationMetadata(id);
}

export default async function OrganisationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const showSavedMessage = search.saved === "true";

  // The IATI system organisation only owns imported projects; it has no page.
  if (!id || typeof id !== "string" || id === IATI_ORG_ID) notFound();

  const supabase = await getServerSupabase();

  const { data: organisationRow, error } = await supabase
    .from("organisations")
    .select(
      "id,name,country_based,what_we_do,existing_since,website,social_links,logo_url,created_at,created_by,verification_status," +
        "legal_form,registration_number,registration_country,founded_year,annual_report_url,contact_email,looking_for",
    )
    .eq("id", id)
    .single();

  if (!organisationRow) {
    notFound();
  }

  if (error) {
    throw new Error("Unable to load organisation.");
  }
  const organisation = organisationRow as unknown as Pick<
    OrganisationRow,
    | "id"
    | "name"
    | "country_based"
    | "what_we_do"
    | "existing_since"
    | "website"
    | "social_links"
    | "logo_url"
    | "created_at"
    | "created_by"
    | "verification_status"
  > &
    TrustFields;

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  const { data: isAdmin } = await supabase.rpc("is_admin");

  // The viewer's membership: owners and admins edit; they and members with posting rights publish updates.
  const { data: userMembership } = user
    ? await supabase
        .from("organisation_members")
        .select("role,can_post_feed")
        .eq("organisation_id", organisation.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const isOrgAdmin = userMembership?.role === "admin" || userMembership?.role === "owner";
  const canEdit = Boolean(user && (organisation.created_by === user.id || isOrgAdmin || isAdmin));
  const canPost = Boolean(user && (isOrgAdmin || userMembership?.can_post_feed));

  const { count: followerCount, error: followerCountError } = await supabase
    .from("follow_edges")
    .select("id", { count: "exact", head: true })
    .eq("target_type", "org")
    .eq("target_org_id", organisation.id);

  const { data: followEdge, error: followEdgeError } = user
    ? await supabase
        .from("follow_edges")
        .select("id")
        .eq("target_type", "org")
        .eq("target_org_id", organisation.id)
        .eq("follower_user_id", user.id)
        .maybeSingle()
    : { data: null, error: null };

  const { count: memberCount, error: memberError } = await supabase
    .from("organisation_members")
    .select("user_id", { count: "exact", head: true })
    .eq("organisation_id", organisation.id);

  // Public, approved projects this organisation leads or owns, newest first, plus the counts (the list is capped).
  const ownOrLead = `lead_org_id.eq.${organisation.id},and(owner_type.eq.organisation,owner_id.eq.${organisation.id})`;
  const listedProjects = () =>
    supabase.from("projects").select("id", { count: "exact", head: true }).or(ownOrLead).eq("status", "approved").eq("visibility", "public");
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: orgProjects, error: projectError }, { count: projectCount }, { count: ongoingCount }, { data: partnerRows }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id,slug,name,category,place_name,country,description,end_date")
        .or(ownOrLead)
        .eq("status", "approved")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(12),
      listedProjects(),
      listedProjects().or(`end_date.is.null,end_date.gte.${today}`),
      // Projects where this organisation is a partner (RLS shows only what the viewer may see)
      supabase.from("project_partners").select("projects(id,slug,name,category,status,visibility)").eq("organisation_id", organisation.id).limit(12),
    ]);
  const partnerProjects = ((partnerRows ?? []) as unknown as {
    projects: { id: string; slug: string | null; name: string; category: string; status: string; visibility: string | null } | null;
  }[])
    .map((row) => row.projects)
    .filter((p): p is NonNullable<typeof p> => Boolean(p && p.status === "approved" && (p.visibility ?? "public") === "public"));

  const resolvedMemberCount = memberError ? null : memberCount ?? 0;
  const resolvedProjectCount = projectError ? null : projectCount ?? 0;
  const finishedCount = Math.max(0, (projectCount ?? 0) - (ongoingCount ?? 0));
  const lookingFor = (organisation.looking_for ?? []).map((key) => LOOKING_FOR_LABELS[key]).filter(Boolean);
  const founded = organisation.founded_year ?? organisation.existing_since;
  const resolvedFollowerCount = followerCountError ? null : followerCount ?? 0;
  const isFollowing = Boolean(followEdge && !followEdgeError);
  const isVerified = organisation.verification_status === "verified";
  const isPending = organisation.verification_status === "pending";
  const isRejected = organisation.verification_status === "rejected";

  // Fetch organisation updates
  const { data: organisationUpdates } = await supabase
    .from("organisation_updates")
    .select("id,organisation_id,author_user_id,title,body,visibility,published_at,created_at")
    .eq("organisation_id", organisation.id)
    .eq("visibility", "public")
    .order("published_at", { ascending: false })
    .limit(20);

  // Map organisation_updates to UpdateSummary format
  const updates: UpdateSummary[] = (organisationUpdates ?? []).map(
    (update: { id: string; title: string; body: string; published_at: string }) => ({
      id: update.id,
      title: update.title,
      summary: update.body,
      created_at: update.published_at,
    }),
  );

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:py-10">
      <Breadcrumbs
        items={[
          { label: "Organisations", href: "/find-organisations" },
          { label: organisation.name },
        ]}
      />

      {isPending && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div className="flex-1">
              <strong className="block text-sm font-semibold text-amber-900">Pending verification</strong>
              <p className="mt-1 text-sm text-amber-800">
                This organisation is pending verification. Once verified, it will be able to create projects, funding, and posts.
              </p>
            </div>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
            <div className="flex-1">
              <strong className="block text-sm font-semibold text-red-900">Verification rejected</strong>
              <p className="mt-1 text-sm text-red-800">
                This organisation&apos;s verification was rejected. Please contact support for more information.
              </p>
            </div>
          </div>
        </div>
      )}

      {showSavedMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <strong className="font-semibold">Changes saved!</strong> Your organisation profile has been
          updated successfully.
        </div>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {organisation.logo_url ? (
            <Image
              src={organisation.logo_url}
              alt={organisation.name}
              width={80}
              height={80}
              className="h-14 w-14 rounded-2xl border border-soltas-line object-cover sm:h-20 sm:w-20"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-soltas-ocean/10 text-xl font-semibold text-soltas-ocean sm:h-20 sm:w-20 sm:text-2xl"
            >
              {organisation.name.trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-soltas-text sm:text-4xl">
                {organisation.name}
              </h1>
              {isVerified ? (
                <Badge variant="ocean">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-soltas-muted">
              On Solarpunk Taskforce since {formatDate(organisation.created_at)}
            </p>
            {organisation.country_based ? (
              <p className="mt-1 text-sm text-soltas-muted">Based in {organisation.country_based}</p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/organisations/${organisation.id}/edit`} className={buttonClasses({ size: "sm" })}>
                Edit
              </Link>
              {isOrgAdmin || isAdmin ? (
                <Link
                  href={`/organisations/${organisation.id}/members`}
                  className={buttonClasses({ variant: "outline", size: "sm" })}
                >
                  Members
                </Link>
              ) : null}
            </div>
          ) : null}
          <FollowButton
            targetType="org"
            targetId={organisation.id}
            initialIsFollowing={isFollowing}
            initialFollowerCount={resolvedFollowerCount}
            isAuthenticated={Boolean(user)}
          />
        </div>
      </header>

      {/* Key figures: what funders and partners look at first */}
      <section aria-label="Key figures" className="grid gap-3 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-medium text-soltas-muted">Ongoing projects</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-soltas-text">{(ongoingCount ?? 0).toLocaleString()}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-soltas-muted">Finished projects</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-soltas-text">{finishedCount.toLocaleString()}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-soltas-muted">Followers</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-soltas-text">{(resolvedFollowerCount ?? 0).toLocaleString()}</p>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold tracking-tight text-soltas-text">What we do</h2>
        {organisation.what_we_do ? (
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-soltas-text">{organisation.what_we_do}</p>
        ) : (
          <p className="mt-3 text-sm text-soltas-muted">
            {canEdit ? "Not written yet. Tell visitors what you do and where; it is the first thing they read." : "Not reported yet."}
          </p>
        )}
        {lookingFor.length ? (
          <div className="mt-5">
            <p className="text-xs font-medium text-soltas-muted">Looking for</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {lookingFor.map((label) => (
                <li key={label} className="rounded-full bg-soltas-ocean/10 px-3 py-1 text-xs font-medium text-soltas-ocean">
                  {label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Organisation details</h2>
          <p className="text-xs text-soltas-muted">Self-reported{isVerified ? ", identity verified by Solarpunk Taskforce" : ""}</p>
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-soltas-muted">Legal form</dt>
            <dd className="mt-1 text-sm text-soltas-text">
              {organisation.legal_form || <span className="text-soltas-muted">Not reported yet</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-soltas-muted">Registration number</dt>
            <dd className="mt-1 text-sm text-soltas-text">
              {organisation.registration_number ? (
                <>
                  {organisation.registration_number}
                  {organisation.registration_country ? (
                    <span className="text-soltas-muted"> · {organisation.registration_country}</span>
                  ) : null}
                </>
              ) : (
                <span className="text-soltas-muted">Not reported yet</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-soltas-muted">Based in</dt>
            <dd className="mt-1 text-sm text-soltas-text">
              {organisation.country_based || <span className="text-soltas-muted">Not reported yet</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-soltas-muted">Founded</dt>
            <dd className="mt-1 text-sm text-soltas-text">
              {founded || <span className="text-soltas-muted">Not reported yet</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-soltas-muted">Annual report</dt>
            <dd className="mt-1 text-sm text-soltas-text">
              {organisation.annual_report_url ? (
                <a
                  href={organisation.annual_report_url}
                  className="font-medium text-soltas-ocean hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open the latest report ↗
                </a>
              ) : (
                <span className="text-soltas-muted">Not published yet</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-soltas-muted">Contact</dt>
            <dd className="mt-1 text-sm text-soltas-text">
              {organisation.contact_email ? (
                <a href={`mailto:${organisation.contact_email}`} className="font-medium text-soltas-ocean hover:underline">
                  {organisation.contact_email}
                </a>
              ) : (
                <span className="text-soltas-muted">Not reported yet</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-soltas-muted">Website</dt>
            <dd className="mt-1 text-sm text-soltas-text">
              {organisation.website ? (
                <Link
                  href={organisation.website}
                  className="font-medium text-soltas-ocean hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {organisation.website}
                </Link>
              ) : (
                <span className="text-soltas-muted">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-soltas-muted">
              Social links
            </dt>
            <dd className="mt-2">
              <SocialLinks links={organisation.social_links} />
            </dd>
          </div>
        </dl>
      </section>

      <section className="card p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Projects</h2>
          <p className="text-sm text-soltas-muted">
            {[
              resolvedProjectCount != null ? plural(resolvedProjectCount, "project") : null,
              resolvedMemberCount ? plural(resolvedMemberCount, "member") : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {orgProjects && orgProjects.length > 0 ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {orgProjects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.slug ?? project.id}`}
                  className="flex h-full flex-col rounded-2xl border border-soltas-line p-4 transition-colors hover:bg-soltas-off-white"
                >
                  <span className="flex items-center gap-2">
                    {project.category ? (
                      <Badge variant={project.category === "humanitarian" ? "ocean" : "green"} className="capitalize">
                        {project.category}
                      </Badge>
                    ) : null}
                    {project.place_name || project.country ? (
                      <span className="truncate text-xs text-soltas-muted">{project.place_name || project.country}</span>
                    ) : null}
                  </span>
                  <span className="mt-2 font-medium text-soltas-text">{project.name}</span>
                  {project.description ? (
                    <span className="mt-1 line-clamp-2 text-sm text-soltas-muted">{project.description}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-soltas-muted">
            {canEdit ? (
              <>
                No public projects yet.{" "}
                <Link href="/projects/new" className="font-medium text-soltas-ocean hover:underline">
                  Add your first project
                </Link>
                .
              </>
            ) : (
              "No public projects yet."
            )}
          </p>
        )}
        {(resolvedProjectCount ?? 0) > (orgProjects?.length ?? 0) ? (
          <p className="mt-4 text-sm text-soltas-muted">Showing the {orgProjects?.length ?? 0} newest.</p>
        ) : null}
      </section>

      {partnerProjects.length ? (
        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Projects as a partner</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {partnerProjects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.slug ?? project.id}`}
                  className="flex h-full flex-col rounded-2xl border border-soltas-line p-4 transition-colors hover:bg-soltas-off-white"
                >
                  <Badge variant={project.category === "humanitarian" ? "ocean" : "green"} className="w-fit capitalize">
                    {project.category}
                  </Badge>
                  <span className="mt-2 font-medium text-soltas-text">{project.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        {canPost ? <OrganisationUpdateForm organisationId={organisation.id} /> : null}
        <UpdatesSection updates={updates} isAuthenticated={Boolean(user)} canPost={canPost} />
      </section>
    </main>
  );
}
