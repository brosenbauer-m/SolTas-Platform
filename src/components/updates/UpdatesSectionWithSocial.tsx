import UpdateCardWithSocial from "./UpdateCardWithSocial";
import NewUpdateButton from "./NewUpdateButton";
import { getServerSupabase } from "@/lib/supabaseServer";

export type UpdateSummary = {
  id: string;
  title: string;
  summary: string;
  created_at: string;
  author_name?: string;
  href?: string;
  // "project" = visible to project members only
  visibility?: "public" | "project";
};

type UpdatesSectionWithSocialProps = {
  updates: UpdateSummary[];
  isAuthenticated: boolean;
  canPost?: boolean;
  projectId?: string;
};

export default async function UpdatesSectionWithSocial({
  updates,
  isAuthenticated,
  canPost = false,
  projectId,
}: UpdatesSectionWithSocialProps) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch like counts and user's likes for all updates
  const updateIds = updates.map((u) => u.id);

  // Get like counts for each update
  const likeCounts: Record<string, number> = {};
  if (updateIds.length > 0) {
    const { data: likeCountsData } = await supabase
      .from("update_likes")
      .select("update_id")
      .in("update_id", updateIds);

    if (likeCountsData) {
      for (const like of likeCountsData) {
        likeCounts[like.update_id] = (likeCounts[like.update_id] || 0) + 1;
      }
    }
  }

  // Get user's likes
  const userLikes = new Set<string>();
  if (user && updateIds.length > 0) {
    const { data: userLikesData } = await supabase
      .from("update_likes")
      .select("update_id")
      .eq("user_id", user.id)
      .in("update_id", updateIds);

    if (userLikesData) {
      for (const like of userLikesData) {
        userLikes.add(like.update_id);
      }
    }
  }

  return (
    <section className="rounded-2xl border border-soltas-line bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-soltas-text">
          Updates
        </h2>
        {canPost ? <NewUpdateButton isAuthenticated={isAuthenticated} projectId={projectId} /> : null}
      </div>

      {updates.length > 0 ? (
        <div className="mt-4 space-y-4">
          {updates.map((update) => (
            <UpdateCardWithSocial
              key={update.id}
              updateId={update.id}
              title={update.title}
              summary={update.summary}
              date={update.created_at}
              authorName={update.author_name}
              membersOnly={update.visibility === "project"}
              href={update.href}
              isAuthenticated={isAuthenticated}
              initialLikeCount={likeCounts[update.id] || 0}
              initialLiked={userLikes.has(update.id)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-soltas-muted">No updates yet.</p>
      )}
    </section>
  );
}
