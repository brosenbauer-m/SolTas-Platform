"use client";

import { MARKER_COLORS } from "@/lib/markerColors";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import Map from "@/components/Map";
import OrganisationsFilters from "@/components/organisations/OrganisationsFilters";
import type {
  OrganisationFilterOptions,
  OrganisationMarker,
} from "@/lib/organisations/findOrganisationsQuery";

type Props = {
  options: OrganisationFilterOptions;
  markers: OrganisationMarker[];
  totalCount: number;
  focusSlug: string | null;
};

const MOBILE_BREAKPOINT = 768;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function OrganisationsGlobeSplitView({
  options,
  markers,
  totalCount,
  focusSlug,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const draggingRef = useRef(false);
  const dragPointerIdRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastClientXRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  const [panelWidth, setPanelWidth] = useState<number>(420);
  const [collapsed, setCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [recenterNonce, setRecenterNonce] = useState(0);

  const lastExpandedWidthRef = useRef<number>(420);

  const limits = useMemo(
    () => ({
      absoluteMin: 360,
      absoluteMax: 1200,
      handle: 34,
    }),
    [],
  );

  const computeBounds = useCallback(
    (containerWidth: number) => {
      const minByRatio = Math.floor(containerWidth * 0.25);
      const maxByRatio = Math.floor(containerWidth * 0.75);

      const min = Math.max(limits.absoluteMin, minByRatio);
      const max = Math.min(limits.absoluteMax, maxByRatio);

      const safeMax = Math.max(min, max);
      return { min, max: safeMax };
    },
    [limits.absoluteMax, limits.absoluteMin],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const apply = () => {
      const w = el.getBoundingClientRect().width;
      if (!Number.isFinite(w) || w <= 0) return;

      const { min, max } = computeBounds(w);

      setPanelWidth((current) => {
        if (collapsed) return 0;

        if (!initializedRef.current) {
          initializedRef.current = true;
          const initial = clamp(Math.floor(w / 3), min, max);
          lastExpandedWidthRef.current = initial;
          return initial;
        }

        const next = clamp(current, min, max);
        lastExpandedWidthRef.current = next;
        return next;
      });
    };

    apply();
    const ro = new ResizeObserver(() => apply());
    ro.observe(el);
    return () => ro.disconnect();
  }, [computeBounds, collapsed]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      lastClientXRef.current = e.clientX;

      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;

        const el = containerRef.current;
        const x = lastClientXRef.current;
        if (!el || x == null) return;

        const rect = el.getBoundingClientRect();
        const raw = x - rect.left;

        const { min, max } = computeBounds(rect.width);

        if (collapsed) setCollapsed(false);

        const next = clamp(Math.floor(raw), min, max);
        lastExpandedWidthRef.current = next;
        setPanelWidth(next);
      });
    };

    const stopDrag = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setIsDragging(false);

      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      const pointerId = dragPointerIdRef.current;
      dragPointerIdRef.current = null;

      const active = document.activeElement;
      if (pointerId != null && active instanceof HTMLElement && active.releasePointerCapture) {
        try {
          active.releasePointerCapture(pointerId);
        } catch {
          // ignore
        }
      }

      // One-shot: now that layout is stable, recenter once.
      setRecenterNonce((n) => n + 1);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [computeBounds, collapsed]);

  const startDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    draggingRef.current = true;
    setIsDragging(true);
    dragPointerIdRef.current = e.pointerId;

    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    if (collapsed) {
      const el = containerRef.current;
      if (el) {
        const { min, max } = computeBounds(el.getBoundingClientRect().width);
        const restored = clamp(lastExpandedWidthRef.current || min, min, max);
        setCollapsed(false);
        setPanelWidth(restored);
        lastExpandedWidthRef.current = restored;
      } else {
        setCollapsed(false);
      }
    }
  };

  const toggleCollapsed = () => {
    const el = containerRef.current;

    if (!collapsed) {
      if (panelWidth > 0) lastExpandedWidthRef.current = panelWidth;
      setCollapsed(true);
      setPanelWidth(0);
      setRecenterNonce((n) => n + 1);
      return;
    }

    if (el) {
      const { min, max } = computeBounds(el.getBoundingClientRect().width);
      const restored = clamp(
        lastExpandedWidthRef.current || Math.floor(el.getBoundingClientRect().width / 3),
        min,
        max,
      );
      setCollapsed(false);
      setPanelWidth(restored);
      lastExpandedWidthRef.current = restored;
      setRecenterNonce((n) => n + 1);
    } else {
      setCollapsed(false);
      setPanelWidth(lastExpandedWidthRef.current || limits.absoluteMin);
      setRecenterNonce((n) => n + 1);
    }
  };

  if (isMobile) {
    return (
      <section className="relative h-full w-full min-h-0 overflow-hidden rounded-2xl border border-soltas-line bg-white">
        <div className="h-full w-full">
          <Map
            markers={markers}
            markerColor={MARKER_COLORS.default}
            focusSlug={focusSlug}
            ctaLabel="See more"
            recenterNonce={recenterNonce}
            freeze={false}
          />
        </div>

        {/* Mobile filters toggle */}
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(o => !o)}
          className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-soltas-text shadow-lg ring-1 ring-black/10"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </button>

        {/* Mobile filters drawer */}
        {mobileFiltersOpen && (
          <>
            <div className="absolute inset-0 z-20 bg-soltas-text/20" onClick={() => setMobileFiltersOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 z-30 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-soltas-text">Filters</span>
                <button type="button" onClick={() => setMobileFiltersOpen(false)} className="rounded-lg p-1 hover:bg-soltas-light">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4">
                <OrganisationsFilters options={options} />
                <div className="rounded-lg border border-dashed border-soltas-line bg-soltas-off-white p-3 text-sm text-soltas-muted">
                  {markers.length} mapped · {totalCount} total
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      className="h-full w-full min-h-0 overflow-hidden rounded-2xl border border-soltas-line bg-white"
    >
      <div
        className="grid h-full w-full"
        style={{ gridTemplateColumns: `${panelWidth}px ${limits.handle}px 1fr` }}
      >
        {/* Left panel */}
        <div
          className={[
            "min-w-0 h-full border-r border-soltas-line bg-white transition-[opacity] duration-150",
            collapsed ? "pointer-events-none opacity-0" : "opacity-100",
          ].join(" ")}
          aria-hidden={collapsed ? "true" : "false"}
        >
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-4">
              <OrganisationsFilters options={options} />
              <div className="rounded-lg border border-dashed border-soltas-line bg-soltas-off-white p-4 text-sm text-soltas-muted">
                {markers.length} organisations mapped · {totalCount} total matching filters
              </div>
            </div>
          </div>
        </div>

        {/* Handle column */}
        <div className="relative h-full w-full bg-soltas-off-white">
          <button
            type="button"
            aria-label="Resize panel"
            onPointerDown={startDrag}
            className="group absolute inset-0 h-full w-full cursor-col-resize focus:outline-none"
          >
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-soltas-line transition-colors group-hover:bg-soltas-ocean/40" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none">
              <div className="h-8 w-1.5 rounded-full bg-soltas-muted/40 transition-colors group-hover:bg-soltas-ocean/60" />
            </div>
          </button>

          <button
            type="button"
            aria-label={collapsed ? "Open filters panel" : "Close filters panel"}
            onClick={toggleCollapsed}
            className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full border border-soltas-line bg-white px-3 py-1.5 text-xs font-medium text-soltas-text shadow-sm hover:bg-soltas-off-white focus:outline-none focus-visible:ring-2 focus-visible:ring-soltas-ocean"
          >
            {collapsed ? "Filters" : "Hide"}
          </button>
        </div>

        {/* Map */}
        <div className="min-w-0 h-full">
          <Map
            markers={markers}
            markerColor={MARKER_COLORS.default}
            focusSlug={focusSlug}
            ctaLabel="See more"
            recenterNonce={recenterNonce}
            freeze={isDragging}
          />
        </div>
      </div>
    </section>
  );
}
