import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Centered, narrow layout shared by sign in, sign up and password screens. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className={cn("mx-auto w-full px-5 pb-20 pt-10 sm:pt-16", wide ? "max-w-2xl" : "max-w-[420px]")}>
      <div className="mb-8 flex flex-col items-center text-center">
        <span
          aria-hidden
          className="mb-5 h-12 w-12 rounded-full bg-[radial-gradient(circle_at_30%_30%,#8FC3DA_0%,#2E6B8A_45%,#2F855A_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
        />
        <h1 className="text-[28px] font-semibold tracking-tight text-soltas-text">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-sm text-[15px] text-soltas-muted">{subtitle}</p> : null}
      </div>
      <div className="rounded-3xl border border-soltas-line bg-white p-6 sm:p-8">{children}</div>
      {footer ? <div className="mt-6 text-center text-sm text-soltas-muted">{footer}</div> : null}
    </main>
  );
}

/** Label + input + inline error, with the shared field styling. */
export function AuthField({
  label,
  error,
  hint,
  aside,
  children,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-3 text-sm font-medium text-soltas-text">
        {label}
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
