"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthField, FormMessage } from "@/components/auth/AuthShell";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabaseClient } from "@/lib/supabaseClient";

const MIN_LENGTH = 8;

export default function ResetPasswordForm() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabaseClient()
      .auth.getUser()
      .then(({ data }) => setHasSession(Boolean(data.user)));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error: updateError } = await supabaseClient().auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (hasSession === null) return <div className="h-[232px]" />;

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-[15px] font-medium text-soltas-text">Your password has been changed.</p>
        <Link href="/projects" className={buttonClasses({ className: "w-full" })}>
          Continue
        </Link>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-soltas-muted">
          This reset link has expired or was opened in a different browser. Request a new one and open it on this
          device.
        </p>
        <Link href="/forgot-password" className={buttonClasses({ className: "w-full" })}>
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <AuthField label="New password">
        <Input
          type="password"
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </AuthField>
      <AuthField label="Repeat new password">
        <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </AuthField>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
