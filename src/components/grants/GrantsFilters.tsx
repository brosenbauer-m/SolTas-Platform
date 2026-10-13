"use client";

import {
  ComboboxFilter,
  DateRangeFilter,
  FilterPanel,
  RangeFilter,
  SearchFilter,
  SegmentedFilter,
  SelectFilter,
  SortSelect,
  type FilterDef,
  type Option,
} from "@/components/find/filters";
import type { GrantFilterOptions } from "@/lib/grants/findGrantsQuery";

const FUNDING_TYPE_OPTIONS: Option[] = [
  { value: "grant", label: "Grant" },
  { value: "prize", label: "Prize" },
  { value: "fellowship", label: "Fellowship" },
  { value: "loan", label: "Loan" },
  { value: "equity", label: "Equity" },
  { value: "in-kind", label: "In-kind" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS: Option[] = [
  { value: "open", label: "Open" },
  { value: "rolling", label: "Rolling" },
  { value: "closed", label: "Closed" },
];

const CLOSING_OPTIONS: Option[] = [
  { value: "7", label: "Next 7 days" },
  { value: "30", label: "Next 30 days" },
  { value: "90", label: "Next 3 months" },
];

const SDG_OPTIONS: Option[] = Array.from({ length: 17 }, (_, index) => ({
  value: String(index + 1),
  label: `SDG ${index + 1}`,
}));

const SORT_OPTIONS = [
  { value: "deadline:asc", label: "Deadline soonest" },
  { value: "amount_max:desc", label: "Largest amount" },
  { value: "created_at:desc", label: "Recently added" },
];

type GrantsFiltersProps = {
  options: GrantFilterOptions;
  showSorting?: boolean;
};

export default function GrantsFilters({ options, showSorting = true }: GrantsFiltersProps) {
  const filters: FilterDef[] = [
    {
      key: "q",
      label: "Search",
      main: true,
      params: ["q"],
      render: () => <SearchFilter param="q" placeholder="Title, funder or topic" />,
    },
    {
      key: "status",
      label: "Status",
      main: true,
      params: ["status"],
      render: () => <ComboboxFilter param="status" options={STATUS_OPTIONS} placeholder="Open and rolling" />,
    },
    {
      key: "closing_within",
      label: "Closing within",
      main: true,
      params: ["closing_within"],
      render: () => <SelectFilter param="closing_within" options={CLOSING_OPTIONS} placeholder="Any deadline" />,
    },
    {
      key: "eligible_countries",
      label: "Eligible countries",
      main: true,
      params: ["eligible_countries"],
      render: () => <ComboboxFilter param="eligible_countries" options={options.countries} placeholder="Anywhere" />,
    },
    {
      key: "funding_type",
      label: "Funding type",
      main: true,
      params: ["funding_type"],
      render: () => <ComboboxFilter param="funding_type" options={FUNDING_TYPE_OPTIONS} placeholder="Any type" />,
    },
    {
      key: "project_type",
      wide: true,
      label: "For",
      params: ["project_type"],
      render: () => (
        <SegmentedFilter
          param="project_type"
          options={[
            { value: "humanitarian", label: "Humanitarian" },
            { value: "environmental", label: "Environmental" },
            { value: "both", label: "Both" },
          ]}
        />
      ),
    },
    {
      key: "themes",
      label: "Themes",
      params: ["themes"],
      render: () => <ComboboxFilter param="themes" options={options.themes} placeholder="Any theme" />,
    },
    {
      key: "amount",
      label: "Amount",
      params: ["amount_min", "amount_max"],
      render: () => <RangeFilter minParam="amount_min" maxParam="amount_max" step={1000} />,
    },
    {
      key: "deadline",
      label: "Deadline between",
      params: ["deadline_from", "deadline_to"],
      render: () => <DateRangeFilter fromParam="deadline_from" toParam="deadline_to" />,
    },
    {
      key: "sdgs",
      label: "SDGs",
      params: ["sdgs"],
      render: () => <ComboboxFilter param="sdgs" options={SDG_OPTIONS} placeholder="Any SDG" />,
    },
    {
      key: "remote_ok",
      label: "Location",
      params: ["remote_ok"],
      render: () => (
        <SegmentedFilter param="remote_ok" allLabel="Any" options={[{ value: "true", label: "Remote possible" }]} />
      ),
    },
  ];

  return (
    <FilterPanel
      filters={filters}
      sort={showSorting ? <SortSelect options={SORT_OPTIONS} defaultValue="deadline:asc" /> : null}
    />
  );
}
