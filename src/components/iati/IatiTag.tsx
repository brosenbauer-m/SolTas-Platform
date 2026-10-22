"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";

import { IATI_ABOUT } from "@/lib/iati/about";
import { cn } from "@/lib/utils";

/**
 * The "IATI" tag on imported projects, with an (i) that explains what IATI is and how it relates to us.
 * Imported projects are normal projects otherwise; this tag is the only difference people see.
 */
export default function IatiTag({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 align-middle", className)}>
      <span className="soltas-tag-iati">IATI</span>
      <PopoverPrimitive.Root>
        <PopoverPrimitive.Trigger className="soltas-info-button" aria-label={IATI_ABOUT.title}>
          i
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            sideOffset={8}
            collisionPadding={16}
            className="z-50 w-80 max-w-[calc(100vw-32px)] rounded-2xl border border-soltas-line bg-white p-4 text-sm leading-6 text-soltas-muted shadow-xl outline-none"
          >
            <p className="font-semibold text-soltas-text">{IATI_ABOUT.title}</p>
            <p className="mt-1">{IATI_ABOUT.body}</p>
            <p className="mt-2">{IATI_ABOUT.connection}</p>
            <a
              href={IATI_ABOUT.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block font-medium text-soltas-ocean hover:underline"
            >
              {IATI_ABOUT.linkLabel} ↗
            </a>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </span>
  );
}
