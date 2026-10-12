import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "outline" | "ocean" | "green" | "amber" | "rose";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-soltas-light text-soltas-text",
  outline: "border border-soltas-line text-soltas-muted",
  ocean: "bg-soltas-ocean/10 text-soltas-ocean",
  green: "bg-soltas-green/10 text-soltas-green",
  amber: "bg-amber-50 text-amber-800",
  rose: "bg-rose-50 text-rose-700",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
