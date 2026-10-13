"use client";
import Link from "next/link";
import { useMemo } from "react";

/**
 * Circular + button that on hover slides left to reveal text.
 * Org → "Add Project" → /projects/new
 * Individual → "Report an issue" → /issues/new
 */
export default function AddAction({ accountKind }: { accountKind: "individual" | "organisation" }) {
  const conf = useMemo(() => {
    return accountKind === "organisation"
      ? { href: "/projects/new", label: "Add Project" }
      : { href: "/issues/new", label: "Report an issue" };
  }, [accountKind]);

  return (
    <Link
      href={conf.href}
      className="group relative flex items-center overflow-hidden"
      aria-label={conf.label}
    >
      <span className="grid h-9 w-9 place-items-center rounded-full border transition-transform duration-200 group-hover:-translate-x-[6.5rem]">
        +
      </span>
      <span className="pointer-events-none absolute left-0 ml-11 whitespace-nowrap text-sm opacity-0 transition-all duration-200 group-hover:ml-3 group-hover:opacity-100">
        {conf.label}
      </span>
    </Link>
  );
}
