"use client";

import { Check, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Share the current page: the device's share sheet where it exists (phones), otherwise the link is copied
 * and the button says so for a moment. Pass `path` for a canonical link; defaults to the current URL.
 */
export default function ShareButton({
  title,
  path,
  size = "sm",
}: {
  title: string;
  path?: string;
  size?: "sm" | "default";
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    const url = path ? new URL(path, window.location.origin).toString() : window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // the person cancelled the share sheet, or the clipboard is unavailable: nothing to do
    }
  };

  return (
    <Button type="button" variant="outline" size={size} onClick={share} aria-live="polite">
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}
