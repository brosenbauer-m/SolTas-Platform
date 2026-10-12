import Link from "next/link";

const buildSearchParams = (
  searchParams: Record<string, string | string[] | undefined>,
  page: number,
  basePath: string,
) => {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (key === "page") return;
    if (Array.isArray(value)) {
      const joined = value.join(",");
      if (joined) params.set(key, joined);
      return;
    }
    if (typeof value === "string" && value.length > 0) {
      params.set(key, value);
    }
  });

  params.set("page", page.toString());
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
};

const buildPageNumbers = (page: number, pageCount: number) => {
  const pages = new Set<number>();
  pages.add(1);
  pages.add(pageCount);
  for (let index = page - 2; index <= page + 2; index += 1) {
    if (index >= 1 && index <= pageCount) {
      pages.add(index);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
};

type GrantsPaginationProps = {
  page: number;
  pageCount: number;
  searchParams: Record<string, string | string[] | undefined>;
  basePath?: string;
};

export default function GrantsPagination({
  page,
  pageCount,
  searchParams,
  basePath = "/funding",
}: GrantsPaginationProps) {
  if (pageCount <= 1) {
    return null;
  }

  const safePage = Math.min(Math.max(page, 1), pageCount);
  const pages = buildPageNumbers(safePage, pageCount);

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
      <div className="text-sm text-soltas-muted">
        Page {safePage} of {pageCount}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={buildSearchParams(searchParams, Math.max(safePage - 1, 1), basePath)}
          aria-disabled={safePage === 1}
          className={`rounded border px-3 py-1 text-sm ${
            safePage === 1
              ? "pointer-events-none border-soltas-line text-soltas-muted"
              : "border-soltas-line text-soltas-text hover:border-soltas-ocean/40"
          }`}
        >
          Prev
        </Link>
        {pages.map(value => (
          <Link
            key={value}
            href={buildSearchParams(searchParams, value, basePath)}
            className={`rounded border px-3 py-1 text-sm ${
              value === safePage
                ? "border-soltas-ocean bg-soltas-glacial/15 text-soltas-ocean"
                : "border-soltas-line text-soltas-text hover:border-soltas-ocean/40"
            }`}
          >
            {value}
          </Link>
        ))}
        <Link
          href={buildSearchParams(searchParams, Math.min(safePage + 1, pageCount), basePath)}
          aria-disabled={safePage === pageCount}
          className={`rounded border px-3 py-1 text-sm ${
            safePage === pageCount
              ? "pointer-events-none border-soltas-line text-soltas-muted"
              : "border-soltas-line text-soltas-text hover:border-soltas-ocean/40"
          }`}
        >
          Next
        </Link>
      </div>
    </nav>
  );
}
