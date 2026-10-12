type UpdateCardProps = {
  title: string;
  summary: string;
  date: string;
  authorName?: string;
  href?: string;
};

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function UpdateCard({ title, summary, date, authorName, href }: UpdateCardProps) {
  const formattedDate = formatDate(date);

  const card = (
    <article className="rounded-xl border border-soltas-line p-4 hover:border-soltas-line transition-colors">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-soltas-text">{title}</h3>
        <span className="text-xs text-soltas-muted">{formattedDate}</span>
      </div>
      {authorName ? (
        <p className="mt-1 text-xs text-soltas-muted">by {authorName}</p>
      ) : null}
      <p className="mt-2 whitespace-pre-wrap text-sm text-soltas-text line-clamp-3">{summary}</p>
    </article>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {card}
      </a>
    );
  }

  return card;
}
