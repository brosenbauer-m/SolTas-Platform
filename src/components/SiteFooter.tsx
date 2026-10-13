import Link from "next/link";

const CONTACT_EMAIL = "contact@solarpunktaskforce.org";

/** Slim footer: copyright, contact and the legal pages. */
export default function SiteFooter() {
  return (
    <footer className="border-t border-soltas-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-soltas-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} Solarpunk Taskforce</p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-soltas-text">
            Contact
          </a>
          <Link href="/privacy" className="hover:text-soltas-text">
            Privacy
          </Link>
          <Link href="/legal" className="hover:text-soltas-text">
            Legal notice
          </Link>
        </nav>
      </div>
    </footer>
  );
}
