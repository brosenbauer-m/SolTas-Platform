"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";

import { supabaseClient } from "@/lib/supabaseClient";

export type TagOption = { id: string; slug: string; label: string };
export type ProjectTag = TagOption & { added_by: string };

type Props = {
  projectId: string;
  initialTags: ProjectTag[];
  /** People who can edit the project may remove tags and add tags from the shared list. */
  canEdit: boolean;
  /** The shared tag list (only passed to editors). */
  vocabulary?: TagOption[];
};

/**
 * A project's tags from the shared, standardised list (public.tags). Everyone sees them as links to Find
 * Projects; editors can remove them, add existing tags, or ask for a new tag (admins review the request).
 */
export default function ProjectTags({ projectId, initialTags, canEdit, vocabulary = [] }: Props) {
  const [tags, setTags] = useState<ProjectTag[]>(initialTags);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requestLabel, setRequestLabel] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const supabase = useMemo(() => supabaseClient(), []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const taken = new Set(tags.map((tag) => tag.id));
    return vocabulary.filter((tag) => !taken.has(tag.id) && (!q || tag.label.toLowerCase().includes(q))).slice(0, 8);
  }, [query, tags, vocabulary]);

  if (!tags.length && !canEdit) return null;

  const remove = async (tag: ProjectTag) => {
    setError(null);
    const { error: deleteError } = await supabase
      .from("project_tags")
      .delete()
      .eq("project_id", projectId)
      .eq("tag_id", tag.id);
    if (deleteError) setError("Couldn’t remove the tag. Please try again.");
    else setTags((current) => current.filter((item) => item.id !== tag.id));
  };

  const add = async (tag: TagOption) => {
    setError(null);
    const { error: insertError } = await supabase
      .from("project_tags")
      .insert({ project_id: projectId, tag_id: tag.id, added_by: "user" });
    if (insertError) {
      setError("Couldn’t add the tag. Please try again.");
      return;
    }
    setTags((current) => [...current, { ...tag, added_by: "user" }].sort((a, b) => a.label.localeCompare(b.label)));
    setQuery("");
    setAdding(false);
  };

  const sendRequest = async () => {
    const label = requestLabel.trim();
    if (label.length < 2) return;
    setError(null);
    const { error: requestError } = await supabase
      .from("tag_requests")
      .insert({ label, reason: requestReason.trim() || null, project_id: projectId });
    if (requestError) {
      setError("Couldn’t send the request. Please try again.");
      return;
    }
    setRequestSent(true);
    setRequesting(false);
    setRequestLabel("");
    setRequestReason("");
  };

  return (
    <div className="mt-4">
      <ul className="flex flex-wrap items-center gap-2" aria-label="Tags">
        {tags.map((tag) => (
          <li key={tag.id} className="inline-flex items-center rounded-full bg-soltas-ocean/10 text-xs font-medium text-soltas-ocean">
            <Link href={`/projects?tag=${encodeURIComponent(tag.slug)}`} className="px-3 py-1 hover:underline">
              {tag.label}
            </Link>
            {canEdit ? (
              <button
                type="button"
                onClick={() => remove(tag)}
                aria-label={`Remove tag ${tag.label}`}
                className="-ml-1 mr-1 grid h-6 w-6 place-items-center rounded-full hover:bg-soltas-ocean/15"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            ) : null}
          </li>
        ))}
        {canEdit && !adding ? (
          <li>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex min-h-7 items-center gap-1 rounded-full border border-dashed border-soltas-line px-3 py-1 text-xs font-medium text-soltas-muted hover:border-soltas-ocean/40 hover:text-soltas-ocean"
            >
              <Plus className="h-3 w-3" aria-hidden />
              Add tag
            </button>
          </li>
        ) : null}
      </ul>

      {canEdit && adding ? (
        <div className="mt-3 max-w-md rounded-2xl border border-soltas-line bg-white p-3 shadow-sm">
          <label className="text-xs font-medium text-soltas-muted" htmlFor={`tag-search-${projectId}`}>
            Add a tag from the list
          </label>
          <input
            id={`tag-search-${projectId}`}
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type to search, e.g. water"
            className="mt-1 w-full rounded-xl border border-soltas-line px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-soltas-ocean"
          />
          <ul className="mt-2 max-h-56 overflow-y-auto">
            {matches.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  onClick={() => add(tag)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-soltas-text hover:bg-soltas-off-white"
                >
                  {tag.label}
                </button>
              </li>
            ))}
            {!matches.length ? <li className="px-3 py-2 text-sm text-soltas-muted">No matching tag.</li> : null}
          </ul>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-soltas-line pt-2">
            <button
              type="button"
              onClick={() => {
                setRequesting(true);
                setRequestLabel(query.trim());
                setAdding(false);
              }}
              className="text-xs font-medium text-soltas-ocean hover:underline"
            >
              Missing a tag? Ask for a new one
            </button>
            <button type="button" onClick={() => setAdding(false)} className="text-xs text-soltas-muted hover:underline">
              Close
            </button>
          </div>
        </div>
      ) : null}

      {canEdit && requesting ? (
        <div className="mt-3 max-w-md space-y-2 rounded-2xl border border-soltas-line bg-white p-3 shadow-sm">
          <p className="text-sm font-medium text-soltas-text">Ask for a new tag</p>
          <p className="text-xs text-soltas-muted">
            Tags are shared by all projects so they stay consistent. An admin will review your suggestion.
          </p>
          <label className="block text-xs font-medium text-soltas-muted" htmlFor={`tag-request-${projectId}`}>
            Tag name
          </label>
          <input
            id={`tag-request-${projectId}`}
            value={requestLabel}
            maxLength={80}
            onChange={(event) => setRequestLabel(event.target.value)}
            className="w-full rounded-xl border border-soltas-line px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-soltas-ocean"
          />
          <label className="block text-xs font-medium text-soltas-muted" htmlFor={`tag-reason-${projectId}`}>
            Why is it needed? (optional)
          </label>
          <textarea
            id={`tag-reason-${projectId}`}
            value={requestReason}
            maxLength={500}
            rows={2}
            onChange={(event) => setRequestReason(event.target.value)}
            className="w-full rounded-xl border border-soltas-line px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-soltas-ocean"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={sendRequest}
              disabled={requestLabel.trim().length < 2}
              className="rounded-full bg-soltas-ocean px-4 py-2 text-xs font-semibold text-white hover:bg-soltas-abyssal disabled:opacity-50"
            >
              Send request
            </button>
            <button type="button" onClick={() => setRequesting(false)} className="px-3 text-xs text-soltas-muted hover:underline">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {requestSent ? (
        <p className="mt-2 text-xs text-soltas-green" role="status">
          Thanks! An admin will review your tag suggestion.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
