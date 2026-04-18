import type { MetadataRoute } from "next";

const defaultOrigin = "http://localhost:3000";

function siteOrigin(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || defaultOrigin;
  try {
    return new URL(raw.endsWith("/") ? raw.slice(0, -1) : raw);
  } catch {
    return new URL(defaultOrigin);
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteOrigin().toString();
  const now = new Date();
  const routes = [
    "",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/register",
    "/register/customer",
    "/register/tradesman",
    "/find-tradesmen",
    "/contact",
    "/terms",
    "/privacy",
    "/dashboard",
    "/profile",
    "/portfolio",
    "/work-orders",
    "/messages",
    "/verify-email",
  ] as const;

  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority:
      path === ""
        ? 1
        : path === "/find-tradesmen" || path === "/contact"
          ? 0.8
          : path === "/terms" || path === "/privacy"
            ? 0.6
            : 0.5,
  }));
}
