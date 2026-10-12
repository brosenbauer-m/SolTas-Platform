import Link from "next/link";
import { AlertTriangle, Building2, Coins, Sprout, UserPlus, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type FeedItemCardProps = {
  title: string;
  summary?: string | null;
  href?: string | null;
  timestamp?: string | null;
  eventType?: string;
};

const EVENT_ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  project_update: { icon: Sprout, tone: "bg-soltas-green/10 text-soltas-green" },
  org_update: { icon: Building2, tone: "bg-soltas-ocean/10 text-soltas-ocean" },
  watchdog_update: { icon: AlertTriangle, tone: "bg-amber-50 text-amber-700" },
  grant_published: { icon: Coins, tone: "bg-soltas-ocean/10 text-soltas-ocean" },
  follow: { icon: UserPlus, tone: "bg-soltas-light text-soltas-muted" },
};

/** "5m ago", "3h ago", "2d ago", then a short date. */
export function relativeTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

/** One row in the activity list (render inside a <ul>). */
export function FeedItemCard({ title, summary, href, timestamp, eventType }: FeedItemCardProps) {
  const { icon: Icon, tone } = EVENT_ICONS[eventType ?? ""] ?? EVENT_ICONS.follow;
  const when = relativeTime(timestamp);
  const body = (
    <>
      <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full", tone)}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-medium text-soltas-text">{title}</span>
          {when ? (
            <time dateTime={timestamp ?? undefined} className="shrink-0 text-xs text-soltas-muted">
              {when}
            </time>
          ) : null}
        </span>
        {summary ? <span className="mt-0.5 line-clamp-2 block text-sm text-soltas-muted">{summary}</span> : null}
      </span>
    </>
  );

  return (
    <li>
      {href ? (
        <Link href={href} className="flex gap-3 px-5 py-4 transition-colors hover:bg-soltas-off-white">
          {body}
        </Link>
      ) : (
        <div className="flex gap-3 px-5 py-4">{body}</div>
      )}
    </li>
  );
}
