/**
 * Absolute API origin for **server-side** fetches (RSC, `getPublicApiUrl` in Node).
 * Client components should use `apiUrl()` / `apiFetch()` so requests stay same-origin and hit the rewrite.
 */
export function getPublicApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
}
