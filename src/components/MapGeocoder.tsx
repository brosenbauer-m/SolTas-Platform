"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";

type LocationResult = { lat: number; lng: number; place_name: string };

type MapGeocoderProps = {
  onSelect: (value: LocationResult) => void;
};

export default function MapGeocoder({ onSelect }: MapGeocoderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const geocoderRef = useRef<InstanceType<typeof MapboxGeocoder> | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const initializedRef = useRef(false);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || initializedRef.current) {
      return;
    }

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const tokenLooksValid = typeof token === "string" && /^pk\./.test(token);

    if (!tokenLooksValid) {
      console.warn(
        "Mapbox token missing or invalid. Add a public token to NEXT_PUBLIC_MAPBOX_TOKEN in your .env file."
      );
      container.innerHTML =
        '<p class="text-sm text-rose-600">Map search unavailable: add a valid Mapbox public token.</p>';
      return;
    }

    mapboxgl.accessToken = token;
    ;(mapboxgl as typeof mapboxgl & { setTelemetryEnabled?: (enabled: boolean) => void }).setTelemetryEnabled?.(false);

    let map: mapboxgl.Map | null = null;
    let geocoder: InstanceType<typeof MapboxGeocoder> | null = null;

    const handleResult = (event: {
      result: { center: [number, number]; place_name: string };
    }) => {
      const [lng, lat] = event.result.center;
      onSelectRef.current({ lat, lng, place_name: event.result.place_name });
    };

    const handleError = (error: unknown) => {
      console.error("Mapbox geocoder error", error);
      if (containerRef.current) {
        containerRef.current.innerHTML =
          '<p class="text-sm text-rose-600">Map search unavailable: check your Mapbox token.</p>';
      }
    };

    try {
      map = new mapboxgl.Map({
        container: document.createElement("div"),
        style: "mapbox://styles/mapbox/streets-v12",
      });

      geocoder = new MapboxGeocoder({
        accessToken: token,
        mapboxgl,
        marker: false,
        placeholder: "Search for a place or address",
      });

      container.innerHTML = "";
      geocoder.addTo(container);

      geocoder.on("result", handleResult);
      geocoder.on("error", handleError);

      geocoderRef.current = geocoder;
      mapRef.current = map;
      initializedRef.current = true;

      return () => {
        // clear()/remove() can throw if the geocoder never finished mounting; never let cleanup crash the page.
        try {
          geocoder?.off("result", handleResult);
          geocoder?.off("error", handleError);
          geocoder?.clear();
        } catch {}
        try {
          map?.remove();
        } catch {}
        container.innerHTML = "";
        geocoderRef.current = null;
        mapRef.current = null;
        initializedRef.current = false;
      };
    } catch (error) {
      console.error("Failed to initialise Mapbox geocoder", error);
      container.innerHTML =
        '<p class="text-sm text-rose-600">Map search unavailable: failed to initialise Mapbox geocoder.</p>';
      try {
        geocoder?.clear();
      } catch {}
      try {
        map?.remove();
      } catch {}
      geocoderRef.current = null;
      mapRef.current = null;
      initializedRef.current = false;
      return () => {};
    }
  }, []);

  return <div ref={containerRef} className="w-full min-h-[56px]" />;
}
