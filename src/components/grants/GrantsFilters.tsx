"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import MultiSelect from "@/components/ui/MultiSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FILTER_KEYS = [
  "q",
  "project_type",
  "funding_type",
  "status",
  "deadline_from",
  "deadline_to",
  "upcoming_only",
  "amount_min",
  "amount_max",
  "eligible_countries",
  "remote_ok",
  "themes",
  "sdgs",
  "sort",
  "dir",
  "page",
] as const;

const getParamValue = (searchParams: URLSearchParams, key: string) => searchParams.get(key) ?? "";

const parseListParam = (value: string | null) =>
  value ? value.split(",").map(item => item.trim()).filter(Boolean) : [];

type Option = { value: string; label: string };

type GrantsFiltersProps = {
  options: {
    countries: Option[];
    themes: Option[];
  };
  basePath?: string;
  showSorting?: boolean;
  variant?: "panel" | "inline";
};

const FUNDING_TYPE_OPTIONS: Option[] = [
  { value: "grant", label: "Funding" },
  { value: "prize", label: "Prize" },
  { value: "fellowship", label: "Fellowship" },
  { value: "loan", label: "Loan" },
  { value: "equity", label: "Equity" },
  { value: "in-kind", label: "In-kind" },
  { value: "other", label: "Other" },
];

const PROJECT_TYPE_OPTIONS: Option[] = [
  { value: "environmental", label: "Environmental" },
  { value: "humanitarian", label: "Humanitarian" },
  { value: "both", label: "Both / cross-cutting" },
];

const STATUS_OPTIONS: Option[] = [
  { value: "open", label: "Open" },
  { value: "rolling", label: "Rolling" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

const SDG_OPTIONS: Option[] = Array.from({ length: 17 }, (_, index) => {
  const value = String(index + 1);
  return { value, label: `SDG ${value}` };
});

const SORT_OPTIONS = [
  { value: "deadline.asc", label: "Deadline soonest" },
  { value: "amount_max.desc", label: "Amount (highest)" },
  { value: "created_at.desc", label: "Recently added" },
];

export default function GrantsFilters({
  options,
  basePath = "/funding",
  showSorting = true,
  variant = "panel",
}: GrantsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      params.set("page", "1");
      const query = params.toString();
      router.push(query ? `${basePath}?${query}` : basePath);
    },
    [basePath, router, searchParams],
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach(key => params.delete(key));
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }, [basePath, router, searchParams]);

  const qValue = getParamValue(searchParams, "q");
  const projectTypeValue = getParamValue(searchParams, "project_type");
  const fundingTypeValue = getParamValue(searchParams, "funding_type");
  const statusValue = getParamValue(searchParams, "status") || "open";
  const deadlineFromValue = getParamValue(searchParams, "deadline_from");
  const deadlineToValue = getParamValue(searchParams, "deadline_to");
  const upcomingOnlyValue = getParamValue(searchParams, "upcoming_only");
  const amountMinValue = getParamValue(searchParams, "amount_min");
  const amountMaxValue = getParamValue(searchParams, "amount_max");
  const eligibleCountriesValue = parseListParam(searchParams.get("eligible_countries"));
  const remoteOkValue = getParamValue(searchParams, "remote_ok");
  const themesValue = parseListParam(searchParams.get("themes"));
  const sdgsValue = parseListParam(searchParams.get("sdgs"));
  const sortValue = getParamValue(searchParams, "sort") || "deadline";
  const dirValue = getParamValue(searchParams, "dir") || "asc";

  const [searchValue, setSearchValue] = useState(qValue);

  useEffect(() => {
    setSearchValue(qValue);
  }, [qValue]);

  useEffect(() => {
    if (searchValue === qValue) return;
    const timeout = setTimeout(() => {
      updateParams({ q: searchValue });
    }, 400);

    return () => clearTimeout(timeout);
  }, [qValue, searchValue, updateParams]);

  const updateListParam = (key: string, values: string[]) => {
    updateParams({ [key]: values.length ? values.join(",") : "" });
  };

  const selectedSort = useMemo(() => `${sortValue}.${dirValue}`, [dirValue, sortValue]);

  const containerClassName =
    variant === "panel"
      ? "space-y-4 rounded-2xl border border-soltas-line bg-white p-5"
      : "space-y-4";

  return (
    <section className={`@container ${containerClassName}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-soltas-text">Filters</h2>
        <Button type="button" variant="link" size="sm" onClick={clearFilters}>
          Clear all
        </Button>
      </div>

      <div className="grid gap-4 @md:grid-cols-2 @3xl:grid-cols-3">
        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Keyword search</span>
          <Input
            value={searchValue}
            placeholder="Title, funder, or summary"
            onChange={event => setSearchValue(event.target.value)}
          />
        </label>

        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Project type</span>
          <Select
            value={projectTypeValue || "all"}
            onValueChange={value => updateParams({ project_type: value === "all" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {PROJECT_TYPE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Funding type</span>
          <Select
            value={fundingTypeValue || "all"}
            onValueChange={value => updateParams({ funding_type: value === "all" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All funding types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All funding types</SelectItem>
              {FUNDING_TYPE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <div className="grid gap-4 @md:grid-cols-2 @3xl:grid-cols-3">
        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Status</span>
          <Select value={statusValue} onValueChange={value => updateParams({ status: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Open" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Amount min</span>
          <Input
            type="number"
            value={amountMinValue}
            onChange={event => updateParams({ amount_min: event.target.value })}
          />
        </label>

        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Amount max</span>
          <Input
            type="number"
            value={amountMaxValue}
            onChange={event => updateParams({ amount_max: event.target.value })}
          />
        </label>
      </div>

      <div className="grid gap-4 @md:grid-cols-2 @3xl:grid-cols-3">
        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Deadline from</span>
          <Input
            type="date"
            value={deadlineFromValue}
            onChange={event => updateParams({ deadline_from: event.target.value })}
          />
        </label>

        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Deadline to</span>
          <Input
            type="date"
            value={deadlineToValue}
            onChange={event => updateParams({ deadline_to: event.target.value })}
          />
        </label>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-soltas-muted">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-soltas-line"
              checked={upcomingOnlyValue === "true" || upcomingOnlyValue === "1"}
              onChange={event => updateParams({ upcoming_only: event.target.checked ? "true" : "" })}
            />
            Upcoming deadlines only
          </label>
        </div>
      </div>

      <div className="grid gap-4 @md:grid-cols-2">
        <div className="space-y-2 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Eligible countries</span>
          <MultiSelect
            options={options.countries}
            value={eligibleCountriesValue}
            onChange={value => updateListParam("eligible_countries", value)}
            placeholder="Search countries"
            emptyMessage="No matching countries"
            ariaLabel="Eligible countries"
          />
        </div>

        <div className="space-y-2 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Themes</span>
          <MultiSelect
            options={options.themes}
            value={themesValue}
            onChange={value => updateListParam("themes", value)}
            placeholder="Search themes"
            emptyMessage="No themes available"
            ariaLabel="Themes"
          />
        </div>
      </div>

      <div className="grid gap-4 @md:grid-cols-2">
        <div className="space-y-2 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">SDGs</span>
          <MultiSelect
            options={SDG_OPTIONS}
            value={sdgsValue}
            onChange={value => updateListParam("sdgs", value)}
            placeholder="Search SDGs"
            emptyMessage="No SDGs found"
            ariaLabel="SDGs"
          />
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-soltas-muted">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-soltas-line"
              checked={remoteOkValue === "true" || remoteOkValue === "1"}
              onChange={event => updateParams({ remote_ok: event.target.checked ? "true" : "" })}
            />
            Remote-friendly opportunities only
          </label>
        </div>
      </div>

      {showSorting ? (
        <div className="grid gap-4 @md:grid-cols-2">
          <label className="space-y-1 text-sm text-soltas-muted">
            <span className="font-medium text-soltas-text">Sort by</span>
            <Select
              value={selectedSort}
              onValueChange={value => {
                const [sort, dir] = value.split(".");
                updateParams({ sort, dir });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      ) : null}
    </section>
  );
}
