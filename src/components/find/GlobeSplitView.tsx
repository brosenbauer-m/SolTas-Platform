"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { GripVertical, SlidersHorizontal, X } from "lucide-react";

import Map, { type MapClusterLayer, type MapMarker } from "@/components/Map";
import { MARKER_COLORS } from "@/lib/markerColors";

type Props = {
  /** The filter form shown in the left panel (and in the drawer on phones). */
  filters: ReactNode;
  markers: MapMarker[];
  /** Optional clustered layer for large point sets (IATI activities). */
  clusters?: MapClusterLayer | null;
  /** Shown over the map, e.g. a colour key. */
  legend?: ReactNode;
  /** e.g. "12 projects mapped · 40 matching" */
  summary: string;
  focusSlug: string | null;
  ctaLabel?: string;
  /** localStorage key to remember the panel width per page. */
  storageKey: string;
};

const MOBILE_BREAKPOINT = 768;
/** Filters take 70% of the width by default; the globe gets the rest. */
const DEFAULT_RATIO = 0.7;
const MIN_RATIO = 0.25;
const MAX_RATIO = 0.8;
const MIN_PANEL_PX = 320;
const MIN_MAP_PX = 280;
const KEY_STEP = 0.05;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function readRatio(key: string) {
  try {
    const stored = Number(window.localStorage.getItem(key));
    return Number.isFinite(stored) && stored > 0 ? clamp(stored, MIN_RATIO, MAX_RATIO) : DEFAULT_RATIO;
  } catch {
    return DEFAULT_RATIO;
  }
}

function saveRatio(key: string, ratio: number) {
  try {
    window.localStorage.setItem(key, ratio.toFixed(3));
  } catch {
    // private mode or storage blocked: the width just isn't remembered
  }
}

/**
 * Find pages: filter panel on the left, globe on the right, with a draggable divider.
 * The divider has a handle in the middle; drag it, or focus it and use the arrow keys.
 * Double-click the handle to go back to the default 70/30 split.
 */
export default function GlobeSplitView({
  filters,
  markers,
  clusters = null,
  legend = null,
  summary,
  focusSlug,
  ctaLabel = "See more",
  storageKey,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const [dragging, setDragging] = useState(false);
  const [recenterNonce, setRecenterNonce] = useState(0);

  useEffect(() => {
    setRatio(readRatio(storageKey));
  }, [storageKey]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /** Keep both sides usable on narrow windows. */
  const boundedRatio = useCallback((value: number) => {
    const width = containerRef.current?.getBoundingClientRect().width ?? 0;
    if (width <= 0) return clamp(value, MIN_RATIO, MAX_RATIO);
    const min = Math.max(MIN_RATIO, MIN_PANEL_PX / width);
    const max = Math.min(MAX_RATIO, 1 - MIN_MAP_PX / width);
    return clamp(value, min, Math.max(min, max));
  }, []);

  const commit = useCallback(
    (value: number) => {
      const next = boundedRatio(value);
      setRatio(next);
      saveRatio(storageKey, next);
    },
    [boundedRatio, storageKey],
  );

  useEffect(() => {
    if (!dragging) return;
    let frame: number | null = null;
    let lastX = 0;

    const onMove = (event: PointerEvent) => {
      lastX = event.clientX;
      if (frame != null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0) return;
        setRatio(boundedRatio((lastX - rect.left) / rect.width));
      });
    };
    const onUp = () => {
      setDragging(false);
      setRatio((current) => {
        saveRatio(storageKey, current);
        return current;
      });
      setRecenterNonce((n) => n + 1);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      if (frame != null) window.cancelAnimationFrame(frame);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, boundedRatio, storageKey]);

  const onHandleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft") commit(ratio - KEY_STEP);
    else if (event.key === "ArrowRight") commit(ratio + KEY_STEP);
    else if (event.key === "Home") commit(MIN_RATIO);
    else if (event.key === "End") commit(MAX_RATIO);
    else return;
    event.preventDefault();
    setRecenterNonce((n) => n + 1);
  };

  const map = (
    <Map
      markers={markers}
      clusters={clusters}
      markerColor={MARKER_COLORS.default}
      focusSlug={focusSlug}
      ctaLabel={ctaLabel}
      recenterNonce={recenterNonce}
    />
  );

  if (isMobile) {
    return (
      <section className="relative h-full min-h-[480px] w-full overflow-hidden rounded-2xl border border-soltas-line bg-white">
        {map}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="absolute left-3 top-3 z-10 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-medium text-soltas-text shadow-lg ring-1 ring-black/10"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filters
        </button>
        {drawerOpen ? (
          <>
            <div className="absolute inset-0 z-20 bg-soltas-text/20" onClick={() => setDrawerOpen(false)} />
            <div
              role="dialog"
              aria-label="Filters"
              className="absolute inset-x-0 bottom-0 z-30 max-h-[80%] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[15px] font-semibold text-soltas-text">Filters</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close filters"
                  className="grid h-10 w-10 place-items-center rounded-full hover:bg-soltas-light"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {filters}
              <p className="mt-4 text-sm text-soltas-muted">{summary}</p>
            </div>
          </>
        ) : null}
      </section>
    );
  }

  const percent = `${(ratio * 100).toFixed(2)}%`;

  return (
    <section
      ref={containerRef}
      className="relative grid h-full min-h-0 w-full overflow-hidden rounded-2xl border border-soltas-line bg-white"
      // minmax(0, 1fr) row: the panel scrolls instead of growing past the screen (and the globe stays centred)
      style={{ gridTemplateColumns: `${percent} minmax(0, 1fr)`, gridTemplateRows: "minmax(0, 1fr)" }}
    >
      <div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain border-r border-soltas-line">
        <div className="p-5 lg:p-6">
          {filters}
          <p className="mt-5 text-sm text-soltas-muted">{summary}</p>
        </div>
      </div>

      <div className="relative min-h-0 min-w-0">
        {map}
        {legend ? <div className="pointer-events-none absolute left-3 right-14 top-3 z-[1] flex">{legend}</div> : null}
      </div>

      {/* Divider: a wide invisible hit area on the border with a handle in the middle */}
      <div
        className="group absolute inset-y-0 z-10 w-3 -translate-x-1/2 cursor-col-resize"
        style={{ left: percent }}
        onPointerDown={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDoubleClick={() => {
          commit(DEFAULT_RATIO);
          setRecenterNonce((n) => n + 1);
        }}
      >
        <div
          className={[
            "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors",
            dragging ? "bg-soltas-ocean" : "bg-transparent group-hover:bg-soltas-ocean/50",
          ].join(" ")}
        />
        <button
          type="button"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize filters and globe. Use the left and right arrow keys; double-click to reset."
          aria-valuemin={Math.round(MIN_RATIO * 100)}
          aria-valuemax={Math.round(MAX_RATIO * 100)}
          aria-valuenow={Math.round(ratio * 100)}
          onKeyDown={onHandleKey}
          className={[
            "absolute left-1/2 top-1/2 grid h-12 w-6 -translate-x-1/2 -translate-y-1/2 cursor-col-resize place-items-center rounded-full border bg-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-soltas-ocean",
            dragging
              ? "border-soltas-ocean text-soltas-ocean"
              : "border-soltas-line text-soltas-muted group-hover:border-soltas-ocean/50 group-hover:text-soltas-ocean",
          ].join(" ")}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}
