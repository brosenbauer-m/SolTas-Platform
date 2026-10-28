"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Input, fieldClasses } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_EMAIL, SERVICE_KINDS } from "@/lib/contact";

/** Request form for the consulting and storytelling services (About page). Sends an email to the team. */
export default function ServiceRequestForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);

  if (status === "sent") {
    return (
      <FormMessage tone="success">Thanks, your request is on its way. We reply within a few working days.</FormMessage>
    );
  }

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        setStatus("sending");
        setError(null);
        setFallback(null);
        try {
          const res = await fetch("/api/services/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (res.ok) {
            setStatus("sent");
            return;
          }
          const body = (await res.json().catch(() => ({}))) as { error?: string; fallback?: string };
          setError(body.error ?? "Couldn’t send the request.");
          setFallback(body.fallback ?? null);
          setStatus("error");
        } catch {
          setError("Couldn’t send the request.");
          setFallback(`mailto:${CONTACT_EMAIL}`);
          setStatus("error");
        }
      }}
    >
      <Field label="Your name">
        <Input name="name" required minLength={2} maxLength={120} autoComplete="name" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required maxLength={200} autoComplete="email" />
      </Field>
      <Field label="Organisation or project" optional>
        <Input name="organisation" maxLength={200} autoComplete="organization" />
      </Field>
      <Field label="What are you interested in?">
        <select name="service" className={fieldClasses} defaultValue="unsure">
          {SERVICE_KINDS.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Tell us about your work and what you need" hint="A few sentences are enough.">
          <Textarea name="message" required minLength={20} maxLength={4000} rows={5} />
        </Field>
      </div>
      {/* Honeypot for bots; hidden from people and screen readers */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error ? (
        <div className="sm:col-span-2">
          <FormMessage tone="error">
            {error}
            {fallback ? (
              <>
                {" "}
                <a className="font-medium underline" href={fallback}>
                  Email us instead
                </a>
                .
              </>
            ) : null}
          </FormMessage>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
        <p className="text-xs text-soltas-muted">
          Sent by email to {CONTACT_EMAIL}; nothing is stored on the platform.
        </p>
        <Button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send request"}
        </Button>
      </div>
    </form>
  );
}
