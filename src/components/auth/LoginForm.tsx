"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthField, FormMessage } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MissingSupabaseEnvError } from "@/lib/supabaseConfig";
import { supabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

let supabaseInitializationError: MissingSupabaseEnvError | null = null;
let supabase: ReturnType<typeof supabaseClient> | null = null;

try {
  supabase = supabaseClient();
} catch (error) {
  if (error instanceof MissingSupabaseEnvError) {
    supabaseInitializationError = error;
    supabase = null;
  } else {
    throw error;
  }
}

export default function LoginForm() {
  if (!supabase) {
    return <p className="text-sm text-soltas-muted">{supabaseInitializationError?.message}</p>;
  }

  return <LoginFormContent client={supabase} />;
}

type SupabaseClient = NonNullable<ReturnType<typeof supabaseClient>>;

const LINK_ERRORS: Record<string, string> = {
  link: "That link has expired or was already used. Please sign in, or request a new link.",
};

function LoginFormContent({ client }: { client: SupabaseClient }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "error" | "success" } | null>(() => {
    const code = searchParams.get("error");
    return code && LINK_ERRORS[code] ? { text: LINK_ERRORS[code], tone: "error" } : null;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    const nextErrors: Record<string, string> = {};
    if (!email.trim()) nextErrors.email = "Enter your email address.";
    if (!password) nextErrors.password = "Enter your password.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setLoading(false);
      setMessage({
        text:
          error.message === "Invalid login credentials"
            ? "That email and password don't match. Try again, or reset your password."
            : error.message,
        tone: "error",
      });
      return;
    }

    const returnTo = searchParams.get("returnTo");
    const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/projects";
    router.replace(safeReturnTo);
    router.refresh();
  }

  const invalid = (key: string) => cn(errors[key] && "border-rose-400 focus:border-rose-400 focus-visible:ring-rose-100");

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}

      <AuthField label="Email" error={errors.email}>
        <Input
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
          className={invalid("email")}
        />
      </AuthField>

      <AuthField
        label="Password"
        error={errors.password}
        aside={
          <Link href="/forgot-password" className="text-[13px] font-normal text-soltas-ocean hover:underline">
            Forgot password?
          </Link>
        }
      >
        <Input
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(errors.password)}
          className={invalid("password")}
        />
      </AuthField>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
