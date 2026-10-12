import Image from "next/image";

import { cn } from "@/lib/utils";

/** Up to two initials from a display name. */
export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "")).toUpperCase();
}

const SIZES = { sm: "h-8 w-8 text-[11px]", md: "h-10 w-10 text-xs", lg: "h-16 w-16 text-lg" } as const;
const PIXELS = { sm: 32, md: 40, lg: 64 } as const;

/** Round picture, or soft initials when there is none. */
export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={PIXELS[size]}
        height={PIXELS[size]}
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-soltas-line", SIZES[size], className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-soltas-ocean/10 font-semibold text-soltas-ocean",
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
