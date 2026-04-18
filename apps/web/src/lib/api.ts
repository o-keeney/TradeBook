import { CSRF_HEADER_NAME, readCsrfTokenFromDocumentCookie } from "./csrf-client";
import { getPublicApiUrl } from "./public-env";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * URL for `fetch` from the browser vs server.
 * In the browser we use same-origin paths (`/api/...`) so Next.js rewrites proxy to the worker and
 * `Set-Cookie` from login applies to the page origin (fixes session when the API runs on another port).
 */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return p;
  }
  const base = getPublicApiUrl().replace(/\/$/, "");
  return `${base}${p}`;
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  const method = (init?.method ?? "GET").toUpperCase();
  if (typeof window !== "undefined" && MUTATING_METHODS.has(method)) {
    const csrf = readCsrfTokenFromDocumentCookie();
    if (csrf) headers.set(CSRF_HEADER_NAME, csrf);
  }
  return fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
}
