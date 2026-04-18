import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Only for `next dev`: avoids starting Wrangler's platform proxy during `next build` (can fail on some Windows setups).
const isNextDev =
  process.env.npm_lifecycle_event === "dev" ||
  (process.argv[1]?.includes("next") && process.argv.includes("dev"));

if (isNextDev) {
  void initOpenNextCloudflareForDev();
}

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "mapbox-gl",
    "@mapbox/mapbox-gl-geocoder",
    "@tradebook/construction-professions",
  ],
  /** Browser calls same-origin `/api/*` so session cookies attach to the web app host (see `apiUrl`). */
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
