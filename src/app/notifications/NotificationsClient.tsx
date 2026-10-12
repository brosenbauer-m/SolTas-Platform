"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

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
    <section className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Updates about your projects, follows and collaborations."
        actions={
          <Button variant="outline" size="sm" onClick={handleMarkAll} disabled={!hasUnread || isPending}>
            Mark all as read
          </Button>
        }
      />

      {notifications.length ? (
        <ul className="divide-y divide-soltas-line overflow-hidden rounded-2xl border border-soltas-line bg-white">
          {notifications.map((notification) => {
            const isUnread = !notification.read_at;
            const fallbackBody = getFallbackBody(notification.type);
            const body = notification.body ?? fallbackBody;
            const content = (
              <div className="flex min-w-0 items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-2 h-2 w-2 shrink-0 rounded-full ${isUnread ? "bg-soltas-ocean" : "bg-transparent"}`}
                />
                <div className="min-w-0 space-y-0.5">
                  <p className={`text-[15px] text-soltas-text ${isUnread ? "font-semibold" : "font-medium"}`}>
                    {notification.title}
                    {isUnread ? <span className="sr-only"> (unread)</span> : null}
                  </p>
                  {body ? <p className="line-clamp-2 text-sm text-soltas-muted">{body}</p> : null}
                  <p className="text-xs text-soltas-muted">{formatDateTime(notification.created_at)}</p>
                </div>
              </div>
            );

            return (
              <li key={notification.id} className="flex items-start justify-between gap-3 px-4 py-4 transition-colors hover:bg-soltas-off-white sm:px-5">
                {notification.href ? (
                  <Link
                    href={notification.href}
                    className="min-w-0 flex-1"
                    prefetch={false}
                    onClick={() => {
                      if (isUnread) handleMarkRead(notification.id);
                    }}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="min-w-0 flex-1">{content}</div>
                )}
                {isUnread ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleMarkRead(notification.id);
                    }}
                    disabled={isPending}
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-soltas-ocean transition hover:bg-soltas-light disabled:opacity-60"
                  >
                    Mark read
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={<Bell />}
          title="You're all caught up"
          description="Follow projects, organisations and people to get notified about their updates."
        />
      )}
    </section>
  );
}
