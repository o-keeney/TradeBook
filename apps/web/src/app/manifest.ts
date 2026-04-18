import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tradebook",
    short_name: "Tradebook",
    description: "Trades discovery and job coordination (Ireland)",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#6366F1",
    lang: "en-IE",
  };
}
