import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { ensureSupabaseConfig } from "@/lib/supabaseConfig";

/**
 * Cookie-less anon client for public data (RLS applies as for visitors). Responses built from it can be
 * cached by the CDN because they don't depend on who is signed in.
 */
export function getPublicSupabase() {
  const { url, anonKey } = ensureSupabaseConfig();
  return createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
