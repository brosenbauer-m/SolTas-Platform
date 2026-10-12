"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fieldClasses, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { NormalizedSocialLink } from "@/components/profiles/SocialLinks";

const SOCIAL_LINK_TYPES = [
  "LinkedIn",
  "YouTube",
  "Instagram",
  "Facebook",
  "Website",
  "X",
  "Threads",
];

type SocialLinksEditorProps = {
  initialLinks?: NormalizedSocialLink[];
  typeName?: string;
  urlName?: string;
};

export default function SocialLinksEditor({
  initialLinks,
  typeName = "social_type",
  urlName = "social_url",
}: SocialLinksEditorProps) {
  const startingLinks = useMemo(() => {
    if (initialLinks && initialLinks.length > 0) {
      return initialLinks.map((link) => ({ type: link.type ?? "", url: link.url }));
    }
    return [{ type: "", url: "" }];
  }, [initialLinks]);

  const [links, setLinks] = useState(startingLinks);

  function updateLink(index: number, field: "type" | "url", value: string) {
    setLinks((prev) =>
      prev.map((link, idx) => (idx === index ? { ...link, [field]: value } : link))
    );
  }

  function addLink() {
    setLinks((prev) => [...prev, { type: "", url: "" }]);
  }

  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== index));
  }

  return (
    <div className="space-y-3">
      {links.map((link, index) => (
        <div key={`social-link-${index}`} className="flex gap-2">
          <select
            name={typeName}
            aria-label="Link type"
            value={link.type}
            onChange={(event) => updateLink(index, "type", event.target.value)}
            className={cn("h-11", fieldClasses, "w-[7.5rem] shrink-0 px-3 sm:w-[8.5rem]")}
          >
            <option value="">Platform</option>
            {SOCIAL_LINK_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <Input
            name={urlName}
            type="url"
            inputMode="url"
            aria-label="Link address"
            value={link.url}
            onChange={(event) => updateLink(index, "url", event.target.value)}
            placeholder="https://"
            className="min-w-0"
          />
          <button
            type="button"
            onClick={() => removeLink(index)}
            aria-label="Remove link"
            disabled={links.length === 1}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-soltas-muted transition-colors hover:bg-soltas-light hover:text-soltas-text disabled:opacity-30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={addLink} className="-ml-2">
        <Plus className="h-4 w-4" /> Add a link
      </Button>
    </div>
  );
}
