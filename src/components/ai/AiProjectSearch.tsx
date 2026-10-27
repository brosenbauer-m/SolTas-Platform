"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

type Props = {
  signedIn: boolean;
  /** The request behind the current filters (?ai=), shown so people know what the AI understood. */
  currentQuery?: string | null;
};

/**
 * "Describe what you're looking for": Mistral turns the sentence into the normal filters
 * (/api/ai/search), so the map, the table and the filter panel all show the result.
 */
export default function AiProjectSearch({ signedIn, currentQuery = null }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(currentQuery ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-soltas-ocean/5 px-4 py-3 text-sm text-soltas-text">
        <Sparkles className="h-4 w-4 shrink-0 text-soltas-ocean" aria-hidden />
        <span>Find projects by describing them, e.g. “WASH projects in Uganda”.</span>
        <Link href="/login?returnTo=/projects" className="font-medium text-soltas-ocean hover:underline">
          Sign in to search with AI
        </Link>
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = query.trim();
    if (text.length < 3 || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const body = (await res.json().catch(() => ({}))) as { href?: string; error?: string; remaining?: number };
      if (!res.ok || !body.href) {
        setMessage(body.error ?? "AI search didn’t work. Please try again or use the filters.");
        return;
      }
      if (typeof body.remaining === "number" && body.remaining <= 5) {
        setMessage(`${body.remaining} AI ${body.remaining === 1 ? "search" : "searches"} left today.`);
      }
      router.push(body.href);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2" role="search" aria-label="AI project search">
      <label htmlFor="ai-project-search" className="flex items-center gap-1.5 text-sm font-medium text-soltas-text">
        <Sparkles className="h-4 w-4 text-soltas-ocean" aria-hidden />
        Describe what you’re looking for
      </label>
      <div className="flex gap-2">
        <input
          id="ai-project-search"
          value={query}
          maxLength={300}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. WASH projects in Uganda, or reforestation in the Amazon"
          className="min-h-11 w-full min-w-0 rounded-full border border-soltas-line bg-white px-4 text-[15px] focus:outline-none focus-visible:ring-2 focus-visible:ring-soltas-ocean"
        />
        <button
          type="submit"
          disabled={busy || query.trim().length < 3}
          className="min-h-11 shrink-0 rounded-full bg-soltas-ocean px-5 text-sm font-semibold text-white hover:bg-soltas-abyssal disabled:opacity-50"
        >
          {busy ? "Searching…" : "Search"}
        </button>
      </div>
      {message ? (
        <p className="text-xs text-soltas-muted" role="status">
          {message}
        </p>
      ) : currentQuery ? (
        <p className="text-xs text-soltas-muted">
          Filters set by AI search. Adjust them below, or{" "}
          <Link href="/projects" className="text-soltas-ocean hover:underline">
            clear all
          </Link>
          .
        </p>
      ) : (
        <p className="text-xs text-soltas-muted">AI turns your description into the filters below. Members only.</p>
      )}
    </form>
  );
}
