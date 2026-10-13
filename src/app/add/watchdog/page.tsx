import { redirect } from "next/navigation";

// Watchdog reports are stored in watchdog_issues and submitted via /issues/new.
// This old page wrote to the legacy watchdog_cases table.
export default function AddWatchdogPage() {
  redirect("/issues/new");
}
