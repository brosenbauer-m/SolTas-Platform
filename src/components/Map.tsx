"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

import { glassMarker } from "@/components/map/glassMarker"
import { addProjectLayer } from "@/components/map/projectLayer"

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

/** The clustered project layer (see components/map/projectLayer.ts). */
export type MapProjectLayer = {
  /** /api/projects/points with the page's filters */
  url: string
  color: string
  ctaLabel: string
  summaryUrl: (id: string) => string
}

type MapProps = {
  markers?: MapMarker[]
  /** All projects as one clustered layer (Find Projects). */
  projects?: MapProjectLayer | null
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

export default function Map({
  markers = [],
  projects = null,
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
  const projectsRef = useRef<MapProjectLayer | null>(projects)
  useEffect(() => {
    projectsRef.current = projects
  }, [projects])
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

  // Clustered project layer: added once the style has loaded; rebuilt when the URL (filters) changes.
  const projectsUrl = projects?.url ?? null
  const projectsColor = projects?.color ?? null
  useEffect(() => {
    const map = mapRef.current
    const layer = projectsRef.current
    if (!map || !styleReady || !projectsUrl || !projectsColor || !layer) return

    const handle = addProjectLayer(map, {
      url: projectsUrl,
      color: projectsColor,
      ctaLabel: layer.ctaLabel,
      summaryUrl: (id) => projectsRef.current?.summaryUrl(id) ?? layer.summaryUrl(id),
      onNavigate: (href) => router.push(href),
      // Frame the projects when they are all the map shows
      onLoaded: (data) => {
        if (hasDomMarkersRef.current || !data.features.length) return
        const bounds = new mapboxgl.LngLatBounds()
        data.features.forEach((f) => bounds.extend(f.geometry.coordinates as [number, number]))
        map.fitBounds(bounds, { padding: 48, maxZoom: 6, duration: 350 })
      },
    })
    return () => handle.remove()
  }, [styleReady, projectsUrl, projectsColor, router])

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

    validMarkers.forEach((m) => {
      const popup = new mapboxgl.Popup({ offset: 18, maxWidth: "380px", className: "soltas-popup", focusAfterOpen: false })

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
      cta.className = "soltas-popup-cta"
      cta.textContent = ctaLabel
      cta.addEventListener("click", () => {
        const href = m.ctaHref ?? `/projects/${m.slug}`
        router.push(href)
      })
      popupNode.appendChild(cta)

      popup.setDOMContent(popupNode)

      const el = glassMarker(m.markerColor ?? markerColor, m.title)

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
