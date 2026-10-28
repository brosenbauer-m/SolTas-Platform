import Link from "next/link";
import type { Metadata } from "next";

import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

/** Shown for links that lead nowhere: a missing page, a project that was removed or isn't public. */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-soltas-muted">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-soltas-text sm:text-4xl">
        This page doesn’t exist
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-6 text-soltas-muted">
        The link may be out of date, or this project, organisation or issue isn’t public. Try the map or the lists
        instead.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link href="/projects" className={buttonClasses()}>
          Find projects
        </Link>
        <Link href="/" className={buttonClasses({ variant: "outline" })}>
          Back to the map
        </Link>
      </div>
    </main>
  );
}
