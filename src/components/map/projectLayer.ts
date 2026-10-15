import mapboxgl from "mapbox-gl";

import { openRemotePopup } from "@/components/map/remotePopup";

/**
 * All projects (community and imported) as one clustered WebGL layer: nearby projects merge into a larger
 * numbered circle when zoomed out and split into single dots as you zoom in. Dots grow a little on hover.
 * Hollow dots = only the country is known. Used by the Find Projects map and the home globe.
 */
export type ProjectLayerOptions = {
  /** GeoJSON from /api/projects/points (properties: id = slug, a = 1 approximate) */
  url: string;
  color: string;
  ctaLabel: string;
  summaryUrl: (id: string) => string;
  /** client-side navigation for the popup button; plain link without it */
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
const CLUSTERS = "projects-clusters";
const COUNTS = "projects-cluster-counts";
const POINTS = "projects-points";
const CLUSTER_HOVER = "projects-cluster-hover";
const POINT_HOVER = "projects-point-hover";
// hover layers sit under the cluster numbers so the count stays readable
const LAYERS = [CLUSTERS, CLUSTER_HOVER, COUNTS, POINTS, POINT_HOVER] as const;

const APPROXIMATE = ["==", ["get", "a"], 1] as const;
const CLUSTER_RADIUS = ["step", ["get", "point_count"], 15, 10, 18, 100, 22, 1000, 27, 10000, 32] as const;
const NO_CLUSTER = ["==", ["get", "cluster_id"], -1] as const;
const NO_POINT = ["==", ["get", "id"], ""] as const;

export function addProjectLayer(map: mapboxgl.Map, options: ProjectLayerOptions): ProjectLayerHandle {
  const controller = new AbortController();

  map.addSource(SOURCE, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
    cluster: true,
    clusterRadius: 48,
    clusterMaxZoom: 8,
  });

  map.addLayer({
    id: CLUSTERS,
    type: "circle",
    source: SOURCE,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": options.color,
      "circle-opacity": 0.92,
      "circle-radius": CLUSTER_RADIUS as unknown as mapboxgl.Expression,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2.5,
      "circle-stroke-opacity": 0.95,
    },
  });
  // The hovered cluster, drawn 4 px larger with a soft halo
  map.addLayer({
    id: CLUSTER_HOVER,
    type: "circle",
    source: SOURCE,
    filter: ["all", ["has", "point_count"], NO_CLUSTER] as unknown as mapboxgl.Expression,
    paint: {
      "circle-color": options.color,
      "circle-radius": ["+", CLUSTER_RADIUS, 4] as unknown as mapboxgl.Expression,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3,
    },
  });
  map.addLayer({
    id: COUNTS,
    type: "symbol",
    source: SOURCE,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 12,
      "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: { "text-color": "#ffffff" },
  });
  map.addLayer({
    id: POINTS,
    type: "circle",
    source: SOURCE,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": ["case", APPROXIMATE, "#ffffff", options.color],
      "circle-radius": 7,
      "circle-stroke-color": ["case", APPROXIMATE, options.color, "#ffffff"],
      "circle-stroke-width": 2.5,
    },
  });
  // The hovered project, drawn larger
  map.addLayer({
    id: POINT_HOVER,
    type: "circle",
    source: SOURCE,
    filter: ["all", ["!", ["has", "point_count"]], NO_POINT] as unknown as mapboxgl.Expression,
    paint: {
      "circle-color": ["case", APPROXIMATE, "#ffffff", options.color],
      "circle-radius": 10.5,
      "circle-stroke-color": ["case", APPROXIMATE, options.color, "#ffffff"],
      "circle-stroke-width": 3,
    },
  });

  fetch(options.url, { signal: controller.signal })
    .then((res) => (res.ok ? (res.json() as Promise<GeoJSON.FeatureCollection<GeoJSON.Point>>) : Promise.reject(res.status)))
    .then((data) => {
      (map.getSource(SOURCE) as mapboxgl.GeoJSONSource | undefined)?.setData(data);
      options.onLoaded?.(data);
    })
    .catch(() => {
      // aborted or failed: the map stays usable without the layer
    });

  // Hover: draw the dot / cluster under the pointer larger (via the two hover layers' filters)
  let hoveredKey = "";
  const setHover = (clusterId: number | null, pointId: string | null) => {
    const key = `${clusterId ?? ""}|${pointId ?? ""}`;
    if (key === hoveredKey) return;
    hoveredKey = key;
    if (map.getLayer(CLUSTER_HOVER)) {
      map.setFilter(CLUSTER_HOVER, ["all", ["has", "point_count"], ["==", ["get", "cluster_id"], clusterId ?? -1]]);
    }
    if (map.getLayer(POINT_HOVER)) {
      map.setFilter(POINT_HOVER, ["all", ["!", ["has", "point_count"]], ["==", ["get", "id"], pointId ?? ""]]);
    }
  };
  // One map-wide handler (not per layer): per-layer enter/leave events fire in an order that can undo
  // the hover when moving straight from a dot onto a cluster.
  const onMove = (event: mapboxgl.MapMouseEvent) => {
    const layers = [CLUSTERS, POINTS].filter((id) => map.getLayer(id));
    const feature = layers.length ? map.queryRenderedFeatures(event.point, { layers })[0] : undefined;
    const properties = feature?.properties;
    const clusterId = typeof properties?.cluster_id === "number" ? properties.cluster_id : null;
    const pointId = clusterId == null && typeof properties?.id === "string" ? properties.id : null;
    setHover(clusterId, pointId);
    map.getCanvas().style.cursor = clusterId != null || pointId ? "pointer" : "";
  };
  const onLeave = () => {
    setHover(null, null);
    map.getCanvas().style.cursor = "";
  };

  const onClusterClick = (event: mapboxgl.MapLayerMouseEvent) => {
    options.onInteract?.();
    const feature = event.features?.[0];
    const clusterId = feature?.properties?.cluster_id;
    const source = map.getSource(SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (clusterId == null || !source || feature?.geometry.type !== "Point") return;
    const center = feature.geometry.coordinates as [number, number];
    source.getClusterExpansionZoom(clusterId, (error, zoom) => {
      if (error || zoom == null) return;
      map.easeTo({ center, zoom: zoom + 0.25, duration: 500 });
    });
  };
  const onPointClick = (event: mapboxgl.MapLayerMouseEvent) => {
    options.onInteract?.();
    const feature = event.features?.[0];
    const id = feature?.properties?.id;
    if (typeof id !== "string" || feature?.geometry.type !== "Point") return;
    openRemotePopup(map, feature.geometry.coordinates as [number, number], {
      ctaLabel: options.ctaLabel,
      detailsUrl: options.summaryUrl(id),
      onNavigate: options.onNavigate,
    });
  };

  map.on("mousemove", onMove);
  map.getCanvas().addEventListener("mouseleave", onLeave);
  map.on("click", CLUSTERS, onClusterClick);
  map.on("click", POINTS, onPointClick);

  return {
    setVisible(visible) {
      for (const layer of LAYERS) {
        if (map.getLayer(layer)) map.setLayoutProperty(layer, "visibility", visible ? "visible" : "none");
      }
    },
    remove() {
      controller.abort();
      map.off("mousemove", onMove);
      map.getCanvas()?.removeEventListener("mouseleave", onLeave);
      map.off("click", CLUSTERS, onClusterClick);
      map.off("click", POINTS, onPointClick);
      if (!map.getStyle()) return; // map already removed
      for (const layer of LAYERS) if (map.getLayer(layer)) map.removeLayer(layer);
      if (map.getSource(SOURCE)) map.removeSource(SOURCE);
    },
  };
}
