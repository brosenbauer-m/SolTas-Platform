import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, BadgeCheck, Building2, ChevronRight, Coins, FolderKanban, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { getServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

export default async function AdminIndexPage() {
  const supabase = await getServerSupabase();
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    notFound();
  }

  const count = (query: PromiseLike<{ count: number | null }>) => Promise.resolve(query).then((r) => r.count ?? 0);

  const [{ data: isSuper }, projects, organisations, submissions, funding, issues] = await Promise.all([
    supabase.rpc("is_superadmin"),
    count(supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(
      supabase.from("organisations").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
    ),
    count(
      supabase
        .from("organisation_verification_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ),
    count(supabase.from("grants").select("id", { count: "exact", head: true }).eq("moderation_status", "pending")),
    count(supabase.from("watchdog_issues").select("id", { count: "exact", head: true }).eq("status", "pending")),
  ]);

  const queues = [
    { href: "/admin/projects", title: "Projects", description: "New project submissions", pending: projects, icon: FolderKanban },
    { href: "/admin/organisations", title: "Organisations", description: "Organisations waiting to be verified", pending: organisations, icon: Building2 },
    { href: "/admin/organisations/submissions", title: "Verification documents", description: "Evidence sent in by organisations", pending: submissions, icon: BadgeCheck },
    { href: "/admin/funding-registrations", title: "Funding", description: "Funding opportunities to review", pending: funding, icon: Coins },
    { href: "/admin/issue-registrations", title: "Watchdog issues", description: "Reported issues to review", pending: issues, icon: AlertTriangle },
  ];
  const totalPending = queues.reduce((sum, queue) => sum + queue.pending, 0);

  const more = [
    { href: "/admin/registrations", title: "All project registrations" },
    { href: "/admin/organisation-registrations", title: "All organisation registrations" },
    ...(isSuper ? [{ href: "/admin/manage", title: "Admins and superadmin" }] : []),
  ];

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-5 pb-20 pt-10 sm:pt-14">
      <PageHeader
        title="Admin"
        description={totalPending ? `${totalPending} ${totalPending === 1 ? "item is" : "items are"} waiting for review.` : "Nothing is waiting for review."}
      />

      <ul className="card divide-y divide-soltas-line overflow-hidden p-0">
        {queues.map(({ href, title, description, pending, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-16 items-center gap-4 px-5 py-4 transition-colors hover:bg-soltas-off-white">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-soltas-ocean/10 text-soltas-ocean">
                <Icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-soltas-text">{title}</span>
                <span className="block text-sm text-soltas-muted">{description}</span>
              </span>
              {pending ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-800">
                  {pending}
                  <span className="sr-only"> pending</span>
                </span>
              ) : (
                <span className="text-sm text-soltas-muted">All clear</span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-soltas-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <section>
        <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-soltas-muted">More</h2>
        <ul className="card divide-y divide-soltas-line overflow-hidden p-0">
          {more.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="flex min-h-12 items-center justify-between gap-4 px-5 py-3 text-[15px] text-soltas-text transition-colors hover:bg-soltas-off-white">
                <span className="flex items-center gap-3">
                  {item.href === "/admin/manage" ? <ShieldCheck className="h-4 w-4 text-soltas-muted" aria-hidden /> : null}
                  {item.title}
                </span>
                <ChevronRight className="h-4 w-4 text-soltas-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
