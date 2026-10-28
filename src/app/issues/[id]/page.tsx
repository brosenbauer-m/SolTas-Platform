import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { issueMetadata } from "@/lib/pageMetadata";
import { ExternalLink } from "lucide-react";

import UpdatesSection, { type UpdateSummary } from "@/components/updates/UpdatesSection";
import { Badge } from "@/components/ui/badge";
import { getServerSupabase } from "@/lib/supabaseServer";
import { urgencyLabel, urgencyTone } from "@/lib/watchdog/urgency";

function linkHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return issueMetadata(id);
}

export default async function WatchdogIssuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id || typeof id !== "string") notFound();

  const supabase = await getServerSupabase();

  const { data: issue, error } = await supabase
    .from("watchdog_issues")
    .select("*")
    .eq("id", id)
    .single();

  if (!issue) {
    notFound();
  }

  if (error) {
    throw new Error("Unable to load watchdog issue.");
  }

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  const { data: isAdmin } = await supabase.rpc("is_admin");

  // Only allow viewing if:
  // 1. Issue is approved (public), OR
  // 2. User is the creator, OR
  // 3. User is an admin
  const isCreator = user && issue.created_by === user.id;
  const canView = issue.status === "approved" || isCreator || isAdmin;

  if (!canView) {
    notFound();
  }

  const canEdit = Boolean(user && (issue.created_by === user.id || isAdmin));

  const locationParts = [issue.city, issue.region, issue.country].filter(Boolean) as string[];
  const locationLabel = locationParts.length > 0 ? locationParts.join(", ") : null;

  // Fetch watchdog issue updates
  const { data: watchdogUpdates } = await supabase
    .from("watchdog_issue_updates")
    .select("id,issue_id,author_user_id,title,body,visibility,published_at,created_at")
    .eq("issue_id", issue.id)
    .eq("visibility", "public")
    .order("published_at", { ascending: false })
    .limit(20);

  // Map watchdog_issue_updates to UpdateSummary format
  const updates: UpdateSummary[] = (watchdogUpdates ?? []).map(
    (update: { id: string; title: string; body: string; published_at: string }) => ({
      id: update.id,
      title: update.title,
      summary: update.body,
      created_at: update.published_at,
    }),
  );

  const urgency = urgencyLabel(issue.urgency);
  const evidenceLinks = (Array.isArray(issue.evidence_links) ? issue.evidence_links : []).filter(Boolean) as string[];
  const demographics = (Array.isArray(issue.affected_demographics) ? issue.affected_demographics : []) as string[];
  const challenges = (Array.isArray(issue.global_challenges) ? issue.global_challenges : []) as string[];
  const sdgs = (Array.isArray(issue.sdgs) ? issue.sdgs : []) as number[];
  const affected = [...demographics, issue.affected_groups_text].filter(Boolean).join(", ");

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-soltas-muted">
        <Link href="/issues" className="text-soltas-ocean hover:underline">
          Issues
        </Link>
        <span aria-hidden="true"> / </span>
        <span>Issue</span>
      </nav>

      <header className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {urgency ? <Badge variant={urgencyTone(issue.urgency)}>{urgency} urgency</Badge> : null}
          {issue.status !== "approved" ? (
            <Badge variant={issue.status === "rejected" ? "rose" : "amber"}>
              {issue.status === "pending" ? "Waiting for review" : issue.status === "rejected" ? "Not published" : issue.status}
            </Badge>
          ) : null}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-soltas-text sm:text-4xl">{issue.title}</h1>
        <p className="mt-2 text-[15px] text-soltas-muted">
          {locationLabel ? <>{locationLabel} · </> : null}
          Reported {formatDate(issue.created_at)}
          {issue.date_observed ? <> · Observed {formatDate(issue.date_observed)}</> : null}
        </p>
      </header>

      {issue.description ? (
        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">What’s happening</h2>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-soltas-text">{issue.description}</p>
        </section>
      ) : null}

      {issue.desired_outcome ? (
        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Help needed</h2>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-soltas-text">{issue.desired_outcome}</p>
        </section>
      ) : null}

      {evidenceLinks.length > 0 ? (
        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Evidence</h2>
          <ul className="mt-3 divide-y divide-soltas-line">
            {evidenceLinks.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex min-h-11 items-center justify-between gap-3 py-2 text-[15px] text-soltas-ocean hover:underline"
                >
                  <span className="truncate">{linkHost(url)}</span>
                  <ExternalLink aria-hidden className="h-4 w-4 shrink-0 text-soltas-muted" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <UpdatesSection updates={updates} isAuthenticated={Boolean(user)} canPost={canEdit} />

      {affected || challenges.length > 0 || sdgs.length > 0 ? (
        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Details</h2>
          <dl className="mt-4 space-y-5">
            {affected ? (
              <div>
                <dt className="text-xs font-medium text-soltas-muted">Who is affected</dt>
                <dd className="mt-1 text-[15px] text-soltas-text">{affected}</dd>
              </div>
            ) : null}
            {challenges.length > 0 ? (
              <div>
                <dt className="text-xs font-medium text-soltas-muted">Global challenges</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {challenges.map((challenge) => (
                    <Badge key={challenge} variant="outline">
                      {challenge}
                    </Badge>
                  ))}
                </dd>
              </div>
            ) : null}
            {sdgs.length > 0 ? (
              <div>
                <dt className="text-xs font-medium text-soltas-muted">Sustainable Development Goals</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {sdgs.map((sdg) => (
                    <Badge key={sdg} variant="outline">
                      SDG {sdg}
                    </Badge>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}
    </main>
  );
}
