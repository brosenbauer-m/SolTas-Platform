import Link from "next/link";

export type NormalizedSocialLink = {
  type?: string;
  url: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeSocialLinks(value: unknown): NormalizedSocialLink[] {
  const links: NormalizedSocialLink[] = [];
  if (!value) return links;

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!isRecord(item)) continue;
      const url = item.url;
      const type = item.type;
      if (typeof url === "string" && url.trim().length > 0) {
        links.push({
          url: url.trim(),
          type: typeof type === "string" && type.trim().length > 0 ? type.trim() : undefined,
        });
      }
    }
    return links;
  }

  if (isRecord(value)) {
    for (const [key, val] of Object.entries(value)) {
      if (typeof val === "string" && val.trim().length > 0) {
        links.push({
          url: val.trim(),
          type: key,
        });
      }
    }
  }

  return links;
}

export function SocialLinks({ links }: { links: unknown }) {
  const normalized = normalizeSocialLinks(links);

  if (normalized.length === 0) {
    return <p className="text-sm text-soltas-muted">—</p>;
  }

  return (
    <ul className="space-y-2">
      {normalized.map((link) => {
        const NAMES: Record<string, string> = {
          linkedin: "LinkedIn",
          instagram: "Instagram",
          twitter: "X (Twitter)",
          x: "X",
          facebook: "Facebook",
          youtube: "YouTube",
          tiktok: "TikTok",
          github: "GitHub",
          website: "Website",
        };
        const label = link.type ? (NAMES[link.type.toLowerCase()] ?? link.type) : link.url;
        return (
          <li key={`${label}-${link.url}`}>
            <Link
              href={link.url}
              className="text-sm font-medium text-soltas-ocean hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
