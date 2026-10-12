import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-soltas-ocean text-white shadow-sm hover:bg-soltas-abyssal active:scale-[0.98]",
  secondary: "bg-soltas-light text-soltas-text hover:bg-[#E2E8ED] active:scale-[0.98]",
  outline: "border border-soltas-line bg-white text-soltas-text hover:bg-soltas-off-white active:scale-[0.98]",
  ghost: "text-soltas-ocean hover:bg-soltas-light",
  destructive: "bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98]",
  link: "h-auto px-0 text-soltas-ocean underline-offset-4 hover:underline",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-11 px-5 text-[15px]",
  sm: "h-9 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const buttonClasses = ({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-soltas-ocean focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    sizeClasses[size],
    variantClasses[variant],
    className,
  );

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    return <button ref={ref} type={type} className={buttonClasses({ variant, size, className })} {...props} />;
  },
);
Button.displayName = "Button";
