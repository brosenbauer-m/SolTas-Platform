/**
 * Where to go after login/signup: only paths on this site. Rejects "//evil.com" and "/\evil.com"
 * (browsers treat a backslash like a slash), so a crafted ?returnTo= link can't send people elsewhere.
 */
export function safeReturnTo(value: string | null | undefined, fallback = "/projects"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const url = new URL(value, "https://solarpunktaskforce.org");
    return url.origin === "https://solarpunktaskforce.org" ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}
