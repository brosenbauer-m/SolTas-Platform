import { after, NextResponse } from "next/server";
import { z } from "zod";

import { getServerSupabase } from "@/lib/supabaseServer";
import { autoTagProject } from "@/lib/ai/autoTag";

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  place_name: z.string().trim().min(1),
});

const linkSchema = z.object({
  url: z.string().trim().url(),
  label: z.string().trim().optional().nullable(),
});

const payloadSchema = z.object({
  category: z.string().trim().min(1),
  name: z.string().trim().min(2),
  description: z.string().trim().optional().nullable(),
  lead_org_id: z.string().uuid().optional().nullable(),
  location: locationSchema,
  type_of_intervention: z.array(z.string().trim()).optional().nullable(),
  target_demographic: z.string().trim().optional().nullable(),
  lives_improved: z.number().int().nonnegative().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  thematic_area: z.array(z.string().trim()).optional().nullable(),
  donations_received: z.number().nonnegative().optional().nullable(),
  amount_needed: z.number().nonnegative().optional().nullable(),
  currency: z
    .string()
    .trim()
    .length(3)
    .optional()
    .nullable()
    .transform(v => (v ? v.toUpperCase() : v)),
  links: z.array(linkSchema).optional().nullable(),
  partner_org_ids: z.array(z.string().uuid()).optional().nullable(),
  sdg_ids: z.array(z.number().int()).optional().nullable(),
  ifrc_ids: z.array(z.number().int()).optional().nullable(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await getServerSupabase();
  const { id } = await ctx.params;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Explicit edit check (also still enforced by RLS on updates/inserts)
  const { data: canEdit, error: canEditError } = await supabase.rpc("user_can_edit_project", { pid: id });
  if (canEditError) {
    return NextResponse.json({ error: "Failed to check edit permissions" }, { status: 500 });
  }
  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = parsed.data;

  // Update main project row
  const { data: updated, error: updateError } = await supabase
    .from("projects")
    .update({
      category: data.category,
      name: data.name,
      description: data.description ?? null,
      lead_org_id: data.lead_org_id ?? null,
      lat: data.location.lat,
      lng: data.location.lng,
      place_name: data.location.place_name,
      type_of_intervention: data.type_of_intervention ?? [],
      target_demographic: data.target_demographic ?? null,
      lives_improved: data.lives_improved ?? null,
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      thematic_area: data.thematic_area ?? [],
      donations_received: data.donations_received ?? null,
      amount_needed: data.amount_needed ?? null,
      currency: (data.currency ?? "USD").toUpperCase(),
    })
    .eq("id", id)
    .select("id, slug")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message ?? "Update failed" }, { status: 400 });
  }

  // Replace links (simple + consistent)
  const links =
    data.links
      ?.filter(l => l.url && l.url.trim().length > 0)
      .map(l => ({ project_id: id, url: l.url.trim(), label: l.label ?? null })) ?? [];

  // Clear + reinsert child rows (keeps logic simple; RLS still enforced)
  const ops = [
    supabase.from("project_links").delete().eq("project_id", id),
    supabase.from("project_partners").delete().eq("project_id", id),
    supabase.from("project_sdgs").delete().eq("project_id", id),
    supabase.from("project_ifrc_challenges").delete().eq("project_id", id),
  ];

  for (const op of ops) {
    const { error } = await op;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (links.length) {
    const { error } = await supabase.from("project_links").insert(links);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const partnerRows = (data.partner_org_ids ?? []).map(orgId => ({ project_id: id, organisation_id: orgId }));
  if (partnerRows.length) {
    const { error } = await supabase.from("project_partners").insert(partnerRows);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const sdgRows = (data.sdg_ids ?? []).map(sdgId => ({ project_id: id, sdg_id: sdgId }));
  if (sdgRows.length) {
    const { error } = await supabase.from("project_sdgs").insert(sdgRows);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const ifrcRows = (data.ifrc_ids ?? []).map(challengeId => ({ project_id: id, challenge_id: challengeId }));
  if (ifrcRows.length) {
    const { error } = await supabase.from("project_ifrc_challenges").insert(ifrcRows);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Projects saved before tagging existed get AI tags once; projects that have tags keep them as they are.
  after(() => autoTagProject(id, user.id));

  return NextResponse.json(updated);
}
