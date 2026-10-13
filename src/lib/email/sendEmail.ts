// Transactional email via Scaleway Transactional Email (EU, Paris region). Server-side only.
// Docs: https://www.scaleway.com/en/developers/api/transactional-email/

const SCW_TEM_ENDPOINT = "https://api.scaleway.com/transactional-email/v1alpha1/regions/fr-par/emails";

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/** "Solarpunk Taskforce <hello@example.org>" → { name, email }; a bare address works too. */
function parseFrom(value: string): { email: string; name?: string } {
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].replace(/^"|"$/g, "") || undefined, email: match[2].trim() };
  return { email: value.trim() };
}

export function isEmailConfigured() {
  return Boolean(process.env.SCW_SECRET_KEY && process.env.SCW_PROJECT_ID && process.env.EMAIL_FROM);
}

export async function sendEmail({ to, subject, html, text }: SendEmailArgs) {
  const secretKey = process.env.SCW_SECRET_KEY;
  const projectId = process.env.SCW_PROJECT_ID;
  const from = process.env.EMAIL_FROM;

  if (!secretKey) throw new Error("Missing SCW_SECRET_KEY");
  if (!projectId) throw new Error("Missing SCW_PROJECT_ID");
  if (!from) throw new Error("Missing EMAIL_FROM");

  const res = await fetch(SCW_TEM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": secretKey,
    },
    body: JSON.stringify({
      from: parseFrom(from),
      to: [{ email: to }],
      subject,
      html,
      text: text ?? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      project_id: projectId,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Scaleway email error ${res.status}: ${body.slice(0, 300)}`);
  }
}
