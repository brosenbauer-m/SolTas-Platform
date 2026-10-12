"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import MultiSelect from "@/components/ui/MultiSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FILTER_KEYS = [
  "q",
  "country",
  "region",
  "thematic",
  "intervention",
  "demographic",
  "min_age",
  "max_age",
  "min_projects",
  "max_projects",
  "min_funding",
  "max_funding",
  "sort",
  "dir",
  "page",
] as const;

const getParamValue = (searchParams: URLSearchParams, key: string) => searchParams.get(key) ?? "";

const parseListParam = (value: string | null) =>
  value ? value.split(",").map(item => item.trim()).filter(Boolean) : [];

type Option = { value: string; label: string };

type OrganisationsFiltersProps = {
  options: {
    countries: Option[];
    regions: Option[];
    thematic: Option[];
    interventions: Option[];
    demographics: Option[];
  };
  showSorting?: boolean;
  variant?: "panel" | "inline";
};

export default function OrganisationsFilters({
  options,
  showSorting = false,
  variant = "panel",
}: OrganisationsFiltersProps) {
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
      router.push(query ? `/find-organisations?${query}` : "/find-organisations");
    },
    [router, searchParams],
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach(key => params.delete(key));
    const query = params.toString();
    router.push(query ? `/find-organisations?${query}` : "/find-organisations");
  }, [router, searchParams]);

  const qValue = getParamValue(searchParams, "q");
  const countryValue = parseListParam(searchParams.get("country"));
  const regionValue = parseListParam(searchParams.get("region"));
  const thematicValue = parseListParam(searchParams.get("thematic"));
  const interventionValue = parseListParam(searchParams.get("intervention"));
  const demographicValue = parseListParam(searchParams.get("demographic"));
  const minAgeValue = getParamValue(searchParams, "min_age");
  const maxAgeValue = getParamValue(searchParams, "max_age");
  const minProjectsValue = getParamValue(searchParams, "min_projects");
  const maxProjectsValue = getParamValue(searchParams, "max_projects");
  const minFundingValue = getParamValue(searchParams, "min_funding");
  const maxFundingValue = getParamValue(searchParams, "max_funding");
  const sortValue = getParamValue(searchParams, "sort") || "followers_count";
  const dirValue = getParamValue(searchParams, "dir") || "desc";

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

  const containerClassName =
    variant === "panel"
      ? "space-y-4 rounded-2xl border border-soltas-line bg-white p-5"
      : "space-y-4";

  return (
    <section className={`@container ${containerClassName}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-soltas-text">Filters</h2>
          <p className="text-sm text-soltas-muted">Refine organisations by location, impact, and capacity.</p>
        </div>
        <Button type="button" variant="ghost" onClick={clearFilters}>
          Clear filters
        </Button>
      </div>

      <div className="grid gap-4 @md:grid-cols-2">
        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">AI Search (beta)</span>
          <Input
            value={searchValue}
            placeholder="Organisation name or focus area"
            onChange={event => setSearchValue(event.target.value)}
          />
        </label>

        <div className="grid gap-4 @md:grid-cols-2">
          <div className="space-y-2 text-sm text-soltas-muted">
            <span className="font-medium text-soltas-text">Countries</span>
            <MultiSelect
              options={options.countries}
              value={countryValue}
              onChange={value => updateListParam("country", value)}
              placeholder="Search countries"
              emptyMessage="No matching countries"
              ariaLabel="Countries"
            />
          </div>

          <div className="space-y-2 text-sm text-soltas-muted">
            <span className="font-medium text-soltas-text">Regions</span>
            <MultiSelect
              options={options.regions}
              value={regionValue}
              onChange={value => updateListParam("region", value)}
              placeholder="Search regions"
              emptyMessage="No matching regions"
              ariaLabel="Regions"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 @md:grid-cols-2 @3xl:grid-cols-3">
        <div className="space-y-2 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Thematic areas</span>
          <MultiSelect
            options={options.thematic}
            value={thematicValue}
            onChange={value => updateListParam("thematic", value)}
            placeholder="Search themes"
            emptyMessage="No thematic tags"
            ariaLabel="Thematic areas"
          />
        </div>

        <div className="space-y-2 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Intervention types</span>
          <MultiSelect
            options={options.interventions}
            value={interventionValue}
            onChange={value => updateListParam("intervention", value)}
            placeholder="Search interventions"
            emptyMessage="No intervention tags"
            ariaLabel="Intervention types"
          />
        </div>

        <div className="space-y-2 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Target demographics</span>
          <MultiSelect
            options={options.demographics}
            value={demographicValue}
            onChange={value => updateListParam("demographic", value)}
            placeholder="Search demographics"
            emptyMessage="No demographic tags"
            ariaLabel="Target demographics"
          />
        </div>
      </div>

      <div className="grid gap-4 @md:grid-cols-2 @3xl:grid-cols-3">
        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Age (years) min</span>
          <Input
            type="number"
            value={minAgeValue}
            onChange={event => updateParams({ min_age: event.target.value })}
          />
        </label>

        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Age (years) max</span>
          <Input
            type="number"
            value={maxAgeValue}
            onChange={event => updateParams({ max_age: event.target.value })}
          />
        </label>

        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Projects carried out min</span>
          <Input
            type="number"
            value={minProjectsValue}
            onChange={event => updateParams({ min_projects: event.target.value })}
          />
        </label>

        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Projects carried out max</span>
          <Input
            type="number"
            value={maxProjectsValue}
            onChange={event => updateParams({ max_projects: event.target.value })}
          />
        </label>

        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Funding needed min</span>
          <Input
            type="number"
            value={minFundingValue}
            onChange={event => updateParams({ min_funding: event.target.value })}
          />
        </label>

        <label className="space-y-1 text-sm text-soltas-muted">
          <span className="font-medium text-soltas-text">Funding needed max</span>
          <Input
            type="number"
            value={maxFundingValue}
            onChange={event => updateParams({ max_funding: event.target.value })}
          />
        </label>
      </div>

      {showSorting ? (
        <div className="grid gap-4 @md:grid-cols-2">
          <label className="space-y-1 text-sm text-soltas-muted">
            <span className="font-medium text-soltas-text">Sort by</span>
            <Select value={sortValue} onValueChange={value => updateParams({ sort: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="followers_count">Follower count</SelectItem>
                <SelectItem value="projects_total_count">Projects carried out</SelectItem>
                <SelectItem value="projects_ongoing_count">Ongoing projects</SelectItem>
                <SelectItem value="funding_needed">Funding needed</SelectItem>
                <SelectItem value="age_years">Organisation lifespan</SelectItem>
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
        </div>
      ) : null}
    </section>
  );
}
