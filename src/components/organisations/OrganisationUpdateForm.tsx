"use client";

import { useState, useTransition } from "react";

import { createOrganisationUpdate } from "@/app/organisations/[id]/actions";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** "New update" for organisation pages, shown to members who may post. Collapsed to one button until used. */
export default function OrganisationUpdateForm({ organisationId }: { organisationId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          New update
        </Button>
        {done ? <FormMessage tone="success">Published.</FormMessage> : null}
      </div>
    );
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-soltas-line bg-soltas-off-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        setError(null);
        start(async () => {
          const result = await createOrganisationUpdate(organisationId, data);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          form.reset();
          setDone(true);
          setOpen(false);
        });
      }}
    >
      <Field label="Title">
        <Input name="title" required maxLength={160} placeholder="What happened?" />
      </Field>
      <Field label="Text" hint="Shown on your page and in the feed.">
        <Textarea name="body" required rows={4} />
      </Field>
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Publishing…" : "Publish"}
        </Button>
      </div>
    </form>
  );
}
