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

export { Field as AuthField, FormMessage } from "@/components/ui/field";
