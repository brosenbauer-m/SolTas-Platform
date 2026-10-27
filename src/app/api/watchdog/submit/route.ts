import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSupabase } from "@/lib/supabaseServer";

const payloadSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(8000, "Description is too long"),
  country: z.string().trim().min(1, "Country is required"),
  region: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().min(1, "City is required"),
  latitude: z.number(),
  longitude: z.number(),
  sdgs: z.array(z.number().int()).optional().default([]),
  global_challenges: z.array(z.string().trim()).optional().default([]),
  affected_demographics: z.array(z.string().trim()).optional().default([]),
  affected_groups_text: z.string().trim().max(500).optional().or(z.literal("")),
  urgency: z.number().int().min(1).max(5).optional().default(3),
  date_observed: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
    .optional()
    .or(z.literal("")),
  evidence_links: z.array(z.string().trim().url()).optional().default([]),
  desired_outcome: z.string().trim().max(2000).optional().or(z.literal("")),
  contact_allowed: z.boolean().optional().default(true),
  reporter_anonymous: z.boolean().optional().default(false),
  post_to_feed: z.boolean().optional().default(false),
  feed_message: z.string().trim().optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const result = payloadSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const data = result.data;

  const { data: inserted, error } = await supabase
    .from("watchdog_issues")
    .insert({
      created_by: user.id,
      owner_type: "user",
      owner_id: user.id,
      title: data.title,
      description: data.description,
      country: data.country,
      region: data.region || null,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      sdgs: data.sdgs ?? [],
      global_challenges: data.global_challenges ?? [],
      affected_demographics: data.affected_demographics ?? [],
      affected_groups_text: data.affected_groups_text || null,
      urgency: data.urgency ?? 3,
      date_observed: data.date_observed || null,
      evidence_links: data.evidence_links ?? [],
      desired_outcome: data.desired_outcome || null,
      contact_allowed: data.contact_allowed ?? true,
      reporter_anonymous: data.reporter_anonymous ?? false,
    })
    .select("id,status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // If user wants to post to feed, create a feed post
  if (data.post_to_feed) {
    const feedContent = data.feed_message || data.title;

    const { error: feedError } = await supabase
      .from("feed_posts")
      .insert({
        created_by: user.id,
        author_organisation_id: null,
        visibility: "public",
        content: feedContent,
        entity_type: "issue",
        entity_id: inserted.id,
      });

    if (feedError) {
      // Log the error but don't fail the entire request
      // The issue was created successfully
      console.error("Failed to create feed post:", feedError);
    }
  }

  return NextResponse.json(inserted);
}
