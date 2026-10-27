import { after, NextResponse } from "next/server";
import { z } from "zod";

import { getServerSupabase } from "@/lib/supabaseServer";
import { autoTagProject } from "@/lib/ai/autoTag";

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  place_name: z.string().trim().min(1),
});

const linkSchema = z
  .object({
    url: z.string().trim().url(),
    label: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .transform(value => (value ? value.trim() : undefined)),
  });

const payloadSchema = z
  .object({
    owner_type: z.enum(["user", "organisation"] as const),
    owner_id: z.string().uuid(),
    category: z.enum(["humanitarian", "environmental"] as const),
    name: z.string().trim().min(1),
    description: z.string().trim().optional(),
    lead_org_id: z.string().uuid().optional(),
    links: z.array(linkSchema).optional(),
    partner_org_ids: z.array(z.string().uuid()).optional(),
    sdg_ids: z.array(z.number().int()).optional(),
    ifrc_ids: z.array(z.number().int()).optional(),
    type_of_intervention: z.array(z.string()).optional(),
    thematic_area: z.array(z.string()).optional(),
    target_demographic: z.string().trim().optional(),
    lives_improved: z.number().int().optional(),
    start_date: z
      .string()
      .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
      .optional(),
    end_date: z
      .string()
      .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
      .optional(),
    donations_received: z.number().optional(),
    amount_needed: z.number().optional(),
    currency: z.string().trim().length(3).optional(),
    location: locationSchema,
    post_to_feed: z.boolean().optional(),
    feed_message: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    const hasDescription = Boolean(value.description && value.description.trim().length);
    const linkCount = value.links?.filter(link => link.url.trim().length > 0).length ?? 0;
    if (!hasDescription && linkCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["description"],
        message: "Add a description or at least one supporting link",
      });
    }
    if (value.start_date && value.end_date && value.start_date > value.end_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_date"],
        message: "End date must be after start date",
      });
    }
  });

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await req.json();
  const result = payloadSchema.safeParse(body);

  if (!result.success) {
    const categoryIssue = result.error.issues.find(issue => issue.path[0] === "category");
    if (categoryIssue) {
      return NextResponse.json(
        { error: "Project category must be either humanitarian or environmental." },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const data = result.data;
  const links =
    data.links
      ?.filter(link => link.url.trim().length > 0)
      .map(link => ({
        url: link.url.trim(),
        label: link.label,
      })) ?? null;

  const { data: submission, error } = await supabase.rpc("create_project_submission", {
    p_owner_type: data.owner_type,
    p_owner_id: data.owner_id,
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
    p_currency: (data.currency ?? "USD").toUpperCase(),
    p_links: links && links.length ? links : null,
    p_partner_org_ids: data.partner_org_ids ?? [],
    p_sdg_ids: data.sdg_ids ?? [],
    p_ifrc_ids: data.ifrc_ids ?? [],
  });

  if (error || !submission || submission.length === 0) {
    return NextResponse.json({ error: error?.message ?? "Unable to submit project" }, { status: 400 });
  }

  const projectId = submission[0].id;

  const { error: categoryError } = await supabase
    .from("projects")
    .update({ category: data.category })
    .eq("id", projectId)
    .eq("created_by", user.id);

  if (categoryError) {
    return NextResponse.json({ error: categoryError.message }, { status: 400 });
  }

  // Handle feed post if requested
  let feedPostWarning: string | undefined;
  if (data.post_to_feed) {
    const feedContent = data.feed_message
      ? `${data.feed_message}\n\nNew project: ${data.name}`
      : `New project: ${data.name}`;

    const feedPostData = {
      created_by: user.id,
      author_organisation_id: data.owner_type === "organisation" ? data.owner_id : null,
      visibility: "public" as const,
      content: feedContent,
      entity_type: "project" as const,
      entity_id: projectId,
    };

    const { error: feedError } = await supabase
      .from("feed_posts")
      .insert(feedPostData);

    if (feedError) {
      // Non-blocking warning
      feedPostWarning = "Project created successfully, but could not post to feed.";
    }
  }

  // Standard tags from the shared list, chosen by the AI after the response is sent (no wait for the person).
  after(() => autoTagProject(projectId, user.id));

  return NextResponse.json({
    ...submission[0],
    ...(feedPostWarning && { warning: feedPostWarning }),
  });
}
