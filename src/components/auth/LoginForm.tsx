"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { MissingSupabaseEnvError } from "@/lib/supabaseConfig";
import { supabaseClient } from "@/lib/supabaseClient";

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
    return (
      <div className="rounded-2xl border border-soltas-line bg-white p-6 text-sm text-soltas-muted">
        {supabaseInitializationError?.message}
      </div>
    );
  }

  return <LoginFormContent client={supabase} />;
}

type SupabaseClient = NonNullable<ReturnType<typeof supabaseClient>>;

function LoginFormContent({ client }: { client: SupabaseClient }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    const nextErrors: Record<string, string> = {};
    if (!email.trim()) nextErrors.email = "Email is required.";
    if (!password.trim()) nextErrors.password = "Password is required.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      setMessage({ text: "Signed in! Redirecting...", tone: "success" });
      const returnTo = searchParams.get("returnTo");
      const safeReturnTo = returnTo?.startsWith("/") ? returnTo : "/projects";
      setTimeout(() => {
        router.replace(safeReturnTo);
        router.refresh();
      }, 400);
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Unable to sign in.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-soltas-line bg-white p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="space-y-1 text-sm text-soltas-text">
          <span className="font-medium">Email *</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              errors.email
                ? "border-red-400 focus:ring-red-200"
                : "border-soltas-line focus:ring-soltas-ocean/15"
            }`}
          />
          {errors.email && <p className="text-xs font-semibold text-red-600">{errors.email}</p>}
        </label>

        <label className="space-y-1 text-sm text-soltas-text">
          <span className="font-medium">Password *</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              errors.password
                ? "border-red-400 focus:ring-red-200"
                : "border-soltas-line focus:ring-soltas-ocean/15"
            }`}
          />
          {errors.password && (
            <p className="text-xs font-semibold text-red-600">{errors.password}</p>
          )}
        </label>

        <div className="space-y-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-soltas-ocean px-4 py-2 text-sm font-semibold text-white transition hover:bg-soltas-abyssal disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
          {message && (
            <p
              className={`text-sm font-medium ${
                message.tone === "success" ? "text-soltas-ocean" : "text-red-600"
              }`}
            >
              {message.text}
            </p>
          )}
        </div>
      </form>

      <p className="mt-4 text-center text-sm text-soltas-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-soltas-abyssal hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
