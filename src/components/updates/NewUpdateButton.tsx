"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type NewUpdateButtonProps = {
  isAuthenticated: boolean;
  // Only project updates can be published so far; without a project the button stays a placeholder.
  projectId?: string;
};

type Visibility = "public" | "project";

export default function NewUpdateButton({ isAuthenticated, projectId }: NewUpdateButtonProps) {
  const [open, setOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center justify-center rounded-lg border border-soltas-line bg-white px-3 py-2 text-sm font-medium text-soltas-muted cursor-not-allowed opacity-60"
      >
        Log in to post an update
      </button>
    );
  }

  const handleClick = () => {
    if (!projectId) {
      alert("Publishing updates coming soon!");
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center justify-center rounded-lg bg-soltas-ocean px-3 py-2 text-sm font-medium text-white hover:bg-soltas-abyssal"
      >
        New update
      </button>
      {open && projectId ? <UpdateComposerModal projectId={projectId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function UpdateComposerModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const headingId = useId();

  useEffect(() => {
    titleRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSubmitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !body.trim()) {
      setError("Please add a title and some text.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), visibility }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to publish update" }));
        throw new Error(data.error || "Failed to publish update");
      }

      toast({
        title: "Update published",
        description:
          visibility === "public"
            ? "Followers of this project have been notified."
            : "Only project members can see this update.",
        duration: 3000,
      });
      onClose();
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish update");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-soltas-line bg-white p-5 shadow-xl"
      >
        <h2 id={headingId} className="text-base font-semibold text-soltas-text">
          New project update
        </h2>

        <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <label htmlFor={`${headingId}-title`} className="text-sm font-medium text-soltas-text">
              Title
            </label>
            <input
              ref={titleRef}
              id={`${headingId}-title`}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              disabled={isSubmitting}
              className="w-full rounded-md border border-soltas-line px-3 py-2 text-sm text-soltas-text focus:outline-none focus:ring-2 focus:ring-soltas-ocean"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor={`${headingId}-body`} className="text-sm font-medium text-soltas-text">
              What&apos;s new?
            </label>
            <Textarea
              id={`${headingId}-body`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              maxLength={10000}
              disabled={isSubmitting}
              className="resize-y"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-soltas-text">Visible to</legend>
            <label className="flex items-start gap-2 text-sm text-soltas-text">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === "public"}
                onChange={() => setVisibility("public")}
                disabled={isSubmitting}
                className="mt-1"
              />
              <span>
                Everyone who can see the project
                <span className="block text-xs text-soltas-muted">Followers get a notification and it appears in the feed.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-soltas-text">
              <input
                type="radio"
                name="visibility"
                value="project"
                checked={visibility === "project"}
                onChange={() => setVisibility("project")}
                disabled={isSubmitting}
                className="mt-1"
              />
              <span>
                Project members only
                <span className="block text-xs text-soltas-muted">Owners, collaborators and people the project is shared with.</span>
              </span>
            </label>
          </fieldset>

          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Publishing…" : "Publish update"}
          </Button>
        </div>
      </form>
    </div>
  );
}
