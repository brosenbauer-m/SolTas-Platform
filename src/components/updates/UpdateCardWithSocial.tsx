"use client";

import { useState, useEffect } from "react";
import { LikeButton, Comments } from "@/components/social";

type Comment = {
  id: string;
  authorName: string;
  body: string;
  createdAt: Date;
  canDelete: boolean;
};

type UpdateCardWithSocialProps = {
  updateId: string;
  title: string;
  summary: string;
  date: string;
  authorName?: string;
  href?: string;
  membersOnly?: boolean;
  isAuthenticated: boolean;
  initialLikeCount: number;
  initialLiked: boolean;
};

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function UpdateCardWithSocial({
  updateId,
  title,
  summary,
  date,
  authorName,
  href,
  membersOnly = false,
  isAuthenticated,
  initialLikeCount,
  initialLiked,
}: UpdateCardWithSocialProps) {
  const formattedDate = formatDate(date);

  // Like state
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(initialLiked);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Load comments when section is expanded
  useEffect(() => {
    if (showComments && comments.length === 0) {
      loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComments]);

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const response = await fetch(`/api/updates/${updateId}/comments`);
      if (response.ok) {
        const data: { comments: Array<{ id: string; authorName: string; body: string; createdAt: string; canDelete: boolean }> } = await response.json();
        setComments(
          data.comments.map((c) => ({
            ...c,
            createdAt: new Date(c.createdAt),
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!isAuthenticated) {
      alert("Please log in to like updates");
      return;
    }

    const method = liked ? "DELETE" : "POST";
    const newLiked = !liked;
    const newCount = liked ? likeCount - 1 : likeCount + 1;

    // Optimistic update
    setLiked(newLiked);
    setLikeCount(newCount);

    try {
      const response = await fetch(`/api/updates/${updateId}/like`, {
        method,
      });

      if (!response.ok) {
        // Rollback on error
        setLiked(!newLiked);
        setLikeCount(liked ? likeCount : likeCount - 1);
        console.error("Failed to toggle like");
      }
    } catch (error) {
      // Rollback on error
      setLiked(!newLiked);
      setLikeCount(liked ? likeCount : likeCount - 1);
      console.error("Failed to toggle like:", error);
    }
  };

  const handleCommentSubmit = async (body: string) => {
    if (!isAuthenticated) {
      alert("Please log in to comment");
      return;
    }

    try {
      const response = await fetch(`/api/updates/${updateId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      if (response.ok) {
        await loadComments();
      } else {
        console.error("Failed to post comment");
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadComments();
      } else {
        console.error("Failed to delete comment");
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const card = (
    <article className="rounded-xl border border-soltas-line bg-white p-4 hover:border-soltas-line transition-colors">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-soltas-text">{title}</h3>
          {membersOnly ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
              Members only
            </span>
          ) : null}
        </div>
        <span className="text-xs text-soltas-muted">{formattedDate}</span>
      </div>
      {authorName ? (
        <p className="mt-1 text-xs text-soltas-muted">by {authorName}</p>
      ) : null}
      <p className="mt-2 whitespace-pre-wrap text-sm text-soltas-text line-clamp-3">{summary}</p>

      {/* Social actions */}
      <div className="mt-4 flex items-center gap-4">
        <LikeButton
          count={likeCount}
          liked={liked}
          onToggle={handleToggleLike}
          disabled={!isAuthenticated}
          size="sm"
        />
        <button
          type="button"
          onClick={() => setShowComments(!showComments)}
          className="text-xs text-soltas-muted hover:text-soltas-text transition-colors"
        >
          {showComments ? "Hide" : "Show"} comments ({comments.length})
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-4 border-t border-soltas-line pt-4">
          <Comments
            comments={comments}
            onSubmit={handleCommentSubmit}
            onDelete={handleCommentDelete}
            isLoading={commentsLoading}
            disabled={!isAuthenticated}
            showComposer={isAuthenticated}
            placeholder={
              isAuthenticated
                ? "Add a comment..."
                : "Log in to comment"
            }
          />
        </div>
      )}
    </article>
  );

  if (href) {
    return (
      <div className="block">
        {card}
      </div>
    );
  }

  return card;
}
