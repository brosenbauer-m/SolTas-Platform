import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Label + input + inline error, with the shared field styling. */
export function Field({
  label,
  error,
  hint,
  aside,
  optional = false,
  children,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  aside?: ReactNode;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-3 text-sm font-medium text-soltas-text">
        <span>
          {label}
          {optional ? <span className="ml-1.5 font-normal text-soltas-muted">Optional</span> : null}
        </span>
        {aside}
      </span>
      {children}
      {error ? (
        <span role="alert" className="block text-[13px] text-rose-600">
          {error}
        </span>
      ) : hint ? (
        <span className="block text-[13px] text-soltas-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl px-4 py-3 text-sm",
        tone === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800",
      )}
    >
      {children}
    </p>
  );
}

/** A titled group of fields on a white card, for long forms. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-3xl border border-soltas-line bg-white p-5 sm:p-7", className)}>
      <div className="mb-5">
        <h2 className="text-[17px] font-semibold tracking-tight text-soltas-text">{title}</h2>
        {description ? <p className="mt-1 text-sm text-soltas-muted">{description}</p> : null}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
