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

/** Allow `next/image` to optimize portfolio files served from the API origin (JSON uses absolute image URLs). */
function portfolioImageRemotePatterns(): {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname: string;
}[] {
  const patterns: {
    protocol: "http" | "https";
    hostname: string;
    port?: string;
    pathname: string;
  }[] = [
    { protocol: "http", hostname: "localhost", port: "8787", pathname: "/api/portfolio/images/**" },
    { protocol: "http", hostname: "127.0.0.1", port: "8787", pathname: "/api/portfolio/images/**" },
  ];
  try {
    const u = new URL(apiOrigin);
    const port = u.port || undefined;
    const exists = patterns.some((p) => p.hostname === u.hostname && (p.port ?? "") === (port ?? ""));
    if (u.hostname && !exists) {
      patterns.push({
        protocol: u.protocol === "https:" ? "https" : "http",
        hostname: u.hostname,
        ...(port ? { port } : {}),
        pathname: "/api/portfolio/images/**",
      });
    }
  } catch {
    /* ignore invalid NEXT_PUBLIC_API_URL at config parse time */
  }
  return patterns;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "mapbox-gl",
    "@mapbox/mapbox-gl-geocoder",
    "@tradebook/construction-professions",
  ],
  images: {
    remotePatterns: portfolioImageRemotePatterns(),
  },
  /** Browser calls same-origin `/api/*` so session cookies attach to the web app host (see `apiUrl`). */
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
