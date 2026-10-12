"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type AllowedStatus = "approved" | "rejected" | "archived";

const OPTIONS: { value: AllowedStatus; label: string }[] = [
  { value: "approved", label: "Approved (Public)" },
  { value: "rejected", label: "Rejected (Hidden)" },
  { value: "archived", label: "Archived (Hidden)" },
];

export function ProjectStatusControl({
  projectId,
  currentStatus,
}: {
  projectId: string;
  currentStatus: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localValue, setLocalValue] = useState<string>(currentStatus ?? "");

  const normalizedCurrent = useMemo(() => {
    // If old records have null/other statuses, default to "rejected" in UI but don’t auto-write.
    if (currentStatus === "approved" || currentStatus === "rejected" || currentStatus === "archived") {
      return currentStatus;
    }
    return "rejected";
  }, [currentStatus]);

  async function updateStatus(nextStatus: AllowedStatus) {
    setLocalValue(nextStatus);

    const res = await fetch(`/api/admin/projects/${projectId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error ?? "Failed to update project status.");
      // revert UI if update failed
      setLocalValue(normalizedCurrent);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-soltas-muted">
        Status
      </label>
      <select
        className="rounded-md border bg-white px-2 py-1 text-sm"
        value={localValue || normalizedCurrent}
        disabled={isPending}
        onChange={(e) => updateStatus(e.target.value as AllowedStatus)}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {isPending ? <span className="text-xs text-soltas-muted">Saving…</span> : null}
    </div>
  );
}
