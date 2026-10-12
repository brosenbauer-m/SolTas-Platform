import Link from "next/link";
import { notFound } from "next/navigation";

import { getServerSupabase } from "@/lib/supabaseServer";

export default async function AdminIndexPage() {
  const supabase = await getServerSupabase();
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    notFound();
  }

  const { data: isSuper } = await supabase.rpc("is_superadmin");

  const links = [
    {
      href: "/admin/projects",
      title: "Project approvals",
      description: "Review pending project submissions and manage their status.",
    },
    {
      href: "/admin/organisations",
      title: "Organisation verification",
      description: "Verify pending organisations and manage their status.",
    },
    {
      href: "/admin/registrations",
      title: "Registrations",
      description: "Check organisation and user onboarding requests.",
    },
  ];

  if (isSuper) {
    links.push({
      href: "/admin/manage",
      title: "Admin settings",
      description: "Add or remove admins and adjust permissions.",
    });
  }

  return (
    <main className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold text-soltas-text">Admin dashboard</h1>
        <p className="text-sm text-soltas-muted">
          Access moderation and configuration tools for the Solarpunk Taskforce platform.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {links.map(link => (
          <li key={link.href} className="rounded-xl border p-4 shadow-sm transition hover:shadow-md">
            <Link href={link.href} className="block space-y-2">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-soltas-text">{link.title}</h2>
                <p className="text-sm text-soltas-muted">{link.description}</p>
              </div>
              <span className="text-sm font-medium text-soltas-ocean">Go to {link.title.toLowerCase()}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
