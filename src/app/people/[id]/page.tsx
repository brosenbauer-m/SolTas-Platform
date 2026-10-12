import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import FollowButton from "@/components/FollowButton";
import { SocialLinks } from "@/components/profiles/SocialLinks";
import { getServerSupabase } from "@/lib/supabaseServer";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
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

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10">
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
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-soltas-line bg-soltas-off-white text-sm text-soltas-muted">
              —
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-soltas-text">
              {name || "Unnamed profile"}
            </h1>
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
            ) : (
              <p className="mt-1 text-sm text-soltas-muted">Organisation: Independent</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          {isOwner ? (
            <Link
              href={`/people/${profile.id}/edit`}
              className="inline-flex items-center justify-center rounded-lg bg-soltas-ocean px-3 py-2 text-sm font-medium text-white hover:bg-soltas-abyssal"
            >
              Edit Profile
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
        <section className="rounded-2xl border border-soltas-line bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Bio</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-soltas-text">
            {profile.bio}
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-soltas-line bg-white p-5 shadow-sm">
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
    </main>
  );
}
