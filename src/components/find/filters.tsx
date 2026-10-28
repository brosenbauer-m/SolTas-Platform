"use client";

/**
 * Building blocks for the Find-page filter panels (Projects, Organisations, Funding, Issues).
 *
 * - Every filter lives in the URL (?key=value; lists are comma-separated), so results can be shared.
 * - A page shows a few main filters; the rest can be added with "Add filter".
 * - Text and number inputs wait until you stop typing before they update the results.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fieldClasses } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string };

/* ───────────────────────── URL state ───────────────────────── */

export function useFilterParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = useCallback((key: string) => searchParams.get(key) ?? "", [searchParams]);
  const getList = useCallback(
    (key: string) =>
      (searchParams.get(key) ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [searchParams],
  );

  const set = useCallback(
    (updates: Record<string, string | string[] | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, raw] of Object.entries(updates)) {
        const value = Array.isArray(raw) ? raw.join(",") : raw;
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete("page");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { get, getList, set, searchParams };
}

/** Local value that is pushed to the URL after a short pause in typing. */
function useDebouncedParam(value: string, commit: (value: string) => void, delay = 400) {
  const [draft, setDraft] = useState(value);
  // When the URL changes from outside (e.g. "Clear all"), show the new value.
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  useEffect(() => {
    if (draft === value) return;
    const timer = window.setTimeout(() => commitRef.current(draft), delay);
    return () => window.clearTimeout(timer);
  }, [draft, value, delay]);

  return [draft, setDraft] as const;
}

/* ───────────────────────── Panel ───────────────────────── */

export type FilterDef = {
  key: string;
  label: string;
  /** Shown by default. Other filters are added with "Add filter". */
  main?: boolean;
  /** URL params this filter controls (cleared when it is removed). */
  params: string[];
  /** Takes two columns (e.g. segmented controls with long labels). */
  wide?: boolean;
  render: () => ReactNode;
};

type FilterPanelProps = {
  filters: FilterDef[];
  sort?: ReactNode;
};

export function FilterPanel({ filters, sort }: FilterPanelProps) {
  const { searchParams, set } = useFilterParams();
  const [added, setAdded] = useState<string[]>([]);

  const isActive = (filter: FilterDef) => filter.params.some((p) => Boolean(searchParams.get(p)));
  const main = filters.filter((f) => f.main);
  const extra = filters.filter((f) => !f.main && (isActive(f) || added.includes(f.key)));
  const available = filters.filter((f) => !f.main && !isActive(f) && !added.includes(f.key));
  const activeCount = filters.filter(isActive).length;

  const clearAll = () => {
    set(Object.fromEntries(filters.flatMap((f) => f.params).map((p) => [p, null])));
    setAdded([]);
  };

  const remove = (filter: FilterDef) => {
    set(Object.fromEntries(filter.params.map((p) => [p, null])));
    setAdded((current) => current.filter((key) => key !== filter.key));
  };

  return (
    <section className="@container space-y-5" aria-label="Filters">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold tracking-tight text-soltas-text">
          Filters
          {activeCount ? (
            <span className="ml-2 rounded-full bg-soltas-ocean/10 px-2 py-0.5 text-xs font-semibold text-soltas-ocean">
              {activeCount}
            </span>
          ) : null}
        </h2>
        <div className="flex items-center gap-2">
          {sort}
          {activeCount ? (
            <button
              type="button"
              onClick={clearAll}
              className="min-h-9 rounded-full px-3 text-sm text-soltas-ocean hover:bg-soltas-light"
            >
              Clear all
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-x-4 gap-y-5 @lg:grid-cols-2 @3xl:grid-cols-3 @6xl:grid-cols-4">
        {main.map((filter) => (
          <FilterField key={filter.key} label={filter.label} wide={filter.wide}>
            {filter.render()}
          </FilterField>
        ))}
        {extra.map((filter) => (
          <FilterField key={filter.key} label={filter.label} wide={filter.wide} onRemove={() => remove(filter)}>
            {filter.render()}
          </FilterField>
        ))}
      </div>

      {available.length ? (
        <AddFilterMenu options={available} onAdd={(key) => setAdded((current) => [...current, key])} />
      ) : null}
    </section>
  );
}

function FilterField({
  label,
  children,
  onRemove,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  onRemove?: () => void;
  wide?: boolean;
}) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className={cn("min-w-0 space-y-1.5", wide && "@lg:col-span-2")}>
      <div className="flex min-h-5 items-center justify-between gap-2">
        <span id={labelId} className="text-sm font-medium text-soltas-text">
          {label}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label} filter`}
            className="-m-2 grid h-10 w-10 place-items-center rounded-full text-soltas-muted hover:bg-soltas-light hover:text-soltas-text"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function AddFilterMenu({ options, onAdd }: { options: FilterDef[]; onAdd: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-dashed border-soltas-line px-4 text-sm font-medium text-soltas-ocean hover:border-soltas-ocean/50 hover:bg-soltas-ocean/5"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add filter
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1.5">
        <ul className="max-h-80 overflow-y-auto">
          {options.map((option) => (
            <li key={option.key}>
              <button
                type="button"
                onClick={() => {
                  onAdd(option.key);
                  setOpen(false);
                }}
                className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-soltas-text hover:bg-soltas-light"
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/* ───────────────────────── Controls ───────────────────────── */

export function SearchFilter({ param, placeholder }: { param: string; placeholder: string }) {
  const { get, set } = useFilterParams();
  const [draft, setDraft] = useDebouncedParam(get(param), (value) => set({ [param]: value.trim() }));
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-soltas-muted" aria-hidden />
      <input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn("h-11", fieldClasses, "pl-10")}
      />
    </div>
  );
}

/** Pill buttons for a small fixed set (e.g. All / Humanitarian / Environmental). */
export function SegmentedFilter({ param, options, allLabel = "All" }: { param: string; options: Option[]; allLabel?: string }) {
  const { get, set } = useFilterParams();
  const current = get(param);
  const items = [{ value: "", label: allLabel }, ...options];
  return (
    <div className="flex h-11 rounded-xl bg-soltas-light p-1" role="radiogroup">
      {items.map((item) => (
        <button
          key={item.value || "all"}
          type="button"
          role="radio"
          aria-checked={current === item.value}
          onClick={() => set({ [param]: item.value })}
          className={cn(
            "min-w-0 flex-1 truncate rounded-lg px-3 text-sm transition-colors",
            current === item.value ? "bg-white font-medium text-soltas-text shadow-sm" : "text-soltas-muted hover:text-soltas-text",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/** Single choice from a dropdown. */
export function SelectFilter({ param, options, placeholder = "Any" }: { param: string; options: Option[]; placeholder?: string }) {
  const { get, set } = useFilterParams();
  const value = get(param);
  return (
    <div className="relative">
      <select
        value={value}
        aria-label={placeholder}
        onChange={(event) => set({ [param]: event.target.value })}
        className={cn("h-11 appearance-none", fieldClasses, "pr-10", !value && "text-soltas-muted")}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-soltas-text">
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-soltas-muted" aria-hidden />
    </div>
  );
}

/**
 * Searchable multi-select dropdown: type to narrow the options, tick as many as you like.
 * Selected values show as removable chips in the button.
 */
export function ComboboxFilter({
  param,
  options,
  placeholder = "Any",
  searchPlaceholder = "Type to search",
}: {
  param: string;
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  const { getList, set } = useFilterParams();
  const selected = getList(param);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listId = useId();

  const labelOf = useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const toggle = (value: string) =>
    set({ [param]: selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value] });

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn("flex min-h-11 items-center justify-between gap-2 py-1.5 text-left", fieldClasses)}
        >
          <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {selected.length === 0 ? (
              <span className="text-soltas-muted">{placeholder}</span>
            ) : (
              selected.map((value) => (
                <span
                  key={value}
                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-soltas-ocean/10 py-0.5 pl-2.5 pr-1 text-[13px] text-soltas-ocean"
                >
                  <span className="truncate">{labelOf.get(value) ?? value}</span>
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Remove ${labelOf.get(value) ?? value}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggle(value);
                    }}
                    className="grid h-5 w-5 place-items-center rounded-full hover:bg-soltas-ocean/15"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              ))
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-soltas-muted" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 p-2">
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          aria-controls={listId}
          className={cn("mb-1.5 h-10", fieldClasses)}
        />
        <ul id={listId} role="listbox" aria-multiselectable className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-soltas-muted">No matches</li>
          ) : (
            filtered.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <li key={option.value} role="option" aria-selected={checked}>
                  <button
                    type="button"
                    onClick={() => toggle(option.value)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-soltas-text hover:bg-soltas-light"
                  >
                    <span
                      className={cn(
                        "grid h-4 w-4 shrink-0 place-items-center rounded border",
                        checked ? "border-soltas-ocean bg-soltas-ocean text-white" : "border-soltas-line",
                      )}
                    >
                      {checked ? <Check className="h-3 w-3" /> : null}
                    </span>
                    {option.label}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** Two number boxes (from / to) that update after you stop typing. */
export function RangeFilter({
  minParam,
  maxParam,
  minPlaceholder = "Min",
  maxPlaceholder = "Max",
  step,
}: {
  minParam: string;
  maxParam: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  step?: number;
}) {
  const { get, set } = useFilterParams();
  const [min, setMin] = useDebouncedParam(get(minParam), (value) => set({ [minParam]: value }));
  const [max, setMax] = useDebouncedParam(get(maxParam), (value) => set({ [maxParam]: value }));
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={step}
        value={min}
        onChange={(event) => setMin(event.target.value)}
        placeholder={minPlaceholder}
        aria-label={minPlaceholder}
        className={cn("h-11 min-w-0", fieldClasses)}
      />
      <span className="text-soltas-muted" aria-hidden>
        –
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={step}
        value={max}
        onChange={(event) => setMax(event.target.value)}
        placeholder={maxPlaceholder}
        aria-label={maxPlaceholder}
        className={cn("h-11 min-w-0", fieldClasses)}
      />
    </div>
  );
}

export function DateRangeFilter({ fromParam, toParam }: { fromParam: string; toParam: string }) {
  const { get, set } = useFilterParams();
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={get(fromParam)}
        onChange={(event) => set({ [fromParam]: event.target.value })}
        aria-label="From"
        className={cn("h-11 min-w-0", fieldClasses)}
      />
      <span className="text-soltas-muted" aria-hidden>
        –
      </span>
      <input
        type="date"
        value={get(toParam)}
        onChange={(event) => set({ [toParam]: event.target.value })}
        aria-label="To"
        className={cn("h-11 min-w-0", fieldClasses)}
      />
    </div>
  );
}

/**
 * One "Sort" dropdown instead of separate column and direction.
 * Each option sets both, e.g. { value: "created_at:desc", label: "Newest" }.
 */
export function SortSelect({
  options,
  sortParam = "sort",
  dirParam = "dir",
  defaultValue,
}: {
  options: Option[];
  sortParam?: string;
  dirParam?: string;
  defaultValue: string;
}) {
  const { get, set } = useFilterParams();
  const current = get(sortParam) ? `${get(sortParam)}:${get(dirParam) || "desc"}` : defaultValue;
  return (
    <label className="flex items-center gap-2 text-sm text-soltas-muted">
      <span className="hidden @md:inline">Sort</span>
      <select
        value={current}
        onChange={(event) => {
          const [sort, dir] = event.target.value.split(":");
          set({ [sortParam]: sort, [dirParam]: dir });
        }}
        className="h-9 rounded-full border border-soltas-line bg-white pl-3 pr-8 text-sm text-soltas-text focus:outline-none focus-visible:ring-2 focus-visible:ring-soltas-ocean/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ───────────────────────── Shared option lists ───────────────────────── */

/** Common ISO 4217 currencies. */
export const CURRENCY_OPTIONS: Option[] = [
  ["EUR", "Euro"],
  ["USD", "US dollar"],
  ["GBP", "British pound"],
  ["CHF", "Swiss franc"],
  ["SEK", "Swedish krona"],
  ["NOK", "Norwegian krone"],
  ["DKK", "Danish krone"],
  ["CAD", "Canadian dollar"],
  ["AUD", "Australian dollar"],
  ["JPY", "Japanese yen"],
  ["CNY", "Chinese yuan"],
  ["INR", "Indian rupee"],
  ["BRL", "Brazilian real"],
  ["MXN", "Mexican peso"],
  ["ZAR", "South African rand"],
  ["KES", "Kenyan shilling"],
  ["NGN", "Nigerian naira"],
  ["BDT", "Bangladeshi taka"],
].map(([value, label]) => ({ value, label: `${value} · ${label}` }));

/** Turn raw distinct values into sorted options with tidy labels (first letter capitalised). */
export function toOptions(values: Array<string | null | undefined>): Option[] {
  const seen = new Map<string, string>();
  for (const raw of values) {
    const value = raw?.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (!seen.has(key)) seen.set(key, value);
  }
  return Array.from(seen.values())
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }));
}
