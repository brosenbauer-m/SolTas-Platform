import { NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabaseServer";

type AllowedStatus = "pending" | "approved" | "rejected";

function isAllowedStatus(value: unknown): value is AllowedStatus {
  return value === "pending" || value === "approved" || value === "rejected";
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = await getServerSupabase();
  const { id } = await ctx.params;

  // Must be admin/superadmin
  const { data: isAdmin, error: isAdminError } = await supabase.rpc("is_admin");
  if (isAdminError) {
    return NextResponse.json({ error: "Failed to check admin status." }, { status: 500 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { status?: unknown } | null;
  const nextStatus = body?.status;

  if (!isAllowedStatus(nextStatus)) {
    return NextResponse.json(
      { error: "Invalid status. Must be: approved | rejected | archived" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("projects")
    .update({ status: nextStatus })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
