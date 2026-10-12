import { redirect } from "next/navigation";

import { PageHeader } from "@/components/ui/page-header";
import WatchdogIssueForm from "@/components/watchdog/WatchdogIssueForm";
import { getServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Report an issue" };

export default async function NewWatchdogIssuePage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?returnTo=/watchdog/new");

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-5 pb-20 pt-10 sm:pt-14">
      <PageHeader
        title="Report an issue"
        description="Flag an environmental or humanitarian problem in your area. Reports stay private until our team has reviewed them."
      />
      <WatchdogIssueForm />
    </main>
  );
}
