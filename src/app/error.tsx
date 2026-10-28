"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonClasses } from "@/components/ui/button";

/** Shown when a page fails to render; the error itself is logged to the console (and Vercel). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Page failed", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-soltas-muted">Something went wrong</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-soltas-text sm:text-4xl">
        We couldn’t load this page
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-6 text-soltas-muted">
        This is on our side, not yours. Trying again usually helps; if it keeps happening, please tell us at{" "}
        <a className="font-medium text-soltas-ocean hover:underline" href="mailto:contact@solarpunktaskforce.org">
          contact@solarpunktaskforce.org
        </a>
        {error.digest ? <> and mention the code {error.digest}</> : null}.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className={buttonClasses({ variant: "outline" })}>
          Back to the map
        </Link>
      </div>
    </main>
  );
}
