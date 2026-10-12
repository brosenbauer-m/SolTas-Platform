import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const fieldClasses =
  "w-full rounded-xl border border-soltas-line bg-white px-4 text-[15px] text-soltas-text shadow-[0_1px_0_rgba(26,43,56,0.02)] placeholder:text-soltas-muted/70 transition focus:border-soltas-ocean/50 focus:outline-none focus-visible:ring-4 focus-visible:ring-soltas-ocean/15 disabled:cursor-not-allowed disabled:opacity-50";

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = "text", ...props }, ref) => {
  return <input ref={ref} type={type} className={cn("flex h-11", fieldClasses, className)} {...props} />;
});
Input.displayName = "Input";
