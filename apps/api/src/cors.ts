import type { Env } from "./env";

const defaultOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

export function getAllowedOrigins(env: Env): string[] {
  const extra = env.CORS_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!extra?.length) return defaultOrigins;
  return [...new Set([...defaultOrigins, ...extra])];
}
