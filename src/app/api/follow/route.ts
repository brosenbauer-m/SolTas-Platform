import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSupabase } from "@/lib/supabaseServer";

const followPayloadSchema = z.object({
  targetType: z.enum(["person", "org", "project", "issue"]),
  targetId: z.string().uuid(),
});

type TargetType = "person" | "org" | "project" | "issue";

function buildTargetColumn(targetType: TargetType) {
  switch (targetType) {
    case "person":
      return "target_person_id";
    case "org":
      return "target_org_id";
    case "project":
      return "target_project_id";
    case "issue":
      return "target_issue_id";
  }
}

function buildOnConflict(targetType: TargetType) {
  return `follower_user_id,target_type,${buildTargetColumn(targetType)}`;
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const body = await req.json().catch(() => null);
  const validation = followPayloadSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: "Invalid follow payload." }, { status: 400 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { targetType, targetId } = validation.data;
  const targetColumn = buildTargetColumn(targetType);
  const onConflict = buildOnConflict(targetType);

  const { error } = await supabase
    .from("follow_edges")
    .upsert(
      {
        follower_user_id: user.id,
        target_type: targetType,
        [targetColumn]: targetId,
      },
      { onConflict, ignoreDuplicates: true }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await getServerSupabase();
  const body = await req.json().catch(() => null);
  const validation = followPayloadSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: "Invalid follow payload." }, { status: 400 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { targetType, targetId } = validation.data;
  const targetColumn = buildTargetColumn(targetType);

  const { error } = await supabase
    .from("follow_edges")
    .delete()
    .eq("follower_user_id", user.id)
    .eq("target_type", targetType)
    .eq(targetColumn, targetId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
