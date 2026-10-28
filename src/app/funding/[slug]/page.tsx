import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { grantMetadata } from "@/lib/pageMetadata";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";

import type { Database } from "@/lib/database.types";
import { getServerSupabase } from "@/lib/supabaseServer";

type GrantRow = Database["public"]["Tables"]["grants"]["Row"];

const formatDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
};

const formatCurrency = (amount: number | null, currency: string | null) => {
  if (typeof amount !== "number") return null;
  const resolvedCurrency = currency ?? "EUR";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: resolvedCurrency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${resolvedCurrency}`;
  }
};

const formatAmountRange = (grant: Pick<GrantRow, "amount_min" | "amount_max" | "currency">) => {
  const minLabel = formatCurrency(grant.amount_min, grant.currency);
  const maxLabel = formatCurrency(grant.amount_max, grant.currency);
  if (!minLabel && !maxLabel) return null;
  if (minLabel && maxLabel) return `${minLabel} – ${maxLabel}`;
  return minLabel ?? maxLabel;
};

const FUNDING_TYPE_LABELS: Record<string, string> = {
  grant: "Grant",
  loan: "Loan",
  prize: "Prize",
  fellowship: "Fellowship",
  funding: "Funding",
};

/** "in 12 days", "today", or "closed" relative to now. */
const deadlineHint = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "Closed";
  if (days === 0) return "Closes today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
};

const externalLink = { target: "_blank", rel: "noopener noreferrer" } as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return grantMetadata(slug);
}

export default async function GrantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!slug || typeof slug !== "string") notFound();

  const supabase = await getServerSupabase();

  const { data: grant, error } = await supabase
    .from("grants")
    .select(
      "id,slug,title,summary,description,funder_name,funder_website,application_url,contact_email,funding_type,project_type,currency,amount_min,amount_max,open_date,deadline,decision_date,start_date,eligible_countries,remote_ok,location_name,themes,sdgs,status",
    )
    .eq("slug", slug)
    .single();

  if (error || !grant) {
    if (error?.code === "PGRST116" || error?.code === "42501") notFound();
    throw new Error(error?.message ?? "Failed to load funding.");
  }

  const amountRange = formatAmountRange(grant);
  const deadline = formatDate(grant.deadline);
  const openDate = formatDate(grant.open_date);
  const decisionDate = formatDate(grant.decision_date);
  const startDate = formatDate(grant.start_date);

  const hint = grant.status === "closed" ? "Closed" : deadlineHint(grant.deadline);
  const isClosed = hint === "Closed";
  const where = grant.eligible_countries?.length ? grant.eligible_countries.join(", ") : null;
  const otherDates = [
    openDate ? { label: "Opens", value: openDate } : null,
    decisionDate ? { label: "Decision", value: decisionDate } : null,
    startDate ? { label: "Funding starts", value: startDate } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:space-y-8 sm:py-10">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="ocean">{FUNDING_TYPE_LABELS[grant.funding_type] ?? grant.funding_type}</Badge>
          {grant.project_type && grant.project_type !== "both" ? (
            <Badge variant={grant.project_type === "humanitarian" ? "ocean" : "green"} className="capitalize">
              {grant.project_type}
            </Badge>
          ) : null}
          {isClosed ? <Badge variant="rose">Closed</Badge> : grant.status === "rolling" ? <Badge>Rolling</Badge> : null}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-soltas-text sm:text-4xl">{grant.title}</h1>
        {grant.funder_name ? <p className="mt-2 text-[15px] text-soltas-muted">by {grant.funder_name}</p> : null}
        {grant.summary ? <p className="mt-4 max-w-2xl text-[17px] leading-7 text-soltas-text">{grant.summary}</p> : null}
        <div className="mt-6 flex flex-wrap gap-2">
          {!isClosed ? (
            <a href={grant.application_url} {...externalLink} className={buttonClasses()}>
              Apply <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
          ) : null}
          {grant.funder_website ? (
            <a href={grant.funder_website} {...externalLink} className={buttonClasses({ variant: "outline" })}>
              Funder website
            </a>
          ) : null}
        </div>
      </header>

      <section aria-label="Key facts" className="grid gap-3 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-medium text-soltas-muted">Amount</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-soltas-text">{amountRange ?? "Not specified"}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-soltas-muted">Deadline</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-soltas-text">
            {deadline ?? (grant.status === "rolling" ? "Rolling" : "Not specified")}
          </p>
          {hint && deadline ? (
            <p className={isClosed ? "mt-1 text-xs text-rose-600" : "mt-1 text-xs text-soltas-muted"}>{hint}</p>
          ) : null}
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-soltas-muted">Who can apply</p>
          <p className="mt-1 text-[15px] font-medium leading-6 text-soltas-text">{where ?? "Not specified"}</p>
          {grant.remote_ok ? <p className="mt-1 text-xs text-soltas-muted">Remote participation possible</p> : null}
        </div>
      </section>

      {grant.description ? (
        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">About this opportunity</h2>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-soltas-text">{grant.description}</p>
        </section>
      ) : null}

      {otherDates.length > 0 || grant.location_name || grant.contact_email || grant.themes?.length || grant.sdgs?.length ? (
        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Details</h2>
          <dl className="mt-4 grid gap-5 sm:grid-cols-2">
            {otherDates.map((item) => (
              <div key={item.label}>
                <dt className="text-xs font-medium text-soltas-muted">{item.label}</dt>
                <dd className="mt-1 text-[15px] text-soltas-text">{item.value}</dd>
              </div>
            ))}
            {grant.location_name ? (
              <div>
                <dt className="text-xs font-medium text-soltas-muted">Location</dt>
                <dd className="mt-1 text-[15px] text-soltas-text">{grant.location_name}</dd>
              </div>
            ) : null}
            {grant.contact_email ? (
              <div>
                <dt className="text-xs font-medium text-soltas-muted">Contact</dt>
                <dd className="mt-1 text-[15px]">
                  <a href={`mailto:${grant.contact_email}`} className="text-soltas-ocean hover:underline">
                    {grant.contact_email}
                  </a>
                </dd>
              </div>
            ) : null}
            {grant.themes?.length ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-soltas-muted">Themes</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {grant.themes.map((theme: string) => (
                    <Badge key={theme} variant="outline">
                      {theme}
                    </Badge>
                  ))}
                </dd>
              </div>
            ) : null}
            {grant.sdgs?.length ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-soltas-muted">Sustainable Development Goals</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {grant.sdgs.map((sdg: number) => (
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
