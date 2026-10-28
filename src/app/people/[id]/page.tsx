import { buttonClasses } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { personMetadata } from "@/lib/pageMetadata";

import FollowButton from "@/components/FollowButton";
import { SocialLinks } from "@/components/profiles/SocialLinks";
import { Badge } from "@/components/ui/badge";
import { getServerSupabase } from "@/lib/supabaseServer";
import { plural } from "@/lib/plural";
import { urgencyLabel } from "@/lib/watchdog/urgency";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return personMetadata(id);
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id || typeof id !== "string") notFound();

  const supabase = await getServerSupabase();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id,first_name,last_name,country_from,country_based,occupation,bio,avatar_url,social_links,created_at,organisation_id",
    )
    .eq("id", id)
    .single();

  if (!profile) {
    if (error) {
      throw new Error("Unable to load profile.");
    }
    notFound();
  }

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;
  const isOwner = user?.id === profile.id;

  const { count: followerCount, error: followerCountError } = await supabase
    .from("follow_edges")
    .select("id", { count: "exact", head: true })
    .eq("target_type", "person")
    .eq("target_person_id", profile.id);

  const { data: followEdge, error: followEdgeError } = user
    ? await supabase
        .from("follow_edges")
        .select("id")
        .eq("target_type", "person")
        .eq("target_person_id", profile.id)
        .eq("follower_user_id", user.id)
        .maybeSingle()
    : { data: null, error: null };

  const resolvedFollowerCount = followerCountError ? null : followerCount ?? 0;
  const isFollowing = Boolean(followEdge && !followEdgeError);

  let organisation: { id: string; name: string } | null = null;
  if (profile.organisation_id) {
    const { data: org } = await supabase
      .from("organisations")
      .select("id,name")
      .eq("id", profile.organisation_id)
      .maybeSingle();
    if (org) organisation = org;
  }

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");

  // Portfolio (blueprint): derived from what the person has done here, not self-claimed.
  const [{ data: ownProjects }, { data: ownIssues }, { data: followEdges }] = await Promise.all([
    supabase
      .from("projects")
      .select("id,slug,name,category,place_name,country")
      .or(`and(owner_type.eq.user,owner_id.eq.${profile.id}),created_by.eq.${profile.id}`)
      .eq("status", "approved")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("watchdog_issues")
      .select("id,title,city,country,urgency,created_at")
      .eq("created_by", profile.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("follow_edges")
      .select("target_type,target_project_id,target_org_id")
      .eq("follower_user_id", profile.id)
      .in("target_type", ["project", "org"])
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const followedProjectIds = (followEdges ?? []).map((e) => e.target_project_id).filter((v): v is string => Boolean(v));
  const followedOrgIds = (followEdges ?? []).map((e) => e.target_org_id).filter((v): v is string => Boolean(v));
  const [{ data: followedProjects }, { data: followedOrgs }] = await Promise.all([
    followedProjectIds.length
      ? supabase.from("projects").select("id,slug,name").in("id", followedProjectIds.slice(0, 12))
      : Promise.resolve({ data: [] as { id: string; slug: string | null; name: string }[] }),
    followedOrgIds.length
      ? supabase.from("organisations").select("id,name").in("id", followedOrgIds.slice(0, 12))
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  // Blueprint label: Organisation member, Watchdog (has raised a published issue), otherwise Independent.
  const label = organisation ? "Organisation" : (ownIssues?.length ?? 0) > 0 ? "Watchdog" : "Independent";

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={name || "Profile avatar"}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full border border-soltas-line object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-soltas-ocean/10 text-2xl font-semibold text-soltas-ocean"
            >
              {(name || "?")
                .split(/\s+/)
                .map((part) => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-soltas-text sm:text-4xl">
                {name || "Unnamed profile"}
              </h1>
              <Badge variant={label === "Watchdog" ? "amber" : label === "Organisation" ? "ocean" : "outline"}>{label}</Badge>
            </div>
            <p className="mt-1 text-sm text-soltas-muted">
              On Solarpunk Taskforce since {formatDate(profile.created_at)}
            </p>
            {organisation ? (
              <p className="mt-1 text-sm text-soltas-muted">
                Organisation:{" "}
                <Link
                  className="font-medium text-soltas-ocean hover:underline"
                  href={`/organisations/${organisation.id}`}
                >
                  {organisation.name}
                </Link>
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          {isOwner ? (
            <Link
              href={`/people/${profile.id}/edit`}
              className={buttonClasses({ variant: "outline", size: "sm" })}
            >
              Edit profile
            </Link>
          ) : (
            <FollowButton
              targetType="person"
              targetId={profile.id}
              initialIsFollowing={isFollowing}
              initialFollowerCount={resolvedFollowerCount}
              isAuthenticated={Boolean(user)}
            />
          )}
        </div>
      </header>

      {profile.bio ? (
        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Bio</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-soltas-text">
            {profile.bio}
          </p>
        </section>
      ) : null}

      <section className="card p-6">
        <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Details</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-soltas-muted">
              Country from
            </dt>
            <dd className="text-sm text-soltas-text">{profile.country_from ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-soltas-muted">
              Country based
            </dt>
            <dd className="text-sm text-soltas-text">{profile.country_based ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-soltas-muted">
              Occupation
            </dt>
            <dd className="text-sm text-soltas-text">{profile.occupation ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-soltas-muted">
              Followers
            </dt>
            <dd className="text-sm text-soltas-text">
              {resolvedFollowerCount === null ? "—" : resolvedFollowerCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-soltas-muted">
              Social links
            </dt>
            <dd className="mt-2">
              <SocialLinks links={profile.social_links} />
            </dd>
          </div>
        </dl>
      </section>

      <section className="card p-6" aria-labelledby="portfolio-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="portfolio-heading" className="text-lg font-semibold tracking-tight text-soltas-text">
            Portfolio
          </h2>
          <p className="text-sm text-soltas-muted">
            {[plural(ownProjects?.length ?? 0, "project"), plural(ownIssues?.length ?? 0, "issue raised", "issues raised")].join(" · ")}
          </p>
        </div>

        {(ownProjects?.length ?? 0) > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-medium text-soltas-muted">Projects</p>
            <ul className="mt-2 grid gap-3 sm:grid-cols-2">
              {(ownProjects ?? []).map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.slug ?? project.id}`}
                    className="flex h-full flex-col rounded-2xl border border-soltas-line p-4 transition-colors hover:bg-soltas-off-white"
                  >
                    <Badge variant={project.category === "humanitarian" ? "ocean" : "green"} className="w-fit capitalize">
                      {project.category}
                    </Badge>
                    <span className="mt-2 font-medium text-soltas-text">{project.name}</span>
                    {project.place_name || project.country ? (
                      <span className="mt-0.5 text-xs text-soltas-muted">
                        {[project.place_name, project.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(ownIssues?.length ?? 0) > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-medium text-soltas-muted">Issues raised</p>
            <ul className="mt-2 divide-y divide-soltas-line">
              {(ownIssues ?? []).map((issue) => (
                <li key={issue.id}>
                  <Link href={`/issues/${issue.id}`} className="flex min-h-11 items-center justify-between gap-3 py-2 hover:underline">
                    <span className="font-medium text-soltas-text">{issue.title}</span>
                    <span className="shrink-0 text-xs text-soltas-muted">
                      {[issue.city ?? issue.country, urgencyLabel(issue.urgency) ? `${urgencyLabel(issue.urgency)} urgency` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!(ownProjects?.length ?? 0) && !(ownIssues?.length ?? 0) ? (
          <p className="mt-3 text-sm text-soltas-muted">
            {isOwner ? (
              <>
                Nothing here yet. Projects you add and issues you raise appear here once they are published.{" "}
                <Link href="/projects/new" className="font-medium text-soltas-ocean hover:underline">
                  Add a project
                </Link>
                .
              </>
            ) : (
              "No published projects or issues yet."
            )}
          </p>
        ) : null}
      </section>

      {(followedProjects?.length ?? 0) + (followedOrgs?.length ?? 0) > 0 ? (
        <section className="card p-6" aria-labelledby="following-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="following-heading" className="text-lg font-semibold tracking-tight text-soltas-text">
              Following
            </h2>
            <p className="text-sm text-soltas-muted">
              {[
                followedProjectIds.length ? plural(followedProjectIds.length, "project") : null,
                followedOrgIds.length ? plural(followedOrgIds.length, "organisation") : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {(followedOrgs ?? []).map((org) => (
              <li key={org.id}>
                <Link href={`/organisations/${org.id}`} className="inline-flex min-h-9 items-center rounded-full bg-soltas-ocean/10 px-3 text-sm font-medium text-soltas-ocean hover:underline">
                  {org.name}
                </Link>
              </li>
            ))}
            {(followedProjects ?? []).map((project) => (
              <li key={project.id}>
                <Link href={`/projects/${project.slug ?? project.id}`} className="inline-flex min-h-9 items-center rounded-full border border-soltas-line bg-white px-3 text-sm font-medium text-soltas-text hover:bg-soltas-off-white">
                  {project.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
