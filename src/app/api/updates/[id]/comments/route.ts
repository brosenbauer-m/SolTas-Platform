import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabaseServer";

const createCommentSchema = z.object({
  body: z.string().min(1).max(2000),
});

/**
 * GET /api/updates/:id/comments
 * Fetch comments for an update
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: updateId } = await context.params;

  if (!updateId || typeof updateId !== "string") {
    return NextResponse.json({ error: "Invalid update ID" }, { status: 400 });
  }

  const supabase = await getServerSupabase();

  // Get current user (optional, for canDelete)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch comments. author_user_id references auth.users (not profiles), so PostgREST
  // cannot embed profiles here; load author names in a second query instead.
  const { data: comments, error } = await supabase
    .from("update_comments")
    .select("id, body, created_at, author_user_id")
    .eq("update_id", updateId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const authorIds = Array.from(new Set((comments ?? []).map((c) => c.author_user_id).filter(Boolean)));
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", authorIds)
    : { data: [] as Array<{ id: string; first_name: string | null; last_name: string | null }> };
  const authorNames = new Map(
    (authors ?? []).map((a) => [a.id, [a.first_name, a.last_name].filter(Boolean).join(" ").trim()]),
  );

  // Transform to match the Comment interface expected by the UI component
  const formattedComments = (comments ?? []).map((comment) => ({
    id: comment.id,
    authorName: authorNames.get(comment.author_user_id) || "Anonymous",
    body: comment.body,
    createdAt: comment.created_at,
    canDelete: user?.id === comment.author_user_id,
  }));

  return NextResponse.json({ comments: formattedComments });
}

/**
 * POST /api/updates/:id/comments
 * Create a new comment on an update
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: updateId } = await context.params;

  if (!updateId || typeof updateId !== "string") {
    return NextResponse.json({ error: "Invalid update ID" }, { status: 400 });
  }

  const supabase = await getServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  // Insert comment
  const { data: comment, error: insertError } = await supabase
    .from("update_comments")
    .insert({
      update_id: updateId,
      author_user_id: user.id,
      body: parsed.data.body,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ comment }, { status: 201 });
}
