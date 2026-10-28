import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabaseServer";

const createFeedPostSchema = z.object({
  content: z.string().min(1, "Content is required").max(5000, "Content is too long"),
  author_organisation_id: z.string().uuid().nullable().optional(),
  entity_type: z.enum(["project", "funding", "issue"]).nullable().optional(),
  entity_id: z.string().uuid().nullable().optional(),
  visibility: z.enum(["public", "followers"]).optional().default("public"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    // Check authentication
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = createFeedPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { content, author_organisation_id, entity_type, entity_id, visibility } = parsed.data;

    // Insert the feed post
    const { data: post, error: insertError } = await supabase
      .from("feed_posts")
      .insert({
        content,
        created_by: auth.user.id,
        author_organisation_id: author_organisation_id ?? null,
        entity_type: entity_type ?? null,
        entity_id: entity_id ?? null,
        visibility,
      })
      .select()
      .single();

    if (insertError) {
      // Database rate limit (migration 20260324120023): tell the person to wait, not that it failed
      if (insertError.message.startsWith("Too many")) {
        return NextResponse.json({ error: insertError.message }, { status: 429 });
      }
      console.error("Insert error:", insertError);
      // Handle RLS errors more gracefully
      if (insertError.code === "42501" || insertError.message.includes("policy")) {
        return NextResponse.json(
          { error: "You do not have permission to post as this organisation" },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: insertError.message || "Failed to create post" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error) {
    console.error("Error creating feed post:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
