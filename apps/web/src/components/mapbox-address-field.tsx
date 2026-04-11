"use client";

import { useEffect, useRef } from "react";
import { getMapboxToken } from "@/lib/mapbox-env";

export type MapboxAddressCoords = { lat: number; lng: number };

export type MapboxAddressFieldProps = {
  id?: string;
  value: string;
  onChange: (placeName: string, coords?: MapboxAddressCoords) => void;
  required?: boolean;
  placeholder?: string;
  /** Applied to the fallback text input when Mapbox is not configured. */
  inputClassName?: string;
};

const DEFAULT_CENTER: [number, number] = [-7.9, 53.4];

async function reverseGeocode(
  lng: number,
  lat: number,
  token: string,
): Promise<string> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${lng},${lat}`)}.json?access_token=${encodeURIComponent(token)}&limit=1`;
  const res = await fetch(url);
  const data = (await res.json()) as { features?: Array<{ place_name: string }> };
  const name = data.features?.[0]?.place_name;
  return name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function MapboxAddressField({
  id,
  value,
  onChange,
  required,
  placeholder = "Search for an address",
  inputClassName = "mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100",
}: MapboxAddressFieldProps) {
  const token = getMapboxToken();
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!token || !mapWrapRef.current) return;

    let cancelled = false;
    let map: import("mapbox-gl").Map | null = null;
    let marker: import("mapbox-gl").Marker | null = null;

    void (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      const MapboxGeocoder = (await import("@mapbox/mapbox-gl-geocoder")).default;

      if (cancelled || !mapWrapRef.current) return;

      mapboxgl.accessToken = token;

      map = new mapboxgl.Map({
        container: mapWrapRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: DEFAULT_CENTER,
        zoom: 6,
      });

      marker = new mapboxgl.Marker({ draggable: true, color: "#262626" })
        .setLngLat(DEFAULT_CENTER)
        .addTo(map);

      const applyFromLngLat = (lng: number, lat: number) => {
        void reverseGeocode(lng, lat, token).then((placeName) => {
          if (!cancelled) onChangeRef.current(placeName, { lat, lng });
        });
      };

      marker.on("dragend", () => {
        const ll = marker!.getLngLat();
        applyFromLngLat(ll.lng, ll.lat);
      });

      map.on("click", (e) => {
        marker!.setLngLat(e.lngLat);
        applyFromLngLat(e.lngLat.lng, e.lngLat.lat);
      });

      const geocoder = new MapboxGeocoder({
        accessToken: token,
        mapboxgl,
        marker: false,
        countries: "ie",
        placeholder,
      });

      map.addControl(geocoder, "top-left");

      geocoder.on("result", (ev: { result: { place_name: string; center: [number, number] } }) => {
        const [lng, lat] = ev.result.center;
        marker!.setLngLat([lng, lat]);
        map!.flyTo({ center: [lng, lat], zoom: 14 });
        onChangeRef.current(ev.result.place_name, { lat, lng });
      });
    })();

    return () => {
      cancelled = true;
      marker?.remove();
      map?.remove();
      marker = null;
      map = null;
    };
  }, [token]);

  if (!token) {
    return (
      <div className="space-y-2">
        <p className="rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          Set <code className="font-mono">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> in{" "}
          <code className="font-mono">apps/web/.env.local</code> for map search and pin. Until then,
          use the text field below.
        </p>
        <input
          id={id}
          type="text"
          autoComplete="street-address"
          required={required}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={mapWrapRef}
        className="relative h-56 w-full overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-600"
        aria-label="Map: search for an address or click and drag the pin"
      />
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Search for an address (Ireland), or click the map / drag the pin to set the location.
      </p>
      {value ? (
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          Selected:{" "}
          <span className="font-medium text-neutral-900 dark:text-neutral-100">{value}</span>
        </p>
      ) : null}
    </div>
  );
}
