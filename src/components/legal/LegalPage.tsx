import type { ReactNode } from "react";

import SiteFooter from "@/components/SiteFooter";

/** Shared layout for the privacy policy and legal notice. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="flex flex-col">
      <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-4xl font-semibold tracking-tight text-soltas-text">{title}</h1>
        <p className="mt-2 text-sm text-soltas-muted">Last updated: {updated}</p>
        <div className="mt-10 space-y-10 text-[15px] leading-7 text-soltas-text [&_a]:text-soltas-ocean [&_a:hover]:underline [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-6 [&_h3]:font-semibold [&_li]:mt-1 [&_p+p]:mt-3 [&_section>*+*]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}

/** Highlights information the owner still has to fill in before publishing. */
export function Fill({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-amber-100 px-1 text-amber-900">[{children}]</mark>;
}
