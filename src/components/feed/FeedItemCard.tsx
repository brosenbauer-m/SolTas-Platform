import Image from "next/image";
import Link from "next/link";

type FeedItemCardProps = {
  title: string;
  summary?: string | null;
  href?: string | null;
  timestamp?: string | null;
  actorAvatarUrl?: string | null;
  actorName?: string;
  deadline?: string | null;
  eventType?: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function FeedItemCard({
  title,
  summary,
  href,
  timestamp,
  actorAvatarUrl,
  actorName = "Someone",
  deadline,
  eventType,
}: FeedItemCardProps) {
  return (
    <article className="rounded-2xl border border-soltas-line bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-soltas-text">
            {href ? (
              <Link href={href} className="hover:underline">
                {title}
              </Link>
            ) : (
              title
            )}
          </h2>
          {summary ? <p className="text-sm text-soltas-text">{summary}</p> : null}
          <div className="flex flex-wrap gap-2 text-xs text-soltas-muted">
            {timestamp ? <span>{formatDateTime(timestamp)}</span> : null}
            {deadline ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                Deadline: {formatDateTime(deadline)}
              </span>
            ) : null}
          </div>
        </div>
        {actorAvatarUrl ? (
          <Image
            src={actorAvatarUrl}
            alt={actorName}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full border border-soltas-line object-cover"
          />
        ) : eventType !== "funding" && eventType !== "watchdog" ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-soltas-line bg-soltas-off-white text-xs text-soltas-muted">
            —
          </div>
        ) : null}
      </div>
    </article>
  );
}
