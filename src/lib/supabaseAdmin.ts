import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { ensureSupabaseConfig } from "@/lib/supabaseConfig";

/**
 * Service-role client: bypasses RLS. Server code only (API routes), never in client components, and only for
 * writes RLS deliberately keeps from users: AI-created tags, AI tag links, the AI usage log.
 * Returns null when SUPABASE_SERVICE_ROLE_KEY isn't set, so features that need it switch off cleanly.
 */
export function getAdminSupabase() {
  if (typeof window !== "undefined") throw new Error("getAdminSupabase() is server-only");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const { url } = ensureSupabaseConfig();
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
