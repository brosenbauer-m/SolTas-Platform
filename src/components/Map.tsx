"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

// Token guard
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
const HAS_MAPBOX_TOKEN = typeof MAPBOX_TOKEN === "string" && MAPBOX_TOKEN.length > 0
mapboxgl.accessToken = MAPBOX_TOKEN || ""
;(mapboxgl as typeof mapboxgl & { setTelemetryEnabled?: (enabled: boolean) => void }).setTelemetryEnabled?.(false)

const truncate = (value: string, length = 160) =>
  value.length > length ? `${value.slice(0, length).trimEnd()}…` : value

export type MapMarker = {
  id: string
  slug: string
  lng: number
  lat: number
  title: string
  placeName?: string | null
  description?: string | null
  ctaHref?: string
  markerColor?: string
}

/**
 * A large point set drawn as clustered circles (numbers that split as you zoom in) instead of DOM markers.
 * The GeoJSON at `url` has Point features with properties.id and optionally properties.a = 1 (approximate,
 * drawn hollow). Clicking a point loads a short summary from `detailsUrl(id)` for the popup.
 */
export type MapClusterLayer = {
  url: string
  color: string
  /** Small label above the popup title, e.g. "Published to IATI" */
  badge: string
  ctaLabel: string
  detailsUrl: (id: string) => string
}

type ClusterDetails = {
  title: string
  organisation?: string | null
  place?: string | null
  description?: string | null
  approximate?: boolean
  href: string
}

const CLUSTER_SOURCE = "cluster-points"
const CLUSTER_LAYERS = ["cluster-circles", "cluster-counts", "cluster-points"] as const

type MapProps = {
  markers?: MapMarker[]
  /** Optional clustered layer for large point sets (e.g. IATI activities). */
  clusters?: MapClusterLayer | null
  markerColor?: string
  focusSlug?: string | null
  ctaLabel?: string

  /** Increment to force a one-shot recenter after layout changes. */
  recenterNonce?: number

  /** When true, visually freeze the map during aggressive layout changes (e.g. dragging splitter). */
  freeze?: boolean
}

type MarkerObject = {
  marker: mapboxgl.Marker
  element: HTMLDivElement
  slug: string
  lng: number
  lat: number
}

const getMarkerScale = (zoom: number) => {
  const scale = zoom / 8
  return Math.min(Math.max(scale, 0.65), 1.75)
}

export default function Map({
  markers = [],
  clusters = null,
  markerColor = "#2E6B8A",
  focusSlug = null,
  ctaLabel = "View",
  recenterNonce,
  freeze = false,
}: MapProps) {
  // Hooks MUST be unconditional
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerObjs = useRef<MarkerObject[]>([])
  const [styleReady, setStyleReady] = useState(false)
  const clustersRef = useRef<MapClusterLayer | null>(clusters)
  useEffect(() => {
    clustersRef.current = clusters
  }, [clusters])
  const hasDomMarkersRef = useRef(false)

  const userInteractedRef = useRef(false)
  const userInteractTimerRef = useRef<number | null>(null)

  const validMarkers = useMemo(
    () => markers.filter((m) => Number.isFinite(m.lng) && Number.isFinite(m.lat)),
    [markers]
  )

  const fitToMarkers = (map: mapboxgl.Map, animate: boolean) => {
    if (validMarkers.length === 0) {
      if (animate) {
        map.easeTo({ center: [0, 0], zoom: 1.25, duration: 350 })
      } else {
        map.jumpTo({ center: [0, 0], zoom: 1.25 })
      }
      return
    }

    const bounds = new mapboxgl.LngLatBounds()
    validMarkers.forEach((m) => bounds.extend([m.lng, m.lat]))

    if (validMarkers.length === 1) {
      const [lng, lat] = [validMarkers[0].lng, validMarkers[0].lat]
      if (animate) {
        map.easeTo({ center: [lng, lat], zoom: 3, duration: 350 })
      } else {
        map.jumpTo({ center: [lng, lat], zoom: 3 })
      }
    } else {
      map.fitBounds(bounds, { padding: 48, maxZoom: 5, duration: animate ? 350 : 0 })
    }
  }

  useEffect(() => {
    // Hard guard: never init without a token
    if (!HAS_MAPBOX_TOKEN) return
    if (!containerRef.current) return
    if (mapRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [0, 0],
      zoom: 1.25,
      preserveDrawingBuffer: false,
    })

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right")
    map.on("load", () => setStyleReady(true))

    const markInteracted = () => {
      userInteractedRef.current = true
      if (userInteractTimerRef.current != null) {
        window.clearTimeout(userInteractTimerRef.current)
      }
      userInteractTimerRef.current = window.setTimeout(() => {
        userInteractedRef.current = false
        userInteractTimerRef.current = null
      }, 1500)
    }

    map.on("dragstart", markInteracted)
    map.on("zoomstart", markInteracted)
    map.on("rotatestart", markInteracted)
    map.on("pitchstart", markInteracted)

    mapRef.current = map

    // Follow the container's size (e.g. while the filter/globe divider is dragged), not only the window's.
    let resizeFrame: number | null = null
    const resizeObserver = new ResizeObserver(() => {
      if (resizeFrame != null) return
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null
        map.resize()
      })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      if (resizeFrame != null) window.cancelAnimationFrame(resizeFrame)
      if (userInteractTimerRef.current != null) window.clearTimeout(userInteractTimerRef.current)
      map.remove()
      mapRef.current = null
      setStyleReady(false)
    }
  }, [])

  // Clustered layer: added once the style has loaded; rebuilt (cleanup + add) when the URL changes.
  const clusterUrl = clusters?.url ?? null
  const clusterColor = clusters?.color ?? null
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady) return

    const removeLayer = () => {
      CLUSTER_LAYERS.forEach((id) => map.getLayer(id) && map.removeLayer(id))
      if (map.getSource(CLUSTER_SOURCE)) map.removeSource(CLUSTER_SOURCE)
    }

    if (!clusterUrl || !clusterColor) {
      removeLayer()
      return
    }

    // We fetch the GeoJSON ourselves so we can frame the points when they are all the map shows.
    const controller = new AbortController()
    const loadData = () =>
      fetch(clusterUrl, { signal: controller.signal })
        .then((res) => (res.ok ? (res.json() as Promise<GeoJSON.FeatureCollection<GeoJSON.Point>>) : Promise.reject(res.status)))
        .then((data) => {
          const source = map.getSource(CLUSTER_SOURCE) as mapboxgl.GeoJSONSource | undefined
          source?.setData(data)
          if (hasDomMarkersRef.current || !data.features.length) return
          const bounds = new mapboxgl.LngLatBounds()
          data.features.forEach((f) => bounds.extend(f.geometry.coordinates as [number, number]))
          map.fitBounds(bounds, { padding: 48, maxZoom: 6, duration: 350 })
        })
        .catch(() => {
          // aborted or failed: the layer stays as it was
        })

    map.addSource(CLUSTER_SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      cluster: true,
      clusterRadius: 44,
      clusterMaxZoom: 9,
    })
    loadData()
    map.addLayer({
      id: "cluster-circles",
      type: "circle",
      source: CLUSTER_SOURCE,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": clusterColor,
        "circle-opacity": 0.85,
        "circle-radius": ["step", ["get", "point_count"], 13, 25, 16, 250, 20, 2500, 25],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    })
    map.addLayer({
      id: "cluster-counts",
      type: "symbol",
      source: CLUSTER_SOURCE,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-size": 12,
        "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
        "text-allow-overlap": true,
      },
      paint: { "text-color": "#ffffff" },
    })
    map.addLayer({
      id: "cluster-points",
      type: "circle",
      source: CLUSTER_SOURCE,
      filter: ["!", ["has", "point_count"]],
      paint: {
        // approximate (country centre) points are hollow
        "circle-color": ["case", ["==", ["get", "a"], 1], "#ffffff", clusterColor],
        "circle-radius": 6,
        "circle-stroke-color": ["case", ["==", ["get", "a"], 1], clusterColor, "#ffffff"],
        "circle-stroke-width": 2,
      },
    })

    const zoomIntoCluster = (event: mapboxgl.MapMouseEvent) => {
      const feature = map.queryRenderedFeatures(event.point, { layers: ["cluster-circles"] })[0]
      const clusterId = feature?.properties?.cluster_id
      const source = map.getSource(CLUSTER_SOURCE) as mapboxgl.GeoJSONSource | undefined
      if (clusterId == null || !source || feature.geometry.type !== "Point") return
      const center = feature.geometry.coordinates as [number, number]
      source.getClusterExpansionZoom(clusterId, (error, zoom) => {
        if (error || zoom == null) return
        map.easeTo({ center, zoom })
      })
    }

    const openPoint = (event: mapboxgl.MapMouseEvent) => {
      const feature = map.queryRenderedFeatures(event.point, { layers: ["cluster-points"] })[0]
      const layer = clustersRef.current
      const id = feature?.properties?.id
      if (!layer || typeof id !== "string" || feature.geometry.type !== "Point") return

      const popupNode = document.createElement("div")
      popupNode.className = "space-y-2 text-sm text-soltas-text"
      const badge = document.createElement("p")
      badge.className = "text-[11px] font-semibold uppercase tracking-wide text-soltas-muted"
      badge.textContent = layer.badge
      const loading = document.createElement("p")
      loading.className = "text-sm text-soltas-muted"
      loading.textContent = "Loading…"
      popupNode.append(badge, loading)

      new mapboxgl.Popup({ offset: 10, maxWidth: "320px" })
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setDOMContent(popupNode)
        .addTo(map)

      fetch(layer.detailsUrl(id))
        .then((res) => (res.ok ? (res.json() as Promise<ClusterDetails>) : Promise.reject(res.status)))
        .then((details) => {
          loading.remove()
          const titleEl = document.createElement("h3")
          titleEl.className = "text-base font-semibold text-soltas-text"
          titleEl.textContent = details.title
          popupNode.appendChild(titleEl)

          const meta = [details.organisation, details.place].filter(Boolean).join(" · ")
          if (meta) {
            const metaEl = document.createElement("p")
            metaEl.className = "text-xs font-medium text-soltas-muted"
            metaEl.textContent = details.approximate ? `${meta} (approximate location)` : meta
            popupNode.appendChild(metaEl)
          }
          if (details.description) {
            const descriptionEl = document.createElement("p")
            descriptionEl.className = "text-sm leading-snug text-soltas-muted"
            descriptionEl.textContent = truncate(details.description)
            popupNode.appendChild(descriptionEl)
          }
          const cta = document.createElement("button")
          cta.type = "button"
          cta.className =
            "mt-2 inline-flex w-full items-center justify-center rounded-md bg-soltas-ocean px-3 py-2 text-xs font-medium text-white hover:bg-soltas-abyssal"
          cta.textContent = layer.ctaLabel
          cta.addEventListener("click", () => router.push(details.href))
          popupNode.appendChild(cta)
        })
        .catch(() => {
          loading.textContent = "Couldn’t load this activity."
        })
    }

    const pointer = () => (map.getCanvas().style.cursor = "pointer")
    const noPointer = () => (map.getCanvas().style.cursor = "")
    map.on("click", "cluster-circles", zoomIntoCluster)
    map.on("click", "cluster-points", openPoint)
    for (const id of ["cluster-circles", "cluster-points"] as const) {
      map.on("mouseenter", id, pointer)
      map.on("mouseleave", id, noPointer)
    }

    return () => {
      controller.abort()
      map.off("click", "cluster-circles", zoomIntoCluster)
      map.off("click", "cluster-points", openPoint)
      for (const id of ["cluster-circles", "cluster-points"] as const) {
        map.off("mouseenter", id, pointer)
        map.off("mouseleave", id, noPointer)
      }
      // the map may already be gone (unmount)
      if (mapRef.current === map && map.getStyle()) removeLayer()
    }
  }, [styleReady, clusterUrl, clusterColor, router])

  // IMPORTANT: when freeze is enabled, we intentionally do NOT resize continuously.
  // We'll do a single resize once freeze is turned off.
  const lastFreezeRef = useRef(false)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const wasFrozen = lastFreezeRef.current
    lastFreezeRef.current = freeze

    if (wasFrozen && !freeze) {
      const id = window.requestAnimationFrame(() => {
        map.resize()
      })
      return () => window.cancelAnimationFrame(id)
    }
  }, [freeze])

  // Forced recenter on demand (collapse/expand/drag end)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (freeze) return

    const id = window.requestAnimationFrame(() => {
      map.resize()
      userInteractedRef.current = false
      fitToMarkers(map, false)
    })

    return () => window.cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterNonce])

  // Render markers + initial fit when marker set changes.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markerObjs.current.forEach((obj) => obj.marker.remove())
    markerObjs.current = []
    hasDomMarkersRef.current = validMarkers.length > 0

    const scale = getMarkerScale(map.getZoom())

    validMarkers.forEach((m) => {
      const popup = new mapboxgl.Popup({ offset: 12, maxWidth: "320px" })

      const popupNode = document.createElement("div")
      popupNode.className = "space-y-2 text-sm text-soltas-text"

      const titleEl = document.createElement("h3")
      titleEl.className = "text-base font-semibold text-soltas-text"
      titleEl.textContent = m.title
      popupNode.appendChild(titleEl)

      if (m.placeName) {
        const placeEl = document.createElement("p")
        placeEl.className = "text-xs font-medium text-soltas-muted"
        placeEl.textContent = m.placeName
        popupNode.appendChild(placeEl)
      }

      if (m.description) {
        const descriptionEl = document.createElement("p")
        descriptionEl.className = "text-sm leading-snug text-soltas-muted"
        descriptionEl.textContent = truncate(m.description)
        popupNode.appendChild(descriptionEl)
      }

      const cta = document.createElement("button")
      cta.type = "button"
      cta.className =
        "mt-2 inline-flex w-full items-center justify-center rounded-md bg-soltas-ocean px-3 py-2 text-xs font-medium text-white hover:bg-soltas-abyssal"
      cta.textContent = ctaLabel
      cta.addEventListener("click", () => {
        const href = m.ctaHref ?? `/projects/${m.slug}`
        router.push(href)
      })
      popupNode.appendChild(cta)

      popup.setDOMContent(popupNode)

      const el = document.createElement("div")
      Object.assign(el.style, {
        width: "20px",
        height: "20px",
        borderRadius: "9999px",
        backgroundColor: m.markerColor ?? markerColor,
        border: "2px solid #ffffff",
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.35)",
        transform: `translate(-50%, -50%) scale(${scale})`,
      })

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([m.lng, m.lat])
        .setPopup(popup)
        .addTo(map)

      markerObjs.current.push({
        marker,
        element: el,
        slug: m.slug,
        lng: m.lng,
        lat: m.lat,
      })
    })

    if (!freeze) {
      userInteractedRef.current = false
      fitToMarkers(map, true)

      if (focusSlug) {
        const focused = markerObjs.current.find((o) => o.slug === focusSlug)
        if (focused) {
          map.easeTo({
            center: [focused.lng, focused.lat],
            zoom: Math.max(map.getZoom(), 4),
            duration: 450,
          })
          focused.marker.getPopup()?.addTo(map)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctaLabel, focusSlug, markerColor, router, validMarkers, freeze])

  // If token missing, render a safe fallback *after* hooks (no conditional hooks)
  if (!HAS_MAPBOX_TOKEN) {
    return (
      <div className="grid h-full w-full place-items-center rounded-md border border-soltas-line bg-soltas-off-white p-6 text-center">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-soltas-text">Map view unavailable</div>
          <div className="text-sm text-soltas-muted">
            This deployment is missing the Mapbox token (<code>NEXT_PUBLIC_MAPBOX_TOKEN</code>).
            Use the table view instead.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full bg-soltas-light">
      <div
        ref={containerRef}
        className={["h-full w-full", freeze ? "opacity-0" : "opacity-100"].join(" ")}
      />

      {freeze ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="rounded-xl bg-white/90 px-4 py-3 text-sm font-semibold text-soltas-text shadow-lg ring-1 ring-slate-200">
            Updating map…
          </div>
        </div>
      ) : null}
    </div>
  )
}
