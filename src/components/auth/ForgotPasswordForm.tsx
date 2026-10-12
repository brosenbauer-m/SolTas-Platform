"use client";

import { useState } from "react";

import { AuthField, FormMessage } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabaseClient } from "@/lib/supabaseClient";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabaseClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);

    // Rate limits are worth showing; anything else stays generic so the form
    // doesn't reveal whether an account exists.
    if (resetError && resetError.status === 429) {
      setError("Too many requests. Please wait a minute and try again.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-[15px] font-medium text-soltas-text">Check your inbox</p>
        <p className="text-sm text-soltas-muted">
          If an account exists for <span className="font-medium text-soltas-text">{email.trim()}</span>, you&apos;ll get
          an email with a link to reset your password. It can take a minute or two.
        </p>
        <Button variant="ghost" size="sm" onClick={() => setSent(false)}>
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <AuthField label="Email">
        <Input
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </AuthField>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
