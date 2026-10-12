import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { segmentClass, segmentedTrack } from "@/components/ui/segmented";
import Image from "next/image";
import Link from "next/link";

import { FeedItemCard } from "@/components/feed/FeedItemCard";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { NewPostComposer } from "@/components/feed/NewPostComposer";
import { getServerSupabase } from "@/lib/supabaseServer";
import type { Database } from "@/lib/database.types";

const PAGE_SIZE = 30;

type FeedItem = {
  id: string;
  event_type: string;
  actor_user_id: string | null;
  project_id: string | null;
  org_id: string | null;
  person_profile_id: string | null;
  update_id: string | null;
  created_at: string | null;
  title: string | null;
  summary: string | null;
};

type ProfileSummary = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

type ProjectSummary = { id: string; name: string | null; slug: string | null };

type OrganisationSummary = { id: string; name: string | null };

type FeedPost = Database["public"]["Tables"]["feed_posts"]["Row"];

type FeedPostAttachment = {
  id: string;
  file_path: string;
  mime_type: string;
};

type FeedPostWithAttachments = FeedPost & {
  feed_post_attachments?: FeedPostAttachment[];
};

type Organisation = {
  id: string;
  name: string | null;
};

function getProfileName(profile: ProfileSummary | null) {
  if (!profile) return "Someone";
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  return fullName || "Someone";
}

const FEED_TABS = [
  { key: "popular", label: "Popular" },
  { key: "following", label: "Following" },
  { key: "watchdog", label: "Watchdog" },
  { key: "funding", label: "Funding" },
] as const;

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const cursorParam = Array.isArray(params.cursor) ? params.cursor[0] : params.cursor;

  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  // Determine active tab early - default to popular if logged out, following if logged in
  type TabValue = "popular" | "following" | "watchdog" | "funding";
  const validTabs: TabValue[] = ["popular", "following", "watchdog", "funding"];
  const tabValue = validTabs.includes(tabParam as TabValue) ? (tabParam as TabValue) : null;
  const activeTab: TabValue = tabValue ?? (user ? "following" : "popular");

  // Fetch feed posts ordered by published_at desc
  // On "Following" tab: show posts from followed users/orgs (public + followers-only via RLS)
  // On other tabs: show only public posts from everyone
  let feedPostsQuery = supabase
    .from("feed_posts")
    .select("*, feed_post_attachments(id, file_path, mime_type)")
    .order("published_at", { ascending: false })
    .limit(50);

  if (activeTab === "following" && user) {
    // For following tab: fetch posts from followed users/orgs
    // RLS will automatically filter based on visibility and follows
    // We need to get the list of followed user IDs and org IDs
    const { data: followedEdges } = await supabase
      .from("follow_edges")
      .select("target_type,target_person_id,target_org_id")
      .eq("follower_user_id", user.id)
      .in("target_type", ["person", "org"]);

    const followedUserIds = (followedEdges ?? [])
      .filter((e) => e.target_type === "person" && e.target_person_id)
      .map((e) => e.target_person_id!);

    const followedOrgIds = (followedEdges ?? [])
      .filter((e) => e.target_type === "org" && e.target_org_id)
      .map((e) => e.target_org_id!);

    // Only show posts from followed users/orgs
    // We use an OR condition: either created_by is in followedUserIds OR author_organisation_id is in followedOrgIds
    if (followedUserIds.length > 0 || followedOrgIds.length > 0) {
      feedPostsQuery = feedPostsQuery.or(
        [
          followedUserIds.length > 0 ? `and(created_by.in.(${followedUserIds.join(",")}),author_organisation_id.is.null)` : null,
          followedOrgIds.length > 0 ? `author_organisation_id.in.(${followedOrgIds.join(",")})` : null,
        ]
          .filter(Boolean)
          .join(",")
      );
    } else {
      // No follows, return empty
      feedPostsQuery = feedPostsQuery.eq("id", "00000000-0000-0000-0000-000000000000"); // impossible condition
    }
  } else {
    // For other tabs: only show public posts
    feedPostsQuery = feedPostsQuery.eq("visibility", "public");
  }

  const { data: feedPosts } = await feedPostsQuery;

  // Fetch user's organisations if logged in
  let userOrganisations: Organisation[] = [];
  let userOrgIds: Set<string> = new Set();
  let userProfile: ProfileSummary | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,avatar_url")
      .eq("id", user.id)
      .single();

    userProfile = profile ?? null;

    const { data: orgMemberships } = await supabase
      .from("organisation_members")
      .select("organisation_id,organisations(id,name)")
      .eq("user_id", user.id)
      .in("role", ["owner", "admin"]);

    if (orgMemberships) {
      userOrganisations = orgMemberships
        .map((membership: { organisation_id: string; organisations: unknown }) => {
          const org = membership.organisations as unknown;
          if (org && typeof org === "object" && "id" in org && "name" in org) {
            return {
              id: org.id as string,
              name: org.name as string | null,
            };
          }
          return null;
        })
        .filter((org: Organisation | null): org is Organisation => org !== null);

      // Store org IDs for permission checking
      userOrgIds = new Set(userOrganisations.map(org => org.id));
    }
  }

  // Map tabs to RPC scopes
  let scope: "global" | "for_you" | "watchdog" | "funding";

  if (activeTab === "following") {
    scope = "for_you";
  } else if (activeTab === "popular") {
    scope = "global";
  } else if (activeTab === "watchdog") {
    scope = "watchdog";
  } else if (activeTab === "funding") {
    scope = "funding";
  } else {
    scope = "global";
  }

  const [cursorCreatedAt, cursorId] = cursorParam?.split("|") ?? [];

  const { data: feedItems, error: feedError } = await supabase.rpc("get_activity_feed_items", {
    scope,
    cursor_created_at: cursorCreatedAt ?? null,
    cursor_id: cursorId ?? null,
    page_size: PAGE_SIZE,
  });

  if (feedError) {
    throw new Error(feedError.message ?? "Unable to load feed.");
  }

  const items = (feedItems ?? []) as FeedItem[];

  // Prepare feed posts data
  const posts = feedPosts ?? [];

  // Collect IDs for batch fetching
  const postAuthorIds = new Set<string>();
  const postOrgIds = new Set<string>();
  const postEntityIds = new Map<string, Set<string>>(); // entity_type -> Set of entity_ids

  posts.forEach((post: FeedPost) => {
    postAuthorIds.add(post.created_by);
    if (post.author_organisation_id) {
      postOrgIds.add(post.author_organisation_id);
    }
    if (post.entity_type && post.entity_id) {
      if (!postEntityIds.has(post.entity_type)) {
        postEntityIds.set(post.entity_type, new Set());
      }
      postEntityIds.get(post.entity_type)!.add(post.entity_id);
    }
  });

  // Fetch profiles for post authors
  const postAuthorsPromise = postAuthorIds.size
    ? supabase
        .from("profiles")
        .select("id,first_name,last_name,avatar_url")
        .in("id", Array.from(postAuthorIds))
    : Promise.resolve({ data: [] as ProfileSummary[] });

  // Fetch organisations for posts
  const postOrgsPromise = postOrgIds.size
    ? supabase.from("organisations").select("id,name").in("id", Array.from(postOrgIds))
    : Promise.resolve({ data: [] as OrganisationSummary[] });

  // Fetch projects for entity links
  const projectIdsForPosts = postEntityIds.get("project");
  const postProjectsPromise = projectIdsForPosts && projectIdsForPosts.size
    ? supabase.from("projects").select("id,name,slug").in("id", Array.from(projectIdsForPosts))
    : Promise.resolve({ data: [] as ProjectSummary[] });

  // Fetch grants for entity links
  const fundingIdsForPosts = postEntityIds.get("funding");
  const postGrantsPromise = fundingIdsForPosts && fundingIdsForPosts.size
    ? supabase.from("grants").select("id,title,slug").in("id", Array.from(fundingIdsForPosts))
    : Promise.resolve({ data: [] as Array<{ id: string; title: string | null; slug: string | null }> });

  const [postAuthorsResult, postOrgsResult, postProjectsResult, postGrantsResult] = await Promise.all([
    postAuthorsPromise,
    postOrgsPromise,
    postProjectsPromise,
    postGrantsPromise,
  ]);

  const postAuthorsMap = new Map((postAuthorsResult.data ?? []).map((p: ProfileSummary) => [p.id, p]));
  const postOrgsMap = new Map((postOrgsResult.data ?? []).map((o: OrganisationSummary) => [o.id, o]));
  const postProjectsMap = new Map((postProjectsResult.data ?? []).map((p: ProjectSummary) => [p.id, p]));
  const postGrantsMap = new Map((postGrantsResult.data ?? []).map((g: { id: string; title: string | null; slug: string | null }) => [g.id, g]));

  const actorIds = new Set<string>();
  const personIds = new Set<string>();
  const projectIds = new Set<string>();
  const orgIds = new Set<string>();

  items.forEach((item) => {
    if (item.actor_user_id) actorIds.add(item.actor_user_id);
    if (item.person_profile_id) personIds.add(item.person_profile_id);
    if (item.project_id) projectIds.add(item.project_id);
    if (item.org_id) orgIds.add(item.org_id);
  });

  const profileIds = Array.from(new Set([...actorIds, ...personIds]));

  const profilesPromise = profileIds.length
    ? supabase
        .from("profiles")
        .select("id,first_name,last_name,avatar_url")
        .in("id", profileIds)
    : Promise.resolve({ data: [] as ProfileSummary[] });

  const projectsPromise = projectIds.size
    ? supabase.from("projects").select("id,name,slug").in("id", Array.from(projectIds))
    : Promise.resolve({ data: [] as ProjectSummary[] });

  const organisationsPromise = orgIds.size
    ? supabase.from("organisations").select("id,name").in("id", Array.from(orgIds))
    : Promise.resolve({ data: [] as OrganisationSummary[] });

  const [profilesResult, projectsResult, organisationsResult] = await Promise.all([
    profilesPromise,
    projectsPromise,
    organisationsPromise,
  ]);

  const profilesMap = new Map((profilesResult.data ?? []).map((profile: ProfileSummary) => [profile.id, profile]));
  const projectsMap = new Map((projectsResult.data ?? []).map((project: ProjectSummary) => [project.id, project]));
  const organisationsMap = new Map(
    (organisationsResult.data ?? []).map((org: OrganisationSummary) => [org.id, org])
  );

  const hasMore = items.length === PAGE_SIZE;
  const lastItem = items[items.length - 1];
  const nextCursor = lastItem ? `${lastItem.created_at}|${lastItem.id}` : null;

  const nextParams = new URLSearchParams();
  nextParams.set("tab", activeTab);
  if (nextCursor) nextParams.set("cursor", nextCursor);

  const { data: discoverPeople } = await supabase
    .from("profiles")
    .select("id,first_name,last_name,avatar_url")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: discoverOrgs } = await supabase
    .from("organisations")
    .select("id,name")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: discoverProjects } = await supabase
    .from("projects")
    .select("id,name,slug")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:space-y-8 sm:py-10">
      <PageHeader title="Feed" description="Updates and stories from the projects, organisations and people you follow." />
      <nav aria-label="Feed views" className={`${segmentedTrack} flex w-full sm:w-auto`}>
        {FEED_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/feed?tab=${tab.key}`}
            aria-current={activeTab === tab.key ? "page" : undefined}
            className={cn(segmentClass(activeTab === tab.key), "min-w-0 flex-1 px-2 sm:flex-none sm:px-4")}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {user && userProfile && (
        <NewPostComposer
          userId={user.id}
          userName={getProfileName(userProfile)}
          organisations={userOrganisations}
        />
      )}

      {posts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">
            Recent posts
          </h2>
          {posts.map((post: FeedPost) => {
            const author = postAuthorsMap.get(post.created_by) ?? null;
            const authorOrg = post.author_organisation_id
              ? postOrgsMap.get(post.author_organisation_id) ?? null
              : null;

            const authorName = authorOrg
              ? authorOrg.name || "Unnamed organisation"
              : getProfileName(author);

            const authorAvatarUrl = !authorOrg ? author?.avatar_url : null;

            let entitySlug: string | null = null;
            let entityName: string | null = null;

            if (post.entity_type === "project" && post.entity_id) {
              const project = postProjectsMap.get(post.entity_id);
              entitySlug = project?.slug ?? null;
              entityName = project?.name ?? null;
            } else if (post.entity_type === "funding" && post.entity_id) {
              const grant = postGrantsMap.get(post.entity_id);
              entitySlug = grant?.slug ?? null;
              entityName = grant?.title ?? null;
            }

            // Determine if user can edit this post
            const canEdit = user ? (
              post.created_by === user.id && (
                post.author_organisation_id === null ||
                userOrgIds.has(post.author_organisation_id)
              )
            ) : false;

            return (
              <FeedPostCard
                key={post.id}
                id={post.id}
                authorName={authorName}
                authorAvatarUrl={authorAvatarUrl}
                content={post.content}
                timestamp={post.published_at}
                entityType={post.entity_type}
                entityId={post.entity_id}
                entitySlug={entitySlug}
                entityName={entityName}
                canEdit={canEdit}
                attachments={(post as FeedPostWithAttachments).feed_post_attachments ?? []}
              />
            );
          })}
        </section>
      )}

      {activeTab === "following" && !user ? (
        <EmptyState
          title="See what the people and projects you follow are up to"
          description="Log in to see updates from the projects, organisations and people you follow."
          action={
            <Link href="/login?returnTo=/feed?tab=following" className={buttonClasses()}>
              Log in
            </Link>
          }
        />
      ) : items.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">
            Activity updates
          </h2>
          {items.map((item) => {
            const actor = profilesMap.get(item.actor_user_id ?? "") ?? null;
            const actorName = getProfileName(actor);

            // ✅ FIX: ensure this is ProfileSummary | null (never undefined)
            const targetPerson: ProfileSummary | null = item.person_profile_id
              ? profilesMap.get(item.person_profile_id) ?? null
              : null;

            const project = item.project_id ? projectsMap.get(item.project_id) : null;
            const organisation = item.org_id ? organisationsMap.get(item.org_id) : null;

            let title = "Activity";
            let href: string | null = null;

            if (item.event_type === "project_update") {
              const projectName = project?.name ?? "a project";
              title = `${projectName} · ${item.title ?? "Project update"}`;
              href = `/projects/${project?.slug ?? item.project_id}`;
            } else if (item.event_type === "org_update") {
              const orgName = organisation?.name ?? "an organisation";
              title = `${orgName} · ${item.title ?? "Organisation update"}`;
              href = `/organisations/${item.org_id}`;
            } else if (item.event_type === "watchdog_update") {
              title = item.title ?? "Watchdog issue reported";
              href = `/watchdog/${item.update_id ?? item.id}`;
            } else if (item.event_type === "grant_published") {
              // Use title/summary from RPC if available, otherwise show minimal fallback
              title = item.title ?? "New funding opportunity";
              href = item.update_id ? `/funding/${item.update_id}` : null;
            } else if (item.event_type === "follow") {
              if (item.person_profile_id) {
                title = `${actorName} followed ${getProfileName(targetPerson)}`;
                href = `/people/${item.person_profile_id}`;
              } else if (item.org_id) {
                title = `${actorName} followed ${organisation?.name ?? "an organisation"}`;
                href = `/organisations/${item.org_id}`;
              } else if (item.project_id) {
                title = `${actorName} followed ${project?.name ?? "a project"}`;
                href = `/projects/${project?.slug ?? item.project_id}`;
              }
            }

            return (
              <FeedItemCard
                key={item.id}
                title={title}
                summary={item.summary}
                href={href}
                timestamp={item.created_at}
                actorAvatarUrl={actor?.avatar_url}
                actorName={actorName}
                eventType={item.event_type}
              />
            );
          })}

          {hasMore && nextCursor ? (
            <div className="pt-2">
              <Link
                href={`/feed?${nextParams.toString()}`}
                className="inline-flex items-center justify-center rounded-lg border border-soltas-line bg-white px-4 py-2 text-sm font-medium text-soltas-text hover:bg-soltas-off-white"
              >
                Load more
              </Link>
            </div>
          ) : null}
        </section>
      ) : (
        <div className="rounded-2xl border border-soltas-line bg-white p-6 text-sm text-soltas-muted">
          {activeTab === "popular" && "No activity yet"}
          {activeTab === "following" && "Follow projects, organisations, or people to personalize your feed"}
          {activeTab === "watchdog" && "No verified watchdog items yet"}
          {activeTab === "funding" && "No new funding opportunities posted yet"}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-soltas-line bg-white p-5">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">
            Discover people
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-soltas-text">
            {(discoverPeople ?? []).map((person) => (
              <li key={person.id} className="flex items-center gap-3">
                {person.avatar_url ? (
                  <Image
                    src={person.avatar_url}
                    alt={getProfileName(person)}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full border border-soltas-line object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-soltas-line bg-soltas-off-white text-xs text-soltas-muted">
                    —
                  </div>
                )}
                <Link href={`/people/${person.id}`} className="hover:underline">
                  {getProfileName(person)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-soltas-line bg-white p-5">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">
            Discover organisations
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-soltas-text">
            {(discoverOrgs ?? []).map((org) => (
              <li key={org.id}>
                <Link href={`/organisations/${org.id}`} className="hover:underline">
                  {org.name ?? "Unnamed organisation"}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-soltas-line bg-white p-5">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">
            Discover projects
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-soltas-text">
            {(discoverProjects ?? []).map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.slug ?? project.id}`}
                  className="hover:underline"
                >
                  {project.name ?? "Untitled project"}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
