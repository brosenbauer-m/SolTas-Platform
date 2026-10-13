"use client";

import {
  ComboboxFilter,
  FilterPanel,
  RangeFilter,
  SearchFilter,
  SortSelect,
  type FilterDef,
} from "@/components/find/filters";
import type { OrganisationFilterOptions } from "@/lib/organisations/findOrganisationsQuery";

const SORT_OPTIONS = [
  { value: "followers_count:desc", label: "Most followed" },
  { value: "projects_total_count:desc", label: "Most projects" },
  { value: "projects_ongoing_count:desc", label: "Most ongoing projects" },
  { value: "funding_needed:desc", label: "Most funding needed" },
  { value: "age_years:desc", label: "Longest active" },
  { value: "age_years:asc", label: "Newest" },
];

type OrganisationsFiltersProps = {
  options: OrganisationFilterOptions;
  showSorting?: boolean;
};

export default function OrganisationsFilters({ options, showSorting = false }: OrganisationsFiltersProps) {
  const filters: FilterDef[] = [
    {
      key: "q",
      label: "Search",
      main: true,
      params: ["q"],
      render: () => <SearchFilter param="q" placeholder="Name or what they do" />,
    },
    {
      key: "thematic",
      label: "Thematic areas",
      main: true,
      params: ["thematic"],
      render: () => <ComboboxFilter param="thematic" options={options.thematic} placeholder="Any theme" />,
    },
    {
      key: "country",
      label: "Countries",
      main: true,
      params: ["country"],
      render: () => <ComboboxFilter param="country" options={options.countries} placeholder="Anywhere" />,
    },
    {
      key: "intervention",
      label: "Intervention types",
      main: true,
      params: ["intervention"],
      render: () => (
        <ComboboxFilter param="intervention" options={options.interventions} placeholder="Any intervention" />
      ),
    },
    {
      key: "region",
      label: "Regions",
      params: ["region"],
      render: () => <ComboboxFilter param="region" options={options.regions} placeholder="Any region" />,
    },
    {
      key: "demographic",
      label: "Target groups",
      params: ["demographic"],
      render: () => <ComboboxFilter param="demographic" options={options.demographics} placeholder="Anyone" />,
    },
    {
      key: "age",
      label: "Years active",
      params: ["min_age", "max_age"],
      render: () => <RangeFilter minParam="min_age" maxParam="max_age" minPlaceholder="From" maxPlaceholder="To" />,
    },
    {
      key: "projects",
      label: "Projects carried out",
      params: ["min_projects", "max_projects"],
      render: () => <RangeFilter minParam="min_projects" maxParam="max_projects" />,
    },
    {
      key: "funding",
      label: "Funding needed",
      params: ["min_funding", "max_funding"],
      render: () => <RangeFilter minParam="min_funding" maxParam="max_funding" step={1000} />,
    },
  ];

  return (
    <FilterPanel
      filters={filters}
      sort={showSorting ? <SortSelect options={SORT_OPTIONS} defaultValue="followers_count:desc" /> : null}
    />
  );
}
