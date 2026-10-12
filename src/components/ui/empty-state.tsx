import * as React from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

/** Friendly empty state: what this is and what to do next. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-soltas-line bg-white/60 px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? <div className="mb-1 text-soltas-muted [&_svg]:h-6 [&_svg]:w-6">{icon}</div> : null}
      <p className="text-[15px] font-medium text-soltas-text">{title}</p>
      {description ? <p className="max-w-sm text-sm text-soltas-muted">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
