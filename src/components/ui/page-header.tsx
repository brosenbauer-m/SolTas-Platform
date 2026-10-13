import * as React from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  /** Smaller title for full-screen tool pages (the Find pages). */
  compact?: boolean;
};

/** Page title block: title + one-line description, actions on the right (stacked on mobile). */
export function PageHeader({ title, description, eyebrow, actions, className, compact = false }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <p className="text-sm font-medium text-soltas-ocean">{eyebrow}</p> : null}
        <h1
          className={cn(
            "font-semibold tracking-tight text-soltas-text",
            compact ? "text-2xl" : "text-3xl sm:text-4xl",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className={cn("max-w-2xl text-soltas-muted", compact ? "text-sm" : "text-[15px] leading-6")}>{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
