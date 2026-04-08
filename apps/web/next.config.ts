import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Only for `next dev` — avoids starting Wrangler's platform proxy during `next build` (can fail on some Windows setups).
const isNextDev =
  process.env.npm_lifecycle_event === "dev" ||
  (process.argv[1]?.includes("next") && process.argv.includes("dev"));

if (isNextDev) {
  void initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
