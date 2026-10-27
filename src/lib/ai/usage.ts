import type { getAdminSupabase } from "@/lib/supabaseAdmin";

import { MISTRAL_MODEL } from "./mistral";

type Admin = NonNullable<ReturnType<typeof getAdminSupabase>>;
export type AiFeature = "search" | "tagging";

/**
 * AI searches per person per day. Mistral Small costs roughly €0.001 per search (about 5,000 tokens with the
 * tag list), so 30 a day is at most ~€1 a month per person: well under half of a membership fee.
 */
export const AI_SEARCH_DAILY_LIMIT = Number(process.env.AI_SEARCH_DAILY_LIMIT || 30);

export async function usedToday(admin: Admin, userId: string, feature: AiFeature): Promise<number> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await admin
    .from("ai_usage" as never)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature)
    .gte("created_at", since.toISOString());
  return count ?? 0;
}

export async function recordUsage(
  admin: Admin,
  userId: string | null,
  feature: AiFeature,
  usage: { inputTokens: number; outputTokens: number },
) {
  await admin.from("ai_usage" as never).insert({
    user_id: userId,
    feature,
    model: MISTRAL_MODEL,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
  } as never);
}
