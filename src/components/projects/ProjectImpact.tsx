"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Input, fieldClasses } from "@/components/ui/input";
import {
  METRIC_UNITS,
  formatAsOf,
  formatMetricValue,
  unitShort,
  type MetricKind,
  type MetricUnit,
  type ProjectMetric,
} from "@/lib/metrics";
import { supabaseClient } from "@/lib/supabaseClient";

type Props = {
  projectId: string;
  initialMetrics: ProjectMetric[];
  /** People who can edit the project add, change and remove metrics (RLS enforces it). */
  canEdit: boolean;
  userId?: string | null;
};

type Draft = { label: string; unit: MetricUnit; kind: MetricKind; value: string; as_of: string; note: string };

const today = () => new Date().toISOString().slice(0, 10);
const emptyDraft = (): Draft => ({ label: "", unit: "people", kind: "output", value: "", as_of: today(), note: "" });

/**
 * "Impact" card: the project's own, dated figures as tiles, outputs first, then outcomes. Everything is
 * self-reported, and the card says so. Renders nothing when there are no metrics and the viewer can't add any.
 */
export default function ProjectImpact({ projectId, initialMetrics, canEdit, userId }: Props) {
  const [metrics, setMetrics] = useState<ProjectMetric[]>(initialMetrics);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supabase = useMemo(() => supabaseClient(), []);

  if (!metrics.length && !canEdit) return null;

  const startNew = () => {
    setDraft(emptyDraft());
    setEditing("new");
    setError(null);
  };
  const startEdit = (metric: ProjectMetric) => {
    setDraft({
      label: metric.label,
      unit: metric.unit,
      kind: metric.kind,
      value: String(metric.value),
      as_of: metric.as_of,
      note: metric.note ?? "",
    });
    setEditing(metric.id);
    setError(null);
  };

  const save = async () => {
    const value = Number(draft.value);
    if (draft.label.trim().length < 2) return setError("Give the metric a short label.");
    if (!Number.isFinite(value) || value < 0) return setError("Enter a number of zero or more.");
    setBusy(true);
    setError(null);
    const row = {
      label: draft.label.trim(),
      unit: draft.unit,
      kind: draft.kind,
      value,
      as_of: draft.as_of || today(),
      note: draft.note.trim() || null,
    };
    const result =
      editing === "new"
        ? await supabase
            .from("project_metrics")
            .insert({ ...row, project_id: projectId, created_by: userId ?? null } as never)
            .select("id,project_id,label,unit,kind,value,as_of,note")
            .single()
        : await supabase
            .from("project_metrics")
            .update(row as never)
            .eq("id", editing as string)
            .select("id,project_id,label,unit,kind,value,as_of,note")
            .single();
    setBusy(false);
    if (result.error || !result.data) {
      setError("Couldn’t save. Please try again.");
      return;
    }
    const saved = result.data as unknown as ProjectMetric;
    setMetrics((current) =>
      editing === "new" ? [...current, saved] : current.map((item) => (item.id === saved.id ? saved : item)),
    );
    setEditing(null);
  };

  const remove = async (metric: ProjectMetric) => {
    if (!window.confirm(`Remove “${metric.label}”?`)) return;
    const { error: deleteError } = await supabase.from("project_metrics").delete().eq("id", metric.id);
    if (deleteError) setError("Couldn’t remove it. Please try again.");
    else setMetrics((current) => current.filter((item) => item.id !== metric.id));
  };

  const groups: { kind: MetricKind; title: string; hint: string }[] = [
    { kind: "output", title: "Outputs", hint: "what the project delivered" },
    { kind: "outcome", title: "Outcomes", hint: "what changed for people and places" },
  ];

  return (
    <section className="card p-6" aria-labelledby="project-impact">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="project-impact" className="text-lg font-semibold tracking-tight text-soltas-text">
            Impact
          </h2>
          <p className="mt-1 text-sm text-soltas-muted">
            Self-reported by the project team, with the date each figure is valid for.
          </p>
        </div>
        {canEdit && editing === null ? (
          <Button type="button" size="sm" variant="outline" onClick={startNew}>
            <Plus className="h-4 w-4" aria-hidden /> Add a metric
          </Button>
        ) : null}
      </div>

      {groups.map(({ kind, title, hint }) => {
        const items = metrics.filter((m) => m.kind === kind);
        if (!items.length) return null;
        return (
          <div key={kind} className="mt-5">
            <p className="text-xs font-medium text-soltas-muted">
              {title} <span className="font-normal">· {hint}</span>
            </p>
            <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((metric) => (
                <li key={metric.id} className="rounded-2xl border border-soltas-line bg-soltas-off-white p-4">
                  <p className="text-2xl font-semibold tracking-tight text-soltas-text">
                    {formatMetricValue(metric.value)}
                    {unitShort(metric.unit) ? (
                      <span className="ml-1 text-sm font-medium text-soltas-muted">{unitShort(metric.unit)}</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm font-medium text-soltas-text">{metric.label}</p>
                  <p className="mt-0.5 text-xs text-soltas-muted">
                    as of {formatAsOf(metric.as_of)}
                    {metric.note ? ` · ${metric.note}` : ""}
                  </p>
                  {canEdit && editing === null ? (
                    <div className="mt-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(metric)}
                        aria-label={`Edit ${metric.label}`}
                        className="grid h-9 w-9 place-items-center rounded-full text-soltas-muted hover:bg-white hover:text-soltas-text"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(metric)}
                        aria-label={`Remove ${metric.label}`}
                        className="grid h-9 w-9 place-items-center rounded-full text-soltas-muted hover:bg-white hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {canEdit && !metrics.length && editing === null ? (
        <p className="mt-4 text-sm text-soltas-muted">
          No figures yet. Add what you count, for example “Trees planted” or “Households with clean water”, and update
          the number as the project goes on.
        </p>
      ) : null}

      {editing !== null ? (
        <form
          className="mt-5 grid gap-4 rounded-2xl border border-soltas-line p-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <Field label="What is counted" hint="e.g. Trees planted, Households with clean water">
            <Input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              maxLength={120}
              required
            />
          </Field>
          <Field label="Unit">
            <select
              className={fieldClasses}
              value={draft.unit}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value as MetricUnit })}
            >
              {METRIC_UNITS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Current value">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={draft.value}
              onChange={(e) => setDraft({ ...draft, value: e.target.value })}
              required
            />
          </Field>
          <Field label="Valid as of">
            <Input
              type="date"
              value={draft.as_of}
              onChange={(e) => setDraft({ ...draft, as_of: e.target.value })}
              required
            />
          </Field>
          <Field label="Kind">
            <select
              className={fieldClasses}
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value as MetricKind })}
            >
              <option value="output">Output (what was delivered)</option>
              <option value="outcome">Outcome (what changed)</option>
            </select>
          </Field>
          <Field label="Note" optional hint="How it was measured, or a source">
            <Input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} maxLength={500} />
          </Field>
          {error ? (
            <div className="sm:col-span-2">
              <FormMessage tone="error">{error}</FormMessage>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Saving…" : editing === "new" ? "Add" : "Save"}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
