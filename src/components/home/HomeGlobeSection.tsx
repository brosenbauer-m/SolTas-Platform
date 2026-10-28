"use client";

import { categoryMarkerColor, MARKER_COLORS } from "@/lib/markerColors";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { FocusEvent } from "react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import HomeGlobe, { type HomeGlobeMode, type HomeGlobePoint, type HomeGlobeProjectLayer } from "@/components/home/HomeGlobe";
import type { GrantMarker } from "@/lib/grants/findGrantsQuery";
import type { HomeStats } from "@/lib/homeStats";
import type { ProjectMarker } from "@/lib/projects/findProjectsQuery";
import { cn } from "@/lib/utils";
import type { WatchdogIssueMarker } from "@/lib/watchdog/findWatchdogIssuesQuery";
import { urgencyLabel } from "@/lib/watchdog/urgency";

const DEFAULT_MODE: HomeGlobeMode = "projects";
const MODE_CONFIG: Record<HomeGlobeMode, { label: string; href: string; ctaLabel: string; mobileLabel: string }> = {
  projects: {
    label: "Find Projects",
    href: "/projects",
    ctaLabel: "Open project",
    mobileLabel: "Projects",
  },
  funding: {
    label: "Find Funding",
    href: "/funding",
    ctaLabel: "Open funding",
    mobileLabel: "Funding",
  },
  issues: {
    label: "Find Issues",
    href: "/issues",
    ctaLabel: "Open issue",
    mobileLabel: "Issues",
  },
};

const formatPlace = (parts: Array<string | null | undefined>) => {
  const filtered = parts.filter(Boolean) as string[];
  return filtered.length ? filtered.join(", ") : null;
};

const formatUrgency = (urgency: number | null | undefined) => {
  const label = urgencyLabel(urgency);
  return label ? `${label} urgency` : null;
};

type StatItem = {
  label: string;
  value?: number;
  format: "number" | "currency";
};

const numberFormatter = new Intl.NumberFormat("en-US");
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const formatStatValue = (item: StatItem) => {
  if (typeof item.value !== "number" || Number.isNaN(item.value)) return "—";
  if (item.format === "currency") return currencyFormatter.format(item.value);
  return numberFormatter.format(item.value);
};

type Props = {
  projectMarkers?: ProjectMarker[];
  grantMarkers?: GrantMarker[];
  issueMarkers?: WatchdogIssueMarker[];
  homeStats?: HomeStats | null;
};

export default function HomeGlobeSection({
  projectMarkers = [],
  grantMarkers = [],
  issueMarkers = [],
  homeStats = null,
}: Props) {
  const [projectMarkersState, setProjectMarkersState] = useState<ProjectMarker[]>(projectMarkers);
  const [grantMarkersState, setGrantMarkersState] = useState<GrantMarker[]>(grantMarkers);
  const [issueMarkersState, setIssueMarkersState] = useState<WatchdogIssueMarker[]>(issueMarkers);
  const [homeStatsState, setHomeStatsState] = useState<HomeStats | null>(homeStats);

  const [isLoading, setIsLoading] = useState(
    projectMarkers.length === 0 && grantMarkers.length === 0 && issueMarkers.length === 0,
  );

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      setIsLoading(true);

      try {
        const [markersRes, statsRes] = await Promise.all([fetch("/api/home-markers"), fetch("/api/home-stats")]);

        if (!isActive) return;

        if (markersRes.ok) {
          const markers = (await markersRes.json()) as {
            projectMarkers?: ProjectMarker[];
            grantMarkers?: GrantMarker[];
            issueMarkers?: WatchdogIssueMarker[];
          };

          setProjectMarkersState(markers.projectMarkers ?? []);
          setGrantMarkersState(markers.grantMarkers ?? []);
          setIssueMarkersState(markers.issueMarkers ?? []);
        }

        if (statsRes.ok) {
          const stats = (await statsRes.json()) as HomeStats;
          setHomeStatsState(stats);
        }
      } catch {
        // keep initial values as fallback
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  const [mode, setMode] = useState<HomeGlobeMode>(DEFAULT_MODE);

  // "Following" view (blueprint): signed-in people can limit the globe to the projects they follow and the
  // projects of organisations they follow. null = not signed in (or not loaded): the switch stays hidden.
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [showFollowing, setShowFollowing] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/projects/following")
      .then((res) => (res.ok ? (res.json() as Promise<{ total?: number }>) : null))
      .then((data) => {
        if (active && data) setFollowingCount(data.total ?? 0);
      })
      .catch(() => {
        // visitors and failures: no switch
      });
    return () => {
      active = false;
    };
  }, []);

  // Every project (community and imported) as one clustered layer in Projects mode, like Find Projects.
  const projectLayer = useMemo<HomeGlobeProjectLayer>(
    () => ({
      mode: "projects",
      url: showFollowing ? "/api/projects/following?following=1" : "/api/projects/points",
      color: MARKER_COLORS.project,
      ctaLabel: MODE_CONFIG.projects.ctaLabel,
      summaryUrl: (id) => `/api/projects/summary?slug=${encodeURIComponent(id)}`,
    }),
    [showFollowing],
  );
  const buttonRowRef = useRef<HTMLDivElement | null>(null);

  const pointsByMode = useMemo<Record<HomeGlobeMode, HomeGlobePoint[]>>(
    () => ({
      projects: projectMarkersState.map((marker) => ({
        id: marker.id,
        lng: typeof marker.lng === "number" ? marker.lng : Number.NaN,
        lat: typeof marker.lat === "number" ? marker.lat : Number.NaN,
        title: marker.name ?? "Untitled project",
        placeName: marker.place_name,
        description: marker.description,
        markerColor: categoryMarkerColor(marker.category),
        ctaHref: `/projects/${marker.slug ?? marker.id}`,
        ctaLabel: MODE_CONFIG.projects.ctaLabel,
        eyebrow: "Project",
        meta: marker.category ? marker.category.replace(/_/g, " ") : null,
      })),
      funding: grantMarkersState.map((marker) => ({
        id: marker.id,
        lng: typeof marker.longitude === "number" ? marker.longitude : Number.NaN,
        lat: typeof marker.latitude === "number" ? marker.latitude : Number.NaN,
        title: marker.title ?? "Untitled funding",
        placeName: marker.location_name,
        description: marker.summary,
        markerColor: categoryMarkerColor(marker.project_type),
        ctaHref: `/funding/${encodeURIComponent(marker.slug ?? marker.id)}`,
        ctaLabel: MODE_CONFIG.funding.ctaLabel,
        eyebrow: "Funding",
        meta: marker.project_type ? `Type: ${marker.project_type}` : null,
      })),
      issues: issueMarkersState.map((marker) => ({
        id: marker.id,
        lng: typeof marker.longitude === "number" ? marker.longitude : Number.NaN,
        lat: typeof marker.latitude === "number" ? marker.latitude : Number.NaN,
        title: marker.title ?? "Untitled issue",
        placeName: formatPlace([marker.city, marker.region, marker.country]),
        description: marker.description,
        markerColor:
          marker.urgency && marker.urgency >= 4
            ? "#ef4444"
            : marker.urgency === 3
              ? "#f97316"
              : marker.urgency === 2
                ? "#f59e0b"
                : marker.urgency === 1
                  ? "#84cc16"
                  : "#22c55e",
        ctaHref: `/issues/${marker.id}`,
        ctaLabel: MODE_CONFIG.issues.ctaLabel,
        eyebrow: "Issue",
        meta: formatUrgency(marker.urgency ?? null),
      })),
    }),
    [grantMarkersState, issueMarkersState, projectMarkersState],
  );

  const statsByMode = useMemo<
    Record<HomeGlobeMode, { leftTitle: string; rightTitle: string; left: StatItem[]; right: StatItem[]; footnote: string }>
  >(
    () => ({
      projects: {
        leftTitle: "Project momentum",
        rightTitle: "Community impact",
        left: [
          { label: "Approved projects", value: homeStatsState?.projects.projects_approved, format: "number" },
          { label: "Ongoing projects", value: homeStatsState?.projects.projects_ongoing, format: "number" },
        ],
        right: [
          { label: "Verified organisations", value: homeStatsState?.projects.organisations_registered, format: "number" },
          { label: "Donations received", value: homeStatsState?.projects.donations_received_eur, format: "currency" },
        ],
        footnote:
          "Totals include projects added here and projects imported from IATI (the International Aid Transparency Initiative).",
      },
      funding: {
        leftTitle: "Funding flow",
        rightTitle: "Funder network",
        left: [
          { label: "Funding opportunities", value: homeStatsState?.funding.opportunities_total, format: "number" },
          { label: "Open calls", value: homeStatsState?.funding.open_calls, format: "number" },
        ],
        right: [{ label: "Funders represented", value: homeStatsState?.funding.funders_registered, format: "number" }],
        footnote: "Counts include published funding calls that are open or rolling.",
      },
      issues: {
        leftTitle: "Issue visibility",
        rightTitle: "Urgency signals",
        left: [{ label: "Approved issues", value: homeStatsState?.issues.issues_total, format: "number" }],
        right: [{ label: "High-urgency alerts", value: homeStatsState?.issues.issues_open, format: "number" }],
        footnote: "High-urgency alerts are approved issues marked 4+ on urgency.",
      },
    }),
    [homeStatsState],
  );

  const activeStats = statsByMode[mode];

  const handleRowBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocus = event.relatedTarget;
    if (!nextFocus || !buttonRowRef.current?.contains(nextFocus as Node)) {
      setMode(DEFAULT_MODE);
    }
  };

  const scrollToNextSection = useCallback(() => {
    const next = document.getElementById("home-next-section");
    next?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <section className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden">
      <div id="home-globe" className="absolute inset-0 z-0">
        <HomeGlobe mode={mode} pointsByMode={pointsByMode} projects={projectLayer} />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-slate-950/30 via-slate-950/10 to-slate-950/40" />
      </div>

      <div className="pointer-events-none relative z-10 flex h-full w-full flex-col">
        <div className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6">
          <div className="max-w-2xl space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Impact, mapped.
            </h1>
            <p className="max-w-xl text-lg leading-7 text-white/85">
              Humanitarian and environmental projects, funding and local issues from around the world, in one place.
            </p>
            {isLoading ? <p className="text-sm text-white/70">Loading live globe data…</p> : null}
          </div>

          <div className="pointer-events-auto mt-6">
            <div
              ref={buttonRowRef}
              className="hidden flex-wrap gap-3 md:flex"
              onMouseLeave={() => setMode(DEFAULT_MODE)}
              onBlurCapture={handleRowBlur}
            >
              {(Object.keys(MODE_CONFIG) as HomeGlobeMode[]).map((key) => {
                const item = MODE_CONFIG[key];
                const isActive = mode === key;
                return (
                  <Link
                    key={key}
                    href={item.href}
                    onMouseEnter={() => setMode(key)}
                    onFocus={() => setMode(key)}
                    className={cn(
                      "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white",
                      isActive
                        ? "bg-white text-soltas-text hover:bg-white/90"
                        : "border border-white/25 bg-white/10 text-white backdrop-blur-md hover:bg-white/20",
                    )}
                    aria-current={isActive ? "true" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {followingCount != null && mode === "projects" ? (
              <div
                className="mt-3 inline-flex rounded-full border border-white/25 bg-white/10 p-1 backdrop-blur-md"
                role="group"
                aria-label="Which projects to show"
              >
                {[
                  { value: false, label: "All projects" },
                  { value: true, label: followingCount ? `Following (${numberFormatter.format(followingCount)})` : "Following" },
                ].map((option) => (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() => setShowFollowing(option.value)}
                    aria-pressed={showFollowing === option.value}
                    className={cn(
                      "h-9 rounded-full px-4 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white",
                      showFollowing === option.value ? "bg-white text-soltas-text" : "text-white/90 hover:bg-white/10",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
            {showFollowing && followingCount === 0 && mode === "projects" ? (
              <p className="mt-2 text-sm text-white/80">
                You don’t follow anything yet. Follow a project or an organisation to see it here.
              </p>
            ) : null}

            <div className="mt-4 flex flex-col gap-3 md:hidden">
              <div
                className="grid grid-cols-3 rounded-full border border-white/25 bg-white/10 p-1 backdrop-blur-md"
                role="tablist"
                aria-label="Select globe preview mode"
                aria-orientation="horizontal"
              >
                {(Object.keys(MODE_CONFIG) as HomeGlobeMode[]).map((key) => {
                  const item = MODE_CONFIG[key];
                  const isActive = mode === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMode(key)}
                      className={cn(
                        "h-9 rounded-full text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white",
                        isActive ? "bg-white text-soltas-text" : "text-white/90 hover:bg-white/10",
                      )}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls="home-globe"
                    >
                      {item.mobileLabel}
                    </button>
                  );
                })}
              </div>
              <Link
                href={MODE_CONFIG[mode].href}
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-[15px] font-medium text-soltas-text transition hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Open {MODE_CONFIG[mode].mobileLabel}
              </Link>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto absolute inset-x-0 bottom-20 px-4 sm:px-6">
          <StatsBar items={[...activeStats.left, ...activeStats.right]} />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center">
          <button
            type="button"
            onClick={scrollToNextSection}
            aria-label="Scroll to next section"
            className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-soltas-text/35 text-white/90 backdrop-blur-md transition hover:bg-soltas-text/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-soltas-glacial"
          >
            <ChevronDown className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}


function StatsBar({ items }: { items: StatItem[] }) {
  if (!items.length) return null;
  return (
    <dl
      className="mx-auto grid w-full max-w-3xl grid-cols-2 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1 gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.6)] backdrop-blur-xl sm:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
      style={{ "--cols": Math.min(items.length, 5) } as React.CSSProperties}
    >
      {items.map((item) => (
        <div key={item.label} className="bg-black/10 px-4 py-3 sm:px-5 sm:py-4">
          <dt className="text-xs text-white/70">{item.label}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums leading-none text-white sm:text-2xl">
            {formatStatValue(item)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
