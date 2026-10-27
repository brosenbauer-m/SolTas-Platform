import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseConfig } from "@/lib/supabaseConfig";

const redirectFundingPath = (request: NextRequest, prefix: string) => {
  const { pathname, search } = request.nextUrl;
  if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
    const targetPath = pathname.replace(prefix, "/funding");
    return NextResponse.redirect(new URL(`${targetPath}${search}`, request.url));
  }
  return null;
};

/** API routes whose answers are public and cached by the CDN (Cache-Control: public). */
const SHARED_CACHE_ROUTES = ["/api/projects/points", "/api/projects/at", "/api/projects/summary", "/api/home-stats"];

/**
 * Keeps the Supabase login fresh. Server Components can't write cookies, so when the access token expires
 * (after an hour) the refreshed tokens must be saved here, on every request, or people appear logged out.
 * The standard @supabase/ssr pattern: refresh via getUser() and copy the new cookies onto the response.
 */
async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = getSupabaseConfig();
  if (!config) return response; // not configured (e.g. a build without env): nothing to refresh
  const { url, anonKey } = config;
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Don't put code between createServerClient and getUser(): it decides whether the tokens are refreshed.
  await supabase.auth.getUser();
  return response;
}

export async function middleware(request: NextRequest) {
  const grantsRedirect = redirectFundingPath(request, "/grants");
  if (grantsRedirect) return grantsRedirect;

  const findGrantsRedirect = redirectFundingPath(request, "/find-grants");
  if (findGrantsRedirect) return findGrantsRedirect;

  // Visitors without a login cookie need no refresh (saves a call to Supabase Auth on every page).
  if (!request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"))) return NextResponse.next();

  // Public answers shared through the CDN must never carry anyone's refreshed login cookie.
  if (SHARED_CACHE_ROUTES.some((route) => request.nextUrl.pathname.startsWith(route))) return NextResponse.next();

  return refreshSession(request);
}

export const config = {
  // Everything except static files and images; public API routes that don't use the login skip quickly above.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)"],
};
