import type { MetadataRoute } from "next";

const defaultOrigin = "http://localhost:3000";

function siteOriginString(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || defaultOrigin;
  try {
    const u = new URL(raw.endsWith("/") ? raw.slice(0, -1) : raw);
    return u.toString();
  } catch {
    return defaultOrigin;
  }
}

export default function robots(): MetadataRoute.Robots {
  const base = siteOriginString();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
