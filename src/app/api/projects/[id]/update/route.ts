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

  if (data.start_date && data.end_date && data.end_date < data.start_date) {
    return NextResponse.json({ error: "The end date is before the start date." }, { status: 400 });
  }

  // One database function saves the row and replaces links, partners and goals in a single transaction,
  // so a failed step can't leave the project without them (migration 20260324120020).
  const { data: saved, error: saveError } = await supabase.rpc("update_project_submission", {
    p_id: id,
    p_category: data.category,
    p_name: data.name,
    p_description: data.description ?? null,
    p_lead_org_id: data.lead_org_id ?? null,
    p_lat: data.location.lat,
    p_lng: data.location.lng,
    p_place_name: data.location.place_name,
    p_type_of_intervention: data.type_of_intervention ?? [],
    p_target_demographic: data.target_demographic ?? null,
    p_lives_improved: data.lives_improved ?? null,
    p_start_date: data.start_date ?? null,
    p_end_date: data.end_date ?? null,
    p_thematic_area: data.thematic_area ?? [],
    p_donations_received: data.donations_received ?? null,
    p_amount_needed: data.amount_needed ?? null,
    p_currency: data.currency ?? "USD",
    p_links: (data.links ?? []).filter(l => l.url.trim().length > 0).map(l => ({ url: l.url.trim(), label: l.label ?? null })),
    p_partner_org_ids: data.partner_org_ids ?? [],
    p_sdg_ids: data.sdg_ids ?? [],
    p_ifrc_ids: data.ifrc_ids ?? [],
  } as never);

  if (saveError) {
    const status = saveError.code === "42501" ? 403 : 400;
    return NextResponse.json({ error: saveError.message }, { status });
  }
  const updated = (Array.isArray(saved) ? saved[0] : saved) as { id: string; slug: string | null } | undefined;
  if (!updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }

  // Projects saved before tagging existed get AI tags once; projects that have tags keep them as they are.
  after(() => autoTagProject(id, user.id));

  return NextResponse.json(updated);
}
