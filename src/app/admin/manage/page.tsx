import { notFound } from "next/navigation";

import { getServerSupabase } from "@/lib/supabaseServer";

export default async function Page() {
  const supabase = await getServerSupabase();
  const { data: isSuper } = await supabase.rpc("is_superadmin");
  if (!isSuper) notFound();

  const [{ data: admins }, { data: settings }] = await Promise.all([
    supabase.from("admin_emails").select("email,added_at").order("email"),
    supabase.from("app_settings").select("superadmin_email").single(),
  ]);

  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Manage Admins</h1>

      <section className="mb-8 rounded-xl border p-4">
        <h2 className="mb-2 font-medium">Current Admins</h2>
        <ul className="mb-3 list-inside list-disc">{admins?.map(a => <li key={a.email}>{a.email}</li>)}</ul>
        <form action="/api/admin/admin-emails" method="post" className="flex gap-2">
          <input name="email" type="email" required placeholder="new.admin@example.org" className="flex-1 rounded border px-3 py-2" />
          <input type="hidden" name="op" value="add" />
          <button className="rounded border px-3 py-2 hover:bg-soltas-off-white">Add Admin</button>
        </form>
        <form action="/api/admin/admin-emails" method="post" className="mt-2 flex gap-2">
          <input name="email" type="email" required placeholder="remove.admin@example.org" className="flex-1 rounded border px-3 py-2" />
          <input type="hidden" name="op" value="remove" />
          <button className="rounded border px-3 py-2 hover:bg-soltas-off-white">Remove Admin</button>
        </form>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-2 font-medium">Superadmin Email</h2>
        <p className="mb-2 text-sm text-soltas-muted">Current: {settings?.superadmin_email}</p>
        <form action="/api/admin/superadmin-email" method="post" className="flex gap-2">
          <input name="email" type="email" required placeholder="new.superadmin@example.org" className="flex-1 rounded border px-3 py-2" />
          <button className="rounded border px-3 py-2 hover:bg-soltas-off-white">Change Superadmin</button>
        </form>
      </section>
    </main>
  );
}
