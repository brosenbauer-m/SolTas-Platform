"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fieldClasses, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SocialLinkType = "LinkedIn" | "YouTube" | "Instagram" | "Facebook" | "Website" | "X" | "Threads";

export type SocialLink = { type: SocialLinkType; url: string };

export const socialLinkTypes: SocialLinkType[] = ["LinkedIn", "YouTube", "Instagram", "Facebook", "Website", "X", "Threads"];

export const emptySocialLink: SocialLink = { type: "LinkedIn", url: "" };

/** Trim urls and drop empty rows before saving. */
export function normalizeSocialLinks(links: SocialLink[]) {
  return links.map((link) => ({ ...link, url: link.url.trim() })).filter((link) => link.url.length > 0);
}

/** Editable list of social links: type, address and a remove button per row. */
export function SocialLinksFields({
  label = "Links",
  links,
  onChange,
  onAdd,
  onRemove,
}: {
  label?: string;
  links: SocialLink[];
  onChange: (index: number, field: keyof SocialLink, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-soltas-text">{label}</p>
      {links.map((link, index) => (
        <div key={index} className="flex gap-2">
          <select
            aria-label="Link type"
            value={link.type}
            onChange={(event) => onChange(index, "type", event.target.value)}
            className={cn("h-11", fieldClasses, "w-[7.5rem] shrink-0 px-3 sm:w-[8.5rem]")}
          >
            {socialLinkTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <Input
            type="url"
            inputMode="url"
            aria-label={`${link.type} address`}
            placeholder="https://"
            value={link.url}
            onChange={(event) => onChange(index, "url", event.target.value)}
            className="min-w-0"
          />
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label={`Remove ${link.type} link`}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-soltas-muted transition-colors hover:bg-white hover:text-soltas-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={onAdd} className="-ml-2">
        <Plus className="h-4 w-4" /> Add a link
      </Button>
    </div>
  );
}
