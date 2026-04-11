/** Public token for Mapbox GL / Geocoder in the browser only. */
export function getMapboxToken(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ?? "";
}
