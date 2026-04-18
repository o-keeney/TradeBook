export const CSRF_COOKIE_NAME = "tradebook_csrf";
export const CSRF_HEADER_NAME = "X-CSRF-Token";

/** Read the CSRF token from `document.cookie` (cookie is not HttpOnly). */
export function readCsrfTokenFromDocumentCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const parts = document.cookie.split("; ");
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const name = p.slice(0, eq).trim();
    if (name === CSRF_COOKIE_NAME) {
      const value = decodeURIComponent(p.slice(eq + 1).trim());
      return value || undefined;
    }
  }
  return undefined;
}
