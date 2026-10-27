import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { safeReturnTo } from "@/lib/safeRedirect";
import { ensureSupabaseConfig } from "@/lib/supabaseConfig";

/**
 * Landing point for links in Supabase emails (sign-up confirmation, password reset).
 * Exchanges the one-time code for a session and stores the session cookies on the redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const next = safeReturnTo(nextParam, "/");

  if (!code) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  const { url, anonKey } = ensureSupabaseConfig();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }
  return response;
}
