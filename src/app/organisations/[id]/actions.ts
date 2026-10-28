"use server";

import { revalidatePath } from "next/cache";

import { getServerSupabase } from "@/lib/supabaseServer";

/**
 * Publishes an update on an organisation's page. RLS decides who may: owners, admins and members with
 * posting rights of that organisation (migration 20260324120019).
 */
export async function createOrganisationUpdate(
  organisationId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Please sign in to publish an update." };

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) return { ok: false, error: "Title and text are required." };
  if (title.length > 160) return { ok: false, error: "Keep the title under 160 characters." };

  const { error } = await supabase.from("organisation_updates").insert({
    organisation_id: organisationId,
    author_user_id: auth.user.id,
    title,
    body,
    visibility: "public",
  });
  if (error) {
    return {
      ok: false,
      error: error.code === "42501" ? "You can’t post for this organisation." : "Couldn’t publish the update.",
    };
  }

  revalidatePath(`/organisations/${organisationId}`);
  revalidatePath("/feed");
  return { ok: true };
}
