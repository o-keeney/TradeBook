declare module "@mapbox/mapbox-gl-geocoder" {
  import type mapboxgl from "mapbox-gl";

  type GeocoderOptions = {
    accessToken: string;
    mapboxgl: typeof mapboxgl;
    marker?: boolean;
    countries?: string;
    placeholder?: string;
  };

  type GeocoderResultEvent = {
    result: {
      place_name: string;
      center: [number, number];
    };
  };

  export default class MapboxGeocoder implements mapboxgl.IControl {
    constructor(options: GeocoderOptions);
    on(type: "result", fn: (ev: GeocoderResultEvent) => void): this;
    onAdd(map: mapboxgl.Map): HTMLElement;
    onRemove(map: mapboxgl.Map): void;
    addTo(map: mapboxgl.Map): this;
  }
}
