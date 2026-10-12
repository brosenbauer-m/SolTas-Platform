import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Building2, ChevronRight, Plus, UserRound } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { getServerSupabase } from "@/lib/supabaseServer";

type Row = { href: string; icon: React.ComponentType<{ className?: string }>; title: string; text: string };

function Group({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-medium text-soltas-muted">{title}</h2>
      <ul className="divide-y divide-soltas-line overflow-hidden rounded-2xl border border-soltas-line bg-white">
        {rows.map(({ href, icon: Icon, title: rowTitle, text }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-soltas-off-white">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-soltas-ocean/10 text-soltas-ocean">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-soltas-text">{rowTitle}</span>
                <span className="block truncate text-sm text-soltas-muted">{text}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-soltas-muted" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function SettingsPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?returnTo=/settings");

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-4 pb-20 pt-10 sm:px-6">
      <PageHeader title="Settings" description="Your profile, notifications and organisations." />

      <Group
        title="Account"
        rows={[
          {
            href: `/people/${user.id}/edit`,
            icon: UserRound,
            title: "Profile",
            text: "Name, photo, bio and links others see",
          },
          {
            href: "/settings/notifications",
            icon: Bell,
            title: "Notifications",
            text: "Email and collaboration preferences",
          },
        ]}
      />

      <Group
        title="Organisations"
        rows={[
          {
            href: "/me/organisations",
            icon: Building2,
            title: "My organisations",
            text: "Organisations you belong to and your role",
          },
          {
            href: "/organisations/create",
            icon: Plus,
            title: "Register an organisation",
            text: "Put your organisation and its projects on the map",
          },
        ]}
      />
    </main>
  );
}
