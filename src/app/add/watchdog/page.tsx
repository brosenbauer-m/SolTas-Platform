import { redirect } from "next/navigation";

// Watchdog reports are stored in watchdog_issues and submitted via /watchdog/new.
// This old page wrote to the legacy watchdog_cases table.
export default function AddWatchdogPage() {
  redirect("/watchdog/new");
}
