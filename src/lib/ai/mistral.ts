/**
 * Mistral AI (Paris, EU) chat completions with a JSON answer. Server only.
 * Returns null when MISTRAL_API_KEY isn't set, so AI features switch off cleanly.
 */
export const MISTRAL_MODEL = process.env.MISTRAL_MODEL || "mistral-small-latest";

export type MistralJson<T> = { data: T; inputTokens: number; outputTokens: number };

export function mistralEnabled() {
  return Boolean(process.env.MISTRAL_API_KEY);
}

export async function mistralJson<T>({
  system,
  user,
  maxTokens = 400,
}: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<MistralJson<T> | null> {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return null;
  const base = process.env.MISTRAL_API_BASE || "https://api.mistral.ai"; // override only for local tests
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      temperature: 0,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Mistral: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = body.choices?.[0]?.message?.content ?? "{}";
  return {
    data: JSON.parse(content) as T,
    inputTokens: body.usage?.prompt_tokens ?? 0,
    outputTokens: body.usage?.completion_tokens ?? 0,
  };
}
