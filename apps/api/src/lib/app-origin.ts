import type { Env } from "../env";

/** Web app origin for redirects after email verification (not the API origin). */
export function resolveAppOrigin(env: Env): string {
  const explicit = env.APP_ORIGIN?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const first = env.CORS_ORIGINS?.split(",")[0]?.trim();
  if (first) return first.replace(/\/$/, "");
  return "http://localhost:3000";
}
