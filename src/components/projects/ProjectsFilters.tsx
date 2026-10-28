"use client";

import {
  ComboboxFilter,
  CURRENCY_OPTIONS,
  DateRangeFilter,
  FilterPanel,
  RangeFilter,
  SearchFilter,
  SegmentedFilter,
  SelectFilter,
  SortSelect,
  type FilterDef,
} from "@/components/find/filters";
import { IFRC_OPTIONS, SDG_OPTIONS } from "@/lib/goals";
import type { ProjectFilterOptions } from "@/lib/projects/findProjectsQuery";

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "Newest" },
  { value: "created_at:asc", label: "Oldest" },
  { value: "name:asc", label: "Name A–Z" },
  { value: "amount_needed:desc", label: "Most funding needed" },
  { value: "donations_received:desc", label: "Most raised" },
  { value: "start_date:asc", label: "Starting soonest" },
  { value: "end_date:asc", label: "Ending soonest" },
];

const STAGE_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
];

type ProjectsFiltersProps = {
  options: ProjectFilterOptions;
  showSorting?: boolean;
};

export default function ProjectsFilters({ options, showSorting = true }: ProjectsFiltersProps) {
  const filters: FilterDef[] = [
    {
      key: "q",
      label: "Search",
      main: true,
      params: ["q"],
      render: () => <SearchFilter param="q" placeholder="Project name or place" />,
    },
    {
      key: "category",
      wide: true,
      label: "Type",
      main: true,
      params: ["category", "type"],
      render: () => (
        <SegmentedFilter
          param="category"
          options={[
            { value: "humanitarian", label: "Humanitarian" },
            { value: "environmental", label: "Environmental" },
          ]}
        />
      ),
    },
    {
      key: "tag",
      label: "Tags",
      main: true,
      params: ["tag"],
      render: () => <ComboboxFilter param="tag" options={options.tags} placeholder="Any tag" />,
    },
    {
      key: "sdg",
      label: "Sustainable Development Goals",
      main: true,
      params: ["sdg"],
      render: () => <ComboboxFilter param="sdg" options={SDG_OPTIONS} placeholder="Any goal" searchPlaceholder="Goal number or name" />,
    },
    {
      key: "ifrc",
      label: "IFRC Global Challenges",
      params: ["ifrc"],
      render: () => <ComboboxFilter param="ifrc" options={IFRC_OPTIONS} placeholder="Any challenge" />,
    },
    {
      key: "thematic_area",
      label: "Thematic areas",
      params: ["thematic_area"],
      render: () => <ComboboxFilter param="thematic_area" options={options.thematic} placeholder="Any theme" />,
    },
    {
      key: "country",
      label: "Country",
      main: true,
      params: ["country"],
      render: () => <ComboboxFilter param="country" options={options.countries} placeholder="Anywhere" />,
    },
    {
      key: "stage",
      label: "Status",
      main: true,
      params: ["stage"],
      render: () => <ComboboxFilter param="stage" options={STAGE_OPTIONS} placeholder="Any status" />,
    },
    {
      key: "region",
      label: "Region",
      params: ["region"],
      render: () => <ComboboxFilter param="region" options={options.regions} placeholder="Any region" />,
    },
    {
      key: "type_of_intervention",
      label: "Intervention types",
      params: ["type_of_intervention"],
      render: () => (
        <ComboboxFilter param="type_of_intervention" options={options.interventions} placeholder="Any intervention" />
      ),
    },
    {
      key: "target_demographic",
      label: "Target groups",
      params: ["target_demographic"],
      render: () => (
        <ComboboxFilter param="target_demographic" options={options.demographics} placeholder="Anyone" />
      ),
    },
    {
      key: "partner_org_ids",
      label: "Partner organisation",
      params: ["partner_org_ids"],
      render: () => (
        <ComboboxFilter
          param="partner_org_ids"
          options={options.organisations}
          placeholder="Any organisation"
          searchPlaceholder="Type an organisation name"
        />
      ),
    },
    {
      key: "funding",
      label: "Funding needed",
      params: ["min_needed", "max_needed", "currency"],
      render: () => (
        <div className="space-y-2">
          <RangeFilter minParam="min_needed" maxParam="max_needed" step={1000} />
          <SelectFilter param="currency" options={CURRENCY_OPTIONS} placeholder="Any currency" />
        </div>
      ),
    },
    {
      key: "received",
      label: "Funding raised",
      params: ["min_received", "max_received"],
      render: () => <RangeFilter minParam="min_received" maxParam="max_received" step={1000} />,
    },
    {
      key: "lives",
      label: "People reached",
      params: ["min_lives", "max_lives"],
      render: () => <RangeFilter minParam="min_lives" maxParam="max_lives" step={100} />,
    },
    {
      key: "dates",
      label: "Starts after / ends before",
      params: ["start_from", "end_to"],
      render: () => <DateRangeFilter fromParam="start_from" toParam="end_to" />,
    },
  ];

  return (
    <FilterPanel
      filters={filters}
      sort={showSorting ? <SortSelect options={SORT_OPTIONS} defaultValue="created_at:desc" /> : null}
    />
  );
}
