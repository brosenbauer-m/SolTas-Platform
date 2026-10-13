"use client";

import {
  ComboboxFilter,
  DateRangeFilter,
  FilterPanel,
  SearchFilter,
  SelectFilter,
  SortSelect,
  type FilterDef,
} from "@/components/find/filters";
import type { WatchdogFilterOptions } from "@/lib/watchdog/findWatchdogIssuesQuery";
import { URGENCY_LEVELS } from "@/lib/watchdog/urgency";

const URGENCY_OPTIONS = URGENCY_LEVELS.map((level) => ({ value: String(level.value), label: `${level.label} or higher` }));

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "Newest" },
  { value: "urgency:desc", label: "Most urgent" },
  { value: "created_at:asc", label: "Oldest" },
  { value: "title:asc", label: "Title A–Z" },
];

type WatchdogFiltersProps = {
  options: WatchdogFilterOptions;
  showSorting?: boolean;
};

export default function WatchdogFilters({ options, showSorting = true }: WatchdogFiltersProps) {
  const filters: FilterDef[] = [
    {
      key: "q",
      label: "Search",
      main: true,
      params: ["q"],
      render: () => <SearchFilter param="q" placeholder="What or where" />,
    },
    {
      key: "country",
      label: "Countries",
      main: true,
      params: ["country"],
      render: () => <ComboboxFilter param="country" options={options.countries} placeholder="Anywhere" />,
    },
    {
      key: "urgency_min",
      label: "Urgency",
      main: true,
      params: ["urgency_min", "urgency_max"],
      render: () => <SelectFilter param="urgency_min" options={URGENCY_OPTIONS} placeholder="Any urgency" />,
    },
    {
      key: "demographics",
      label: "Affected groups",
      main: true,
      params: ["demographics"],
      render: () => <ComboboxFilter param="demographics" options={options.demographics} placeholder="Anyone" />,
    },
    {
      key: "region",
      label: "Regions",
      params: ["region"],
      render: () => <ComboboxFilter param="region" options={options.regions} placeholder="Any region" />,
    },
    {
      key: "sdgs",
      label: "SDGs",
      params: ["sdgs"],
      render: () => <ComboboxFilter param="sdgs" options={options.sdgs} placeholder="Any SDG" />,
    },
    {
      key: "global_challenges",
      label: "IFRC global challenges",
      params: ["global_challenges"],
      render: () => (
        <ComboboxFilter param="global_challenges" options={options.globalChallenges} placeholder="Any challenge" />
      ),
    },
    {
      key: "observed",
      label: "Observed between",
      params: ["date_from", "date_to"],
      render: () => <DateRangeFilter fromParam="date_from" toParam="date_to" />,
    },
  ];

  return (
    <FilterPanel
      filters={filters}
      sort={showSorting ? <SortSelect options={SORT_OPTIONS} defaultValue="created_at:desc" /> : null}
    />
  );
}
