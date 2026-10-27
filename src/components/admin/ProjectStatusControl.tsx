"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// The values projects_status_check allows
type AllowedStatus = "pending" | "approved" | "rejected";

const OPTIONS: { value: AllowedStatus; label: string }[] = [
  { value: "pending", label: "Pending review (Hidden)" },
  { value: "approved", label: "Approved (Public)" },
  { value: "rejected", label: "Rejected (Hidden)" },
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
    if (currentStatus === "approved" || currentStatus === "rejected" || currentStatus === "pending") {
      return currentStatus;
    }
    return "pending";
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
      <label htmlFor={`status-${projectId}`} className="text-xs font-medium text-soltas-muted">
        Status
      </label>
      <select
        id={`status-${projectId}`}
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
