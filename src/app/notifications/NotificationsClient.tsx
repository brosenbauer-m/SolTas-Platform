"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  created_at: string;
  read_at: string | null;
};

type NotificationsClientProps = {
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
};

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function NotificationsClient({
  notifications,
  markNotificationRead,
  markAllNotificationsRead,
}: NotificationsClientProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const hasUnread = useMemo(
    () => notifications.some((notification) => !notification.read_at),
    [notifications]
  );

  const triggerUpdate = () => {
    window.dispatchEvent(new Event("notifications:updated"));
  };

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      await markNotificationRead(id);
      router.refresh();
      triggerUpdate();
    });
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
      triggerUpdate();
    });
  };

  const getFallbackBody = (type: string) => {
    switch (type) {
      case "project_update_published":
        return "A project you follow shared an update.";
      case "followed_you":
        return "Someone followed you.";
      case "followed_your_org":
        return "Someone followed your organisation.";
      case "followed_your_project":
        return "Someone followed your project.";
      case "feed_post_comment":
        return "Someone commented on your post.";
      case "feed_post_reaction":
        return "Someone liked your post.";
      default:
        return null;
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-soltas-text">Notifications</h1>
          <p className="text-sm text-soltas-muted">
            Updates about your projects, follows, and collaborations.
          </p>
        </div>
        <button
          type="button"
          onClick={handleMarkAll}
          disabled={!hasUnread || isPending}
          className="inline-flex items-center justify-center rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm font-medium text-soltas-text transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          Mark all as read
        </button>
      </div>

      {notifications.length ? (
        <ul className="space-y-3">
          {notifications.map((notification) => {
            const isUnread = !notification.read_at;
            const fallbackBody = getFallbackBody(notification.type);
            const body = notification.body ?? fallbackBody;
            const content = (
              <div className="min-w-0 space-y-1">
                <div className="truncate text-sm font-semibold text-soltas-text">{notification.title}</div>
                {body ? (
                  <div className="truncate text-xs text-soltas-muted">{body}</div>
                ) : null}
                <div className="text-xs text-soltas-muted">{formatDateTime(notification.created_at)}</div>
              </div>
            );

            return (
              <li
                key={notification.id}
                className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                  isUnread
                    ? "border-soltas-glacial/30 bg-soltas-glacial/15"
                    : "border-soltas-line bg-white"
                }`}
              >
                {notification.href ? (
                  <Link href={notification.href} className="flex-1" prefetch={false}>
                    {content}
                  </Link>
                ) : (
                  <div className="flex-1">{content}</div>
                )}
                <div className="flex items-center gap-2">
                  {isUnread ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleMarkRead(notification.id);
                      }}
                      disabled={isPending}
                      className="rounded-lg border border-soltas-line bg-white px-3 py-1 text-xs font-medium text-soltas-text transition hover:bg-soltas-off-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark read
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-soltas-muted">Read</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-soltas-line bg-white p-6 text-sm text-soltas-muted">
          You have no notifications yet.
        </div>
      )}
    </section>
  );
}
