"use client";

import { useMemo, useState } from "react";

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
        <div key={`social-link-${index}`} className="grid gap-3 md:grid-cols-[160px_1fr_auto]">
          <select
            name={typeName}
            value={link.type}
            onChange={(event) => updateLink(index, "type", event.target.value)}
            className="rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text shadow-sm"
          >
            <option value="">Platform</option>
            {SOCIAL_LINK_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            name={urlName}
            value={link.url}
            onChange={(event) => updateLink(index, "url", event.target.value)}
            placeholder="https://"
            className="w-full rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm text-soltas-text shadow-sm"
          />
          <button
            type="button"
            onClick={() => removeLink(index)}
            className="rounded-lg border border-soltas-line px-3 py-2 text-sm text-soltas-muted hover:bg-soltas-off-white"
            aria-label="Remove social link"
            disabled={links.length === 1}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addLink}
        className="inline-flex items-center justify-center rounded-lg border border-soltas-line px-3 py-2 text-sm font-medium text-soltas-text hover:bg-soltas-off-white"
      >
        Add social link
      </button>
    </div>
  );
}
