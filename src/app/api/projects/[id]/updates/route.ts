import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSupabase } from "@/lib/supabaseServer";

const payloadSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  body: z.string().trim().min(1, "Text is required").max(10000, "Text is too long"),
  // "public" = everyone who can see the project; "project" = owners, collaborators and shares only
  visibility: z.enum(["public", "project"]).default("public"),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await getServerSupabase();
  const { id } = await ctx.params;

  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid update";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Explicit edit check for a clear error message (also enforced by RLS on insert)
  const { data: canEdit, error: canEditError } = await supabase.rpc("user_can_edit_project", { pid: id });
  if (canEditError) {
    return NextResponse.json({ error: "Failed to check edit permissions" }, { status: 500 });
  }
  if (!canEdit) {
    return NextResponse.json({ error: "Only project owners and editors can post updates" }, { status: 403 });
  }

  // Followers are notified and the feed entry appears via the
  // notify_project_update_published trigger and the activity_feed_items view.
  const { data: update, error: insertError } = await supabase
    .from("project_updates")
    .insert({
      project_id: id,
      author_user_id: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      visibility: parsed.data.visibility,
    })
    .select("id,title,body,visibility,published_at")
    .single();

  if (insertError || !update) {
    return NextResponse.json({ error: insertError?.message ?? "Failed to publish update" }, { status: 500 });
  }

  const { data: project } = await supabase.from("projects").select("slug").eq("id", id).maybeSingle();
  const slugOrId = project?.slug ?? id;

  revalidatePath(`/projects/${slugOrId}`);
  revalidatePath(`/projects/${slugOrId}/edit`);
  revalidatePath("/feed");

  return NextResponse.json({ update }, { status: 201 });
}
