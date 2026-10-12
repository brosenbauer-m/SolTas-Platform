"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FILTER_KEYS = [
  "q",
  "type",
  "category",
  "country",
  "region",
  "currency",
  "thematic_area",
  "type_of_intervention",
  "target_demographic",
  "partner_org_ids",
  "min_needed",
  "max_needed",
  "min_received",
  "max_received",
  "min_lives",
  "max_lives",
  "start_from",
  "end_to",
  "sort",
  "dir",
  "page",
] as const;

const getParamValue = (searchParams: URLSearchParams, key: string) => searchParams.get(key) ?? "";

type ProjectsFiltersProps = {
  basePath?: string;
  showSorting?: boolean;
  variant?: "panel" | "inline";
};

export default function ProjectsFilters({
  basePath = "/projects",
  showSorting = true,
  variant = "panel",
}: ProjectsFiltersProps) {
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
  const categoryValue = getParamValue(searchParams, "category") || getParamValue(searchParams, "type");
  const countryValue = getParamValue(searchParams, "country");
  const regionValue = getParamValue(searchParams, "region");
  const currencyValue = getParamValue(searchParams, "currency");
  const thematicValue = getParamValue(searchParams, "thematic_area");
  const interventionValue = getParamValue(searchParams, "type_of_intervention");
  const demographicValue = getParamValue(searchParams, "target_demographic");
  const partnerValue = getParamValue(searchParams, "partner_org_ids");
  const minNeededValue = getParamValue(searchParams, "min_needed");
  const maxNeededValue = getParamValue(searchParams, "max_needed");
  const minReceivedValue = getParamValue(searchParams, "min_received");
  const maxReceivedValue = getParamValue(searchParams, "max_received");
  const minLivesValue = getParamValue(searchParams, "min_lives");
  const maxLivesValue = getParamValue(searchParams, "max_lives");
  const startFromValue = getParamValue(searchParams, "start_from");
  const endToValue = getParamValue(searchParams, "end_to");
  const sortValue = getParamValue(searchParams, "sort") || "created_at";
  const dirValue = getParamValue(searchParams, "dir") || "desc";

  const containerClassName =
    variant === "panel"
      ? "space-y-4 rounded-lg border border-soltas-line bg-white p-4 shadow-sm"
      : "space-y-4";

  return (
    <section className={containerClassName}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-soltas-text">Filters</h2>
          <p className="text-sm text-soltas-muted">Use these controls to refine the project list.</p>
        </div>
        <Button type="button" variant="ghost" onClick={clearFilters}>
          Clear filters
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Search</span>
          <Input
            value={qValue}
            placeholder="Project name or place"
            onChange={event => updateParams({ q: event.target.value })}
          />
        </label>

        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Project type</span>
          <Select
            value={categoryValue || "all"}
            onValueChange={value =>
              updateParams({
                category: value === "all" ? "" : value,
                type: "",
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="humanitarian">Humanitarian</SelectItem>
              <SelectItem value="environmental">Environmental</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Country</span>
          <Input
            value={countryValue}
            placeholder="US, CA"
            onChange={event => updateParams({ country: event.target.value })}
          />
        </label>

        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Region</span>
          <Input
            value={regionValue}
            placeholder="Region names"
            onChange={event => updateParams({ region: event.target.value })}
          />
        </label>
      </div>

      <details className="rounded-lg border border-soltas-line bg-soltas-off-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-soltas-text">Advanced filters</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm text-soltas-muted">
            <span className="font-medium text-soltas-text">Thematic areas</span>
            <Input
              value={thematicValue}
              placeholder="comma-separated"
              onChange={event => updateParams({ thematic_area: event.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-soltas-muted">
            <span className="font-medium text-soltas-text">Intervention types</span>
            <Input
              value={interventionValue}
              placeholder="comma-separated"
              onChange={event => updateParams({ type_of_intervention: event.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-soltas-muted">
            <span className="font-medium text-soltas-text">Target demographics</span>
            <Input
              value={demographicValue}
              placeholder="comma-separated"
              onChange={event => updateParams({ target_demographic: event.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-soltas-muted">
            <span className="font-medium text-soltas-text">Partner org IDs</span>
            <Input
              value={partnerValue}
              placeholder="uuid, uuid"
              onChange={event => updateParams({ partner_org_ids: event.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-soltas-muted">
            <span className="font-medium text-soltas-text">Currency</span>
            <Input
              value={currencyValue}
              placeholder="USD, EUR"
              onChange={event => updateParams({ currency: event.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-soltas-muted">
            <span className="font-medium text-soltas-text">Min funding needed</span>
            <Input
              type="number"
              value={minNeededValue}
              onChange={event => updateParams({ min_needed: event.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-soltas-muted">
            <span className="font-medium text-soltas-text">Max funding needed</span>
            <Input
              type="number"
              value={maxNeededValue}
              onChange={event => updateParams({ max_needed: event.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-soltas-muted">
            <span className="font-medium text-soltas-text">Min funding received</span>
            <Input
              type="number"
              value={minReceivedValue}
              onChange={event => updateParams({ min_received: event.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-soltas-muted">
            <span className="font-medium text-soltas-text">Max funding received</span>
            <Input
              type="number"
              value={maxReceivedValue}
              onChange={event => updateParams({ max_received: event.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-soltas-muted">
            <span className="font-medium text-soltas-text">Min lives improved</span>
            <Input
              type="number"
              value={minLivesValue}
              onChange={event => updateParams({ min_lives: event.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-soltas-muted">
            <span className="font-medium text-soltas-text">Max lives improved</span>
            <Input
              type="number"
              value={maxLivesValue}
              onChange={event => updateParams({ max_lives: event.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-soltas-muted">
            <span className="font-medium text-soltas-text">Start date from</span>
            <Input
              type="date"
              value={startFromValue}
              onChange={event => updateParams({ start_from: event.target.value })}
            />
          </label>

          <label className="space-y-1 text-sm text-soltas-muted">
            <span className="font-medium text-soltas-text">End date to</span>
            <Input
              type="date"
              value={endToValue}
              onChange={event => updateParams({ end_to: event.target.value })}
            />
          </label>

          {showSorting ? (
            <>
              <label className="space-y-1 text-sm text-soltas-muted">
                <span className="font-medium text-soltas-text">Sort by</span>
                <Select value={sortValue} onValueChange={value => updateParams({ sort: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Newest</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="amount_needed">Amount needed</SelectItem>
                    <SelectItem value="donations_received">Donations received</SelectItem>
                    <SelectItem value="start_date">Start date</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-1 text-sm text-soltas-muted">
                <span className="font-medium text-soltas-text">Sort direction</span>
                <Select value={dirValue} onValueChange={value => updateParams({ dir: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </>
          ) : null}
        </div>
      </details>
    </section>
  );
}
