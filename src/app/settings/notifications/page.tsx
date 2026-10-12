import { getServerSupabase } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";

export default async function NotificationSettingsPage() {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("email_notifications_enabled")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new Error("Unable to load notification settings.");
  }

  async function updateEmailNotifications(formData: FormData) {
    "use server";

    const enabled = formData.get("enabled") === "on";
    const supabase = await getServerSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated.");

    const { error } = await supabase
      .from("profiles")
      .update({ email_notifications_enabled: enabled })
      .eq("id", user.id);

    if (error) throw new Error(error.message);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 pb-16 pt-10">
      <div>
        <h1 className="text-2xl font-semibold text-soltas-text">Notifications</h1>
        <p className="mt-1 text-sm text-soltas-muted">
          Control how Solarpunk Taskforce contacts you.
        </p>
      </div>

      <form
        action={updateEmailNotifications}
        className="card p-6 space-y-4"
      >
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={profile.email_notifications_enabled}
            className="mt-1 h-4 w-4 rounded border-soltas-line text-soltas-ocean focus:ring-soltas-ocean"
          />
          <div>
            <div className="text-sm font-medium text-soltas-text">
              Email notifications
            </div>
            <p className="text-sm text-soltas-muted">
              Receive emails when you are invited to collaborate, your role
              changes, or important project updates occur.
            </p>
          </div>
        </label>

        <div className="pt-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-soltas-ocean px-4 py-2 text-sm font-medium text-white hover:bg-soltas-abyssal"
          >
            Save preferences
          </button>
        </div>
      </form>
    </main>
  );
}
