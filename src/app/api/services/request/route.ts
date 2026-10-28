import { NextResponse } from "next/server";
import { z } from "zod";

import { CONTACT_EMAIL, SERVICE_KINDS } from "@/lib/contact";
import { isEmailConfigured, sendEmail } from "@/lib/email/sendEmail";
import { getServerSupabase } from "@/lib/supabaseServer";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  organisation: z.string().trim().max(200).optional().default(""),
  service: z.enum(SERVICE_KINDS.map((k) => k.value) as [string, ...string[]]),
  message: z.string().trim().min(20).max(4000),
  // honeypot: real people leave it empty
  website: z.string().max(0).optional().default(""),
});

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

/**
 * Service request from the About page: sent to the team's contact address by email (Scaleway, EU).
 * No database row; nothing personal is stored on the platform. 503 when email isn't configured, so the
 * form can fall back to a plain mail link.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form: name, a valid email and a message of at least 20 characters." },
      { status: 400 },
    );
  }
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email is not set up on this server.", fallback: `mailto:${CONTACT_EMAIL}` },
      { status: 503 },
    );
  }

  const data = parsed.data;
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const label = SERVICE_KINDS.find((k) => k.value === data.service)?.label ?? data.service;

  const lines = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    data.organisation ? `Organisation: ${data.organisation}` : null,
    `Service: ${label}`,
    auth?.user ? `Account: ${auth.user.email ?? auth.user.id}` : "Account: not signed in",
    "",
    data.message,
  ].filter((line): line is string => line !== null);

  try {
    await sendEmail({
      to: CONTACT_EMAIL,
      subject: `Service request: ${label} — ${data.name}`,
      text: lines.join("\n"),
      html: `<pre style="font: 14px/1.5 -apple-system, Segoe UI, sans-serif; white-space: pre-wrap">${escapeHtml(lines.join("\n"))}</pre>`,
    });
  } catch (error) {
    console.error("Service request email failed", error);
    return NextResponse.json(
      { error: "Couldn’t send the request right now.", fallback: `mailto:${CONTACT_EMAIL}` },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
