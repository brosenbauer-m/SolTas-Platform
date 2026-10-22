import mapboxgl from "mapbox-gl";

import { openRemotePopup, openSpotPopup } from "@/components/map/remotePopup";

/**
 * All projects (community and imported) as one clustered layer of frosted-glass circles: nearby projects merge
 * into a larger numbered circle when zoomed out and split as you zoom in. Numbers always add up: projects at
 * exactly the same spot (a city, a country centre) stay one circle with their count, and clicking it lists them.
 * Dashed ring = only the country is known. Used by the Find Projects map and the home globe.
 *
 * The circles are HTML markers (CSS backdrop blur is not possible in WebGL), built from the features an
 * invisible circle layer renders in view.
 */
export type ProjectLayerOptions = {
  /** GeoJSON from /api/projects/points (properties: n = projects at the spot, id = slug if one, k = spot key) */
  url: string;
  color: string;
  ctaLabel: string;
  summaryUrl: (id: string) => string;
  /** client-side navigation for the popup links; plain links without it */
  onNavigate?: (href: string) => void;
  /** called on any click/hover interaction (e.g. to pause the home globe's rotation) */
  onInteract?: () => void;
  /** called with the loaded features (e.g. to frame them) */
  onLoaded?: (data: GeoJSON.FeatureCollection<GeoJSON.Point>) => void;
};

export type ProjectLayerHandle = {
  setVisible: (visible: boolean) => void;
  remove: () => void;
};

const SOURCE = "projects";
const ANCHOR_LAYER = "projects-anchor";

type Shown = { marker: mapboxgl.Marker; element: HTMLElement };

/** /api/projects/at for one spot, with the same filters as the points URL. */
function spotUrl(pointsUrl: string, key: string) {
  const url = new URL(pointsUrl, window.location.origin);
  url.pathname = "/api/projects/at";
  url.searchParams.set("k", key);
  return `${url.pathname}${url.search}`;
}

/**
 * On the globe, markers on its far side would still show through: keep only points within ~75° of the
 * view centre (the visible cap at the home globe's zoom). Flat maps keep everything.
 */
function globeFacing(map: mapboxgl.Map): (lngLat: [number, number]) => boolean {
  if (map.getProjection()?.name !== "globe" || map.getZoom() > 5) return () => true;
  const rad = Math.PI / 180;
  const center = map.getCenter();
  const lat0 = center.lat * rad;
  const lng0 = center.lng * rad;
  const limit = Math.cos(75 * rad);
  return ([lng, lat]) => {
    const phi = lat * rad;
    return Math.sin(lat0) * Math.sin(phi) + Math.cos(lat0) * Math.cos(phi) * Math.cos(lng * rad - lng0) > limit;
  };
}

const formatCount = (n: number) =>
  n >= 10_000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);

/** Circle size grows with the count, gently (log scale). */
const sizeFor = (n: number) => Math.round(Math.min(68, 30 + Math.log10(Math.max(n, 1)) * 10));

export function addProjectLayer(map: mapboxgl.Map, options: ProjectLayerOptions): ProjectLayerHandle {
  const controller = new AbortController();
  let visible = true;
  let shown = new Map<string, Shown>();

  map.addSource(SOURCE, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
    cluster: true,
    clusterRadius: 52,
    // Keep merging until street level; identical spots are already one feature, so clusters always split.
    clusterMaxZoom: 15,
    clusterProperties: { total: ["+", ["get", "n"]] },
  });
  map.addLayer({
    id: ANCHOR_LAYER,
    type: "circle",
    source: SOURCE,
    paint: { "circle-radius": 1, "circle-opacity": 0, "circle-stroke-width": 0 },
  });

  const element = (kind: "cluster" | "spot" | "point", count: number, approximate: boolean, label: string) => {
    const root = document.createElement("div");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `soltas-map-glass soltas-map-glass--${kind}${approximate ? " soltas-map-glass--approx" : ""}`;
    button.setAttribute("aria-label", label);
    button.title = label;
    if (kind === "point") {
      button.style.setProperty("--glass-size", "22px");
      const core = document.createElement("span");
      core.className = "soltas-map-glass__core";
      core.style.background = approximate ? "transparent" : options.color;
      core.style.borderColor = options.color;
      button.appendChild(core);
    } else {
      button.style.setProperty("--glass-size", `${sizeFor(count)}px`);
      button.textContent = formatCount(count);
    }
    root.appendChild(button);
    return { root, button };
  };

  const show = (key: string, lngLat: [number, number], build: () => HTMLElement, next: Map<string, Shown>) => {
    const existing = shown.get(key);
    if (existing) {
      next.set(key, existing);
      return;
    }
    const node = build();
    const marker = new mapboxgl.Marker({ element: node }).setLngLat(lngLat).addTo(map);
    next.set(key, { marker, element: node });
  };

  const update = () => {
    if (!visible || !map.getSource(SOURCE)) return;
    const next = new Map<string, Shown>();
    const facing = globeFacing(map);
    // Only what is rendered now: the source's loaded tiles can still hold another zoom level's clusters,
    // which would count the same projects twice.
    const layers = map.getLayer(ANCHOR_LAYER) ? [ANCHOR_LAYER] : [];
    for (const feature of layers.length ? map.queryRenderedFeatures({ layers }) : []) {
      if (feature.geometry.type !== "Point") continue;
      const lngLat = feature.geometry.coordinates as [number, number];
      if (!facing(lngLat)) continue;
      const p = feature.properties ?? {};
      if (p.cluster) {
        const clusterId = Number(p.cluster_id);
        const total = Number(p.total) || Number(p.point_count) || 0;
        show(`c${clusterId}`, lngLat, () => {
          const { root, button } = element("cluster", total, false, `${total} projects here. Zoom in`);
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            options.onInteract?.();
            (map.getSource(SOURCE) as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (error, zoom) => {
              if (error || zoom == null) return;
              map.easeTo({ center: lngLat, zoom: zoom + 0.25, duration: 500 });
            });
          });
          return root;
        }, next);
      } else if (Number(p.n) > 1 && typeof p.k === "string") {
        const count = Number(p.n);
        const spotKey = p.k;
        const approximate = p.a === 1;
        show(`s${spotKey}`, lngLat, () => {
          const { root, button } = element("spot", count, approximate, `${count} projects at this place. Show the list`);
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            options.onInteract?.();
            openSpotPopup(map, lngLat, {
              count,
              approximate,
              detailsUrl: spotUrl(options.url, spotKey),
              onNavigate: options.onNavigate,
            });
          });
          return root;
        }, next);
      } else if (typeof p.id === "string") {
        const id = p.id;
        show(`p${id}`, lngLat, () => {
          const { root, button } = element("point", 1, p.a === 1, "Project. Show details");
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            options.onInteract?.();
            openRemotePopup(map, lngLat, {
              ctaLabel: options.ctaLabel,
              detailsUrl: options.summaryUrl(id),
              onNavigate: options.onNavigate,
            });
          });
          return root;
        }, next);
      }
    }
    for (const [key, item] of shown) if (!next.has(key)) item.marker.remove();
    shown = next;
  };

  // Rebuild while the map moves (clusters change per zoom level), at most every 80 ms, and once it settles.
  let lastUpdate = 0;
  let pending: number | null = null;
  const schedule = () => {
    if (pending != null) return;
    const wait = Math.max(0, 80 - (Date.now() - lastUpdate));
    pending = window.setTimeout(() => {
      pending = null;
      lastUpdate = Date.now();
      update();
    }, wait);
  };
  const onSourceData = (event: mapboxgl.MapSourceDataEvent) => {
    if (event.sourceId === SOURCE && event.isSourceLoaded) schedule();
  };
  // Turning alone (the home globe's slow spin changes only the bearing) shows the same circles: skip it.
  let lastView = "";
  const onMove = () => {
    const center = map.getCenter();
    const view = `${map.getZoom().toFixed(2)}|${center.lng.toFixed(3)}|${center.lat.toFixed(3)}|${map.getPitch().toFixed(0)}`;
    if (view === lastView) return;
    lastView = view;
    schedule();
  };
  map.on("move", onMove);
  map.on("moveend", schedule);
  map.on("sourcedata", onSourceData);

  fetch(options.url, { signal: controller.signal })
    .then((res) => (res.ok ? (res.json() as Promise<GeoJSON.FeatureCollection<GeoJSON.Point>>) : Promise.reject(res.status)))
    .then((data) => {
      (map.getSource(SOURCE) as mapboxgl.GeoJSONSource | undefined)?.setData(data);
      options.onLoaded?.(data);
    })
    .catch(() => {
      // aborted or failed: the map stays usable without the layer
    });

  const clear = () => {
    for (const item of shown.values()) item.marker.remove();
    shown = new Map();
  };

  return {
    setVisible(next) {
      visible = next;
      if (map.getLayer(ANCHOR_LAYER)) map.setLayoutProperty(ANCHOR_LAYER, "visibility", next ? "visible" : "none");
      if (next) schedule();
      else clear();
    },
    remove() {
      controller.abort();
      if (pending != null) window.clearTimeout(pending);
      map.off("move", onMove);
      map.off("moveend", schedule);
      map.off("sourcedata", onSourceData);
      clear();
      if (!map.getStyle()) return; // map already removed
      if (map.getLayer(ANCHOR_LAYER)) map.removeLayer(ANCHOR_LAYER);
      if (map.getSource(SOURCE)) map.removeSource(SOURCE);
    },
  };
}
