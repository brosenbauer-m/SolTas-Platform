import Link from "next/link";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { href: "/projects", label: "Projects" },
      { href: "/find-organisations", label: "Organisations" },
      { href: "/funding", label: "Funding" },
      { href: "/issues", label: "Issues" },
      { href: "/feed", label: "Feed" },
    ],
  },
  {
    title: "Take part",
    links: [
      { href: "/signup", label: "Join" },
      { href: "/projects/new", label: "Register a project" },
      { href: "/organisations/create", label: "Register an organisation" },
      { href: "/issues/new", label: "Report an issue" },
    ],
  },
  {
    title: "Solarpunk Taskforce",
    links: [
      { href: "/about", label: "About" },
      { href: "/services", label: "Services" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-soltas-line bg-white/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3 sm:px-6">
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="text-xs font-semibold text-soltas-text">{col.title}</h2>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-soltas-muted transition-colors hover:text-soltas-text">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-6xl border-t border-soltas-line px-4 py-6 text-xs text-soltas-muted sm:px-6">
        © {new Date().getFullYear()} Solarpunk Taskforce. Connecting people, projects and organisations for global impact.
      </div>
    </footer>
  );
}
