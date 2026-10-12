"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, FocusEvent } from "react";
import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";

import HomeGlobe, { type HomeGlobeMode, type HomeGlobePoint } from "@/components/home/HomeGlobe";
import type { GrantMarker } from "@/lib/grants/findGrantsQuery";
import type { HomeStats } from "@/lib/homeStats";
import type { ProjectMarker } from "@/lib/projects/findProjectsQuery";
import { cn } from "@/lib/utils";
import type { WatchdogIssueMarker } from "@/lib/watchdog/findWatchdogIssuesQuery";

const DEFAULT_MODE: HomeGlobeMode = "projects";
const STATS_SIZE_STORAGE_KEY = "home-globe-panel-size-v5";

type PanelKey = "left" | "right";
type PanelSize = { width: number; height: number };

// Panel sizing
const PANEL_MIN_WIDTH = 300;
const PANEL_MAX_WIDTH = 560;

// Keep a fixed aspect ratio (always a horizontal rectangle)
const PANEL_DEFAULT_WIDTH = 340;
const PANEL_DEFAULT_HEIGHT = 220;
const PANEL_ASPECT = PANEL_DEFAULT_WIDTH / PANEL_DEFAULT_HEIGHT;

// Derived height constraints (because width is the single source of truth)
const PANEL_MIN_HEIGHT = Math.round(PANEL_MIN_WIDTH / PANEL_ASPECT);
const PANEL_MAX_HEIGHT = Math.round(PANEL_MAX_WIDTH / PANEL_ASPECT);

const PANEL_PADDING_X = 32;
const PANEL_PADDING_BOTTOM = 32;

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
    href: "/watchdog",
    ctaLabel: "Open issue",
    mobileLabel: "Issues",
  },
};

const formatPlace = (parts: Array<string | null | undefined>) => {
  const filtered = parts.filter(Boolean) as string[];
  return filtered.length ? filtered.join(", ") : null;
};

const formatUrgency = (urgency: number | null | undefined) => {
  if (!urgency) return null;
  return `Urgency ${urgency}`;
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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const defaultSize = (): PanelSize => ({
  width: PANEL_DEFAULT_WIDTH,
  height: PANEL_DEFAULT_HEIGHT,
});

const clampWidthToSize = (w: number): PanelSize => {
  const width = clamp(Math.round(w), PANEL_MIN_WIDTH, PANEL_MAX_WIDTH);
  const height = clamp(Math.round(width / PANEL_ASPECT), PANEL_MIN_HEIGHT, PANEL_MAX_HEIGHT);
  // Keep aspect exactly by deriving width from clamped height:
  const finalWidth = clamp(Math.round(height * PANEL_ASPECT), PANEL_MIN_WIDTH, PANEL_MAX_WIDTH);
  const finalHeight = clamp(Math.round(finalWidth / PANEL_ASPECT), PANEL_MIN_HEIGHT, PANEL_MAX_HEIGHT);
  return { width: finalWidth, height: finalHeight };
};

// Typography/layout scaling factor derived from width (no transforms)
const scaleFromWidth = (width: number) => clamp(width / PANEL_DEFAULT_WIDTH, 0.88, 1.28);

// ESLint-safe CSS var typing (NO `any`)
type CSSVars = CSSProperties & { ["--panel-scale"]?: string };

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
        markerColor: marker.category === "humanitarian" ? "#7f1d1d" : "#064e3b",
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
        markerColor:
          marker.project_type === "humanitarian"
            ? "#7f1d1d"
            : marker.project_type === "environmental"
              ? "#064e3b"
              : marker.project_type === "both"
                ? "#1e3a8a"
                : "#10b981",
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
        ctaHref: `/watchdog?view=table&focus=${marker.id}`,
        ctaLabel: MODE_CONFIG.issues.ctaLabel,
        eyebrow: "Watchdog issue",
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
        footnote: "Totals reflect approved public projects and verified organisations.",
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
        <HomeGlobe mode={mode} pointsByMode={pointsByMode} />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-slate-950/30 via-slate-950/10 to-slate-950/40" />
      </div>

      <div className="pointer-events-none relative z-10 flex h-full w-full flex-col">
        <div className="px-6 pt-8 sm:px-8 lg:px-12">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-soltas-glacial">Solarpunk Taskforce</p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Discover regenerative projects around the globe.
            </h1>
            <p className="text-base text-white/80">
              Explore approved community projects, funding opportunities, and watchdog issues from the Solarpunk Taskforce
              ecosystem.
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
                      "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2 font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-soltas-ocean",
                      isActive
                        ? "bg-soltas-ocean text-white hover:bg-soltas-abyssal"
                        : "border border-white/25 bg-white/10 text-white backdrop-blur-md hover:bg-white/15",
                    )}
                    aria-current={isActive ? "true" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-3 md:hidden">
              <div
                className="grid grid-cols-3 rounded-2xl border border-white/25 bg-white/10 p-1 backdrop-blur-md"
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
                        "h-10 rounded-2xl text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-soltas-ocean",
                        isActive ? "bg-soltas-ocean text-white" : "text-white/90 hover:bg-white/10",
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
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-soltas-ocean"
              >
                Open {MODE_CONFIG[mode].mobileLabel}
              </Link>
            </div>
          </div>
        </div>

        <PinnedStatsPanels activeStats={activeStats} />

        <div className="pointer-events-auto absolute inset-x-0 bottom-0 px-6 pb-6 sm:px-8 lg:hidden">
          <div className="grid gap-4 md:grid-cols-2">
            <HomeStatsPanel key={`${mode}-snapshot-left`} title="Snapshot" items={activeStats.left} />
            <HomeStatsPanel key={`${mode}-snapshot-right`} title="Snapshot" items={activeStats.right} />
          </div>
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

type ActiveStats = {
  leftTitle: string;
  rightTitle: string;
  left: StatItem[];
  right: StatItem[];
  footnote?: string;
};

function PinnedStatsPanels({ activeStats }: { activeStats: ActiveStats }) {
  const [panelSize, setPanelSize] = useState<PanelSize>(() => {
    if (typeof window === "undefined") return defaultSize();
    try {
      const saved = localStorage.getItem(STATS_SIZE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<PanelSize>;
        if (typeof parsed.width === "number") {
          return clampWidthToSize(parsed.width);
        }
      }
    } catch {
      // ignore
    }
    return defaultSize();
  });

  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);

  const committedRef = useRef(panelSize);
  useEffect(() => {
    committedRef.current = panelSize;
  }, [panelSize]);

  // Persist after commit
  useEffect(() => {
    try {
      localStorage.setItem(STATS_SIZE_STORAGE_KEY, JSON.stringify(panelSize));
    } catch {
      // ignore
    }
  }, [panelSize]);

  const rafRef = useRef<number | null>(null);
  const liveWidthRef = useRef<number>(panelSize.width);

  const applyLiveWidth = useCallback((width: number) => {
    const sized = clampWidthToSize(width);
    liveWidthRef.current = sized.width;

    const s = scaleFromWidth(sized.width);

    const apply = (el: HTMLDivElement | null) => {
      if (!el) return;
      el.style.width = `${sized.width}px`;
      el.style.height = `${sized.height}px`;
      el.style.setProperty("--panel-scale", String(s));
    };

    apply(leftPanelRef.current);
    apply(rightPanelRef.current);
  }, []);

  const scheduleApply = useCallback(
    (width: number) => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        applyLiveWidth(width);
      });
    },
    [applyLiveWidth],
  );

  useEffect(() => {
    applyLiveWidth(panelSize.width);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDraggingCursor = (isDragging: boolean) => {
    const root = document.documentElement;
    if (isDragging) {
      root.style.cursor = "nwse-resize";
      root.style.userSelect = "none";
    } else {
      root.style.cursor = "";
      root.style.userSelect = "";
    }
  };

  const dragRef = useRef<{
    panelKey: PanelKey;
    startX: number;
    startY: number;
    startW: number;
  } | null>(null);

  const onStartResize = useCallback(
    (panelKey: PanelKey, e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const start = committedRef.current;
      dragRef.current = {
        panelKey,
        startX: e.clientX,
        startY: e.clientY,
        startW: start.width,
      };

      setDraggingCursor(true);

      const onMove = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;

        const dx = ev.clientX - d.startX;
        const dy = ev.clientY - d.startY;

        // left grows right/up, right grows left/up
        const signedDx = d.panelKey === "left" ? dx : -dx;
        const signedDy = -dy;

        // Dominant axis by magnitude (prevents sticky shrink)
        const useX = Math.abs(signedDx) >= Math.abs(signedDy);

        // Convert movement into width delta (single source of truth)
        const deltaW = useX ? signedDx : signedDy * PANEL_ASPECT;

        scheduleApply(d.startW + deltaW);
      };

      const onEnd = () => {
        setDraggingCursor(false);
        dragRef.current = null;

        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);

        setPanelSize(clampWidthToSize(liveWidthRef.current));
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onEnd, { passive: true });
      window.addEventListener("pointercancel", onEnd, { passive: true });
    },
    [scheduleApply],
  );

  return (
    <>
      <div className="pointer-events-none absolute hidden lg:block" style={{ left: PANEL_PADDING_X, bottom: PANEL_PADDING_BOTTOM }}>
        <PinnedStatsPanelShell
          ref={leftPanelRef}
          panelKey="left"
          title={activeStats.leftTitle}
          items={activeStats.left}
          footnote={activeStats.footnote}
          align="left"
          onStartResize={onStartResize}
        />
      </div>

      <div className="pointer-events-none absolute hidden lg:block" style={{ right: PANEL_PADDING_X, bottom: PANEL_PADDING_BOTTOM }}>
        <PinnedStatsPanelShell
          ref={rightPanelRef}
          panelKey="right"
          title={activeStats.rightTitle}
          items={activeStats.right}
          footnote={activeStats.footnote}
          align="right"
          onStartResize={onStartResize}
        />
      </div>
    </>
  );
}

type PanelShellProps = {
  panelKey: PanelKey;
  title: string;
  items: StatItem[];
  footnote?: string;
  align: "left" | "right";
  onStartResize: (panelKey: PanelKey, e: React.PointerEvent<HTMLButtonElement>) => void;
};

const PinnedStatsPanelShell = forwardRef<HTMLDivElement, PanelShellProps>(function PinnedStatsPanelShell(
  { panelKey, title, items, footnote, align, onStartResize },
  ref,
) {
  if (!items.length) return null;

  const cornerClass = panelKey === "left" ? "-top-2 -right-2" : "-top-2 -left-2";

  const baseStyle: CSSVars = {
    width: `${PANEL_DEFAULT_WIDTH}px`,
    height: `${PANEL_DEFAULT_HEIGHT}px`,
    "--panel-scale": String(scaleFromWidth(PANEL_DEFAULT_WIDTH)),
  };

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-auto group relative rounded-3xl border border-white/25 bg-white/10",
        "shadow-[0_20px_60px_-30px_rgba(15,23,42,0.55)] backdrop-blur-xl",
        // Do NOT overflow-hidden: avoids clipping while layout reflows
        "overflow-visible",
      )}
      style={baseStyle}
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-transparent transition group-hover:ring-white/20" />

      {/* Content uses CSS var --panel-scale for ALL sizing (no transform desync) */}
      <div
        className={cn("relative h-full w-full", align === "right" ? "text-right" : "text-left")}
        style={{
          padding: "calc(16px * var(--panel-scale))",
          display: "flex",
          flexDirection: "column",
          gap: "calc(14px * var(--panel-scale))",
          alignItems: align === "right" ? "flex-end" : "flex-start",
        }}
      >
        <div
          className="flex w-full items-center justify-between"
          style={{
            columnGap: "calc(10px * var(--panel-scale))",
            fontSize: "calc(11px * var(--panel-scale))",
            letterSpacing: "0.2em",
            fontWeight: 700,
            textTransform: "uppercase",
            color: "rgb(180 226 235 / 1)",
          }}
        >
          <span>{title}</span>
          <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 600, letterSpacing: "0.16em" }}>
            Live aggregates
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            rowGap: "calc(10px * var(--panel-scale))",
            width: "100%",
            alignItems: align === "right" ? "flex-end" : "flex-start",
          }}
        >
          {items.map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                rowGap: "calc(4px * var(--panel-scale))",
                alignItems: align === "right" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  fontSize: "calc(12px * var(--panel-scale))",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.78)",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: "calc(30px * var(--panel-scale))",
                  lineHeight: 1,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.98)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatStatValue(item)}
              </div>
            </div>
          ))}
        </div>

        {footnote ? (
          <p
            style={{
              marginTop: "auto",
              fontSize: "calc(12px * var(--panel-scale))",
              lineHeight: 1.25,
              color: "rgba(255,255,255,0.55)",
              maxWidth: "100%",
            }}
          >
            {footnote}
          </p>
        ) : null}
      </div>

      {/* Resize handle */}
      <button
        type="button"
        aria-label="Resize panel"
        onPointerDown={(e) => onStartResize(panelKey, e)}
        className={cn(
          "absolute z-20",
          cornerClass,
          "h-12 w-12 cursor-nwse-resize rounded-2xl",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-soltas-ocean",
          "pointer-events-auto group",
        )}
      >
        {/* Invisible large hit area */}
        <span className="absolute inset-0 rounded-2xl" />

        {/* Sharp architectural corner line — perfectly aligned with panel borders */}
        <span className="absolute inset-0 pointer-events-none">
          {panelKey === "left" ? (
            // Left panel: top-right corner (┐)
            <span
              className={cn(
                "absolute top-0 right-0 h-6 w-6",
                "border-t-2 border-r-2",
                "border-white/70",
                "transition duration-200",
                "group-hover:border-white group-hover:scale-105",
                "group-active:scale-95",
              )}
              style={{
                transformOrigin: "top right",
              }}
            />
          ) : (
            // Right panel: top-left corner (┌)
            <span
              className={cn(
                "absolute top-0 left-0 h-6 w-6",
                "border-t-2 border-l-2",
                "border-white/70",
                "transition duration-200",
                "group-hover:border-white group-hover:scale-105",
                "group-active:scale-95",
              )}
              style={{
                transformOrigin: "top left",
              }}
            />
          )}
        </span>

        {/* Subtle hover hint (desktop only) */}
        <span
          className={cn(
            "pointer-events-none absolute hidden whitespace-nowrap rounded-full border border-white/20 bg-slate-950/55 px-3 py-1 text-[11px] font-semibold text-white/85 backdrop-blur-md shadow-sm",
            "opacity-0 transition duration-200 group-hover:opacity-100 lg:block",
            panelKey === "left" ? "right-1 -top-10" : "left-1 -top-10",
          )}
        >
          Drag to resize
        </span>
      </button>
    </div>
  );
});

PinnedStatsPanelShell.displayName = "PinnedStatsPanelShell";

// ─── HomeStatsPanel (mobile only) ────────────────────────────────────────────

function HomeStatsPanel({
  title,
  items,
  footnote,
  align = "left",
}: {
  title: string;
  items: StatItem[];
  footnote?: string;
  align?: "left" | "right";
}) {
  if (!items.length) return null;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-3xl border border-white/25 bg-white/10 p-4 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.55)] backdrop-blur-xl",
        align === "right" ? "items-end text-right" : "items-start text-left",
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-soltas-glacial">{title}</div>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-0.5">
            <div className="text-xs font-medium text-white/75">{item.label}</div>
            <div className="text-2xl font-semibold leading-none text-white">{formatStatValue(item)}</div>
          </div>
        ))}
      </div>
      {footnote ? <p className="text-xs text-white/50">{footnote}</p> : null}
    </div>
  );
}