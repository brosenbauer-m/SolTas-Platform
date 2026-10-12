import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileSummary = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  organisation_name: string | null;
  role: string;
};

/**
 * Load display fields for a set of user ids.
 *
 * Columns like created_by / approved_by / author_user_id reference auth.users, not profiles,
 * so PostgREST cannot embed profiles on them. Fetch the profiles separately and look them up.
 */
export async function fetchProfilesByIds(
  supabase: SupabaseClient,
  ids: Array<string | null | undefined>,
): Promise<Map<string, ProfileSummary>> {
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  if (unique.length === 0) return new Map();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, first_name, last_name, organisation_name, role")
    .in("id", unique);

  return new Map(((data ?? []) as ProfileSummary[]).map((p) => [p.id, p]));
}

/** Best display name for a profile: full name, then first + last, then organisation name. */
export function profileDisplayName(profile: ProfileSummary | null | undefined): string | null {
  if (!profile) return null;
  const parts = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return profile.full_name?.trim() || parts || profile.organisation_name?.trim() || null;
}

/** PostgREST returns a to-one embed as an object, a to-many embed as an array. Accept either. */
export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
