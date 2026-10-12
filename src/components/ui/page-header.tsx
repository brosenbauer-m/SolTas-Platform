import * as React from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

/** Page title block: title + one-line description, actions on the right (stacked on mobile). */
export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <p className="text-sm font-medium text-soltas-ocean">{eyebrow}</p> : null}
        <h1 className="text-3xl font-semibold tracking-tight text-soltas-text sm:text-4xl">{title}</h1>
        {description ? <p className="max-w-2xl text-[15px] leading-6 text-soltas-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
