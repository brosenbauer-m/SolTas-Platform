import type { ProjectPoint } from "@/lib/projects/findProjectsQuery";

/**
 * GeoJSON for the clustered map layer (components/map/projectLayer.ts). Projects at exactly the same spot
 * become one feature, so the map can show how many are there instead of drawing them on top of each other:
 *   n  number of projects at this spot (cluster circles add these up)
 *   id slug, when n = 1
 *   k  "lng,lat" of the spot, when n > 1 (for /api/projects/at)
 *   a  1 = only the country (or region) is known, the dot is its centre
 */
export function pointsToGeoJson(points: ProjectPoint[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const spots = new Map<string, { lng: number; lat: number; items: ProjectPoint[] }>();
  for (const point of points) {
    const lng = round(point.lng);
    const lat = round(point.lat);
    const key = `${lng},${lat}`;
    const spot = spots.get(key);
    if (spot) spot.items.push(point);
    else spots.set(key, { lng, lat, items: [point] });
  }
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [...spots.entries()].map(([key, spot]) => {
    const single = spot.items.length === 1;
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [spot.lng, spot.lat] },
      properties: single
        ? { id: spot.items[0].slug, n: 1, a: spot.items[0].approximate ? 1 : 0 }
        : { k: key, n: spot.items.length, a: spot.items.every((item) => item.approximate) ? 1 : 0 },
    };
  });
  return { type: "FeatureCollection", features };
}

/** 4 decimals ≈ 11 m: projects closer than that share one spot on the map. */
const round = (value: number) => Math.round(value * 1e4) / 1e4;
