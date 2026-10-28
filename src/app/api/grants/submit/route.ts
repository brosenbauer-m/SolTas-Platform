import { NextResponse } from "next/server";
import { z } from "zod";

import { isApplicantType } from "@/lib/grants/applicantTypes";

import { getServerSupabase } from "@/lib/supabaseServer";

const payloadSchema = z
  .object({
    title: z.string().trim().min(1),
    summary: z.string().trim().optional().nullable(),
    description: z.string().trim().optional().nullable(),
    project_type: z.enum(["environmental", "humanitarian", "both"] as const),
    funding_type: z.enum(["grant", "prize", "fellowship", "loan", "equity", "in-kind", "other"] as const),
    application_url: z.string().trim().url(),
    funder_name: z.string().trim().optional().nullable(),
    funder_website: z.string().trim().optional().nullable(),
    contact_email: z.string().trim().optional().nullable(),
    currency: z.string().trim().length(3).optional().nullable(),
    amount_min: z.number().nonnegative().optional().nullable(),
    amount_max: z.number().nonnegative().optional().nullable(),
    open_date: z.string().optional().nullable(),
    deadline: z.string().optional().nullable(),
    decision_date: z.string().optional().nullable(),
    start_date: z.string().optional().nullable(),
    eligible_countries: z.array(z.string()).optional().nullable(),
    applicant_types: z.array(z.string()).optional().nullable(),
    remote_ok: z.boolean().optional().nullable(),
    location_name: z.string().trim().optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    themes: z.array(z.string()).optional().nullable(),
    sdgs: z.array(z.number().int()).optional().nullable(),
    keywords: z.array(z.string()).optional().nullable(),
    post_to_feed: z.boolean().optional().nullable(),
    feed_message: z.string().trim().max(1000).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (
      typeof value.amount_min === "number" &&
      typeof value.amount_max === "number" &&
      value.amount_min > value.amount_max
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount_max"],
        message: "Maximum amount must be greater than minimum amount",
      });
    }
  });

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "grant";

const ensureUniqueSlug = async (supabase: Awaited<ReturnType<typeof getServerSupabase>>, base: string) => {
  let slug = base;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data } = await supabase.from("grants").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${crypto.randomUUID().slice(0, 6)}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
};

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const result = payloadSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const data = result.data;
  const baseSlug = slugify(data.title);
  const slug = await ensureUniqueSlug(supabase, baseSlug);

  const { data: grant, error } = await supabase
    .from("grants")
    .insert({
      title: data.title,
      summary: data.summary ?? null,
      description: data.description ?? null,
      project_type: data.project_type,
      funding_type: data.funding_type,
      application_url: data.application_url,
      funder_name: data.funder_name ?? null,
      funder_website: data.funder_website ?? null,
      contact_email: data.contact_email ?? null,
      currency: (data.currency ?? "EUR").toUpperCase(),
      amount_min: data.amount_min ?? null,
      amount_max: data.amount_max ?? null,
      open_date: data.open_date ?? null,
      deadline: data.deadline ?? null,
      decision_date: data.decision_date ?? null,
      start_date: data.start_date ?? null,
      eligible_countries: data.eligible_countries ?? [],
      applicant_types: (data.applicant_types ?? []).filter(isApplicantType),
      remote_ok: data.remote_ok ?? true,
      location_name: data.location_name ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      themes: data.themes ?? [],
      sdgs: data.sdgs ?? [],
      keywords: data.keywords ?? [],
      created_by: user.id,
      is_published: false,
      status: "open",
      slug,
    })
    .select("id, slug")
    .single();

  if (error || !grant) {
    return NextResponse.json({ error: error?.message ?? "Unable to submit funding" }, { status: 400 });
  }

  // If post_to_feed is true and feed_message is provided, insert into feed_posts
  if (data.post_to_feed && data.feed_message) {
    const { error: feedError } = await supabase.from("feed_posts").insert({
      created_by: user.id,
      author_organisation_id: null,
      content: data.feed_message,
      entity_type: "funding",
      entity_id: grant.id,
      visibility: "public",
      published_at: new Date().toISOString(),
    });

    if (feedError) {
      console.error("Failed to post to feed:", feedError);
      // Continue anyway - the grant was created successfully
    }
  }

  return NextResponse.json(grant);
}
