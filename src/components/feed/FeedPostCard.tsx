"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";

function getStorageUrl(filePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error("NEXT_PUBLIC_SUPABASE_URL is not set");
    return "";
  }
  return `${supabaseUrl}/storage/v1/object/public/feed-posts/${filePath}`;
}

type Attachment = {
  id: string;
  file_path: string;
  mime_type: string;
};

type FeedPostCardProps = {
  id: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  content: string;
  timestamp: string | null;
  entityType?: string | null;
  entityId?: string | null;
  entitySlug?: string | null;
  entityName?: string | null;
  canEdit?: boolean;
  attachments?: Attachment[];
};

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) return "Recently";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function getEntityLink(
  entityType: string | null | undefined,
  entityId: string | null | undefined,
  entitySlug: string | null | undefined,
): { href: string; label: string } | null {
  if (!entityType || !entityId) return null;

  if (entityType === "project") {
    return {
      href: entitySlug ? `/projects/${entitySlug}` : `/projects`,
      label: entitySlug ? `Re: project` : "Re: project",
    };
  }

  if (entityType === "funding") {
    return {
      href: entitySlug ? `/funding/${entitySlug}` : `/funding`,
      label: entitySlug ? `Re: funding` : "Re: funding",
    };
  }

  if (entityType === "issue") {
    return {
      href: `/issues/${entityId}`,
      label: "Re: issue",
    };
  }

  return null;
}

export function FeedPostCard({
  id,
  authorName,
  authorAvatarUrl,
  content,
  timestamp,
  entityType,
  entityId,
  entitySlug,
  entityName,
  canEdit = false,
  attachments = [],
}: FeedPostCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entityLink = getEntityLink(entityType, entityId, entitySlug);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(content);
    setShowMenu(false);
    setError(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(content);
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!editedContent.trim()) {
      setError("Content cannot be empty");
      return;
    }

    if (editedContent === content) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/feed-posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedContent }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update post");
        setIsSaving(false);
        return;
      }

      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update post");
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
    setShowMenu(false);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/feed-posts/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to delete post");
        setIsDeleting(false);
        setShowDeleteConfirm(false);
        return;
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setError(null);
  };

  return (
    <article className="card p-6">
      <div className="flex gap-3">
        <Avatar name={authorName} src={authorAvatarUrl} />

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-soltas-text">{authorName}</p>
            <div className="flex items-center gap-2">
              <time className="text-xs text-soltas-muted" dateTime={timestamp ?? undefined}>
                {formatTimestamp(timestamp)}
              </time>
              {canEdit && !isEditing && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="rounded p-1 text-soltas-muted hover:bg-soltas-light"
                    aria-label="Post options"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                      <circle cx="8" cy="2" r="1.5" />
                      <circle cx="8" cy="8" r="1.5" />
                      <circle cx="8" cy="14" r="1.5" />
                    </svg>
                  </button>
                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute right-0 top-8 z-20 w-32 rounded-lg border border-soltas-line bg-white py-1 shadow-lg">
                        <button
                          onClick={handleEdit}
                          className="w-full px-4 py-2 text-left text-sm text-soltas-text hover:bg-soltas-off-white"
                        >
                          Edit
                        </button>
                        <button
                          onClick={handleDeleteClick}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-soltas-off-white"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full rounded-lg border border-soltas-line p-3 text-sm focus:border-soltas-ocean focus:outline-none focus:ring-1 focus:ring-soltas-ocean"
                rows={4}
                maxLength={5000}
                disabled={isSaving}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-soltas-muted">
                  {editedContent.length}/5000
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="rounded-lg border border-soltas-line px-3 py-1.5 text-sm text-soltas-text hover:bg-soltas-off-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving || !editedContent.trim()}
                    className="rounded-lg bg-soltas-ocean px-3 py-1.5 text-sm text-white hover:bg-soltas-ocean/90 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-soltas-text">{content}</p>
          )}

          {!isEditing && attachments.length > 0 && (
            <div className={`grid gap-2 ${attachments.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {attachments.map((attachment) => (
                <div key={attachment.id} className="relative aspect-video overflow-hidden rounded-lg border border-soltas-line">
                  <Image
                    src={getStorageUrl(attachment.file_path)}
                    alt="Post attachment"
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-2 text-xs text-red-600">
              {error}
            </div>
          )}

          {entityLink && !isEditing && (
            <div className="pt-1">
              <Link
                href={entityLink.href}
                className="inline-flex items-center gap-1 text-xs text-soltas-ocean hover:underline"
              >
                {entityLink.label}
                {entityName && <span className="font-medium">· {entityName}</span>}
              </Link>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-soltas-line bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-soltas-text">Delete post?</h3>
            <p className="mt-2 text-sm text-soltas-muted">
              This action cannot be undone. Your post will be permanently deleted.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="rounded-lg border border-soltas-line px-4 py-2 text-sm text-soltas-text hover:bg-soltas-off-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
