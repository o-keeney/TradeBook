import type { Context, Next } from "hono";
import type { Env } from "../env";
import { ensureCsrfCookie, readCsrfTokenFromCookie } from "../lib/csrf-cookie";
import { readSessionId } from "../lib/session-cookie";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function timingSafeEqualHex(a: string, b: string): boolean {
  const aa = a.toLowerCase();
  const bb = b.toLowerCase();
  if (aa.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < aa.length; i++) {
    out |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  }
  return out === 0;
}

function pathname(c: Context): string {
  try {
    return new URL(c.req.url).pathname;
  } catch {
    return c.req.path;
  }
}

/**
 * When a session cookie is present on a safe read, ensure a CSRF cookie exists so the next mutation
 * from the browser can send `X-CSRF-Token` (double-submit).
 */
export async function sessionCsrfBootstrapMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next,
): Promise<void> {
  if (c.req.method.toUpperCase() !== "GET") {
    await next();
    return;
  }
  if (!readSessionId(c)) {
    await next();
    return;
  }
  ensureCsrfCookie(c);
  await next();
}

/** Anonymous or pre-session routes that must not require CSRF. */
function isCsrfExemptPath(path: string): boolean {
  const p = path.replace(/\/+$/, "") || "/";
  return (
    p === "/api/auth/login" ||
    p === "/api/auth/register" ||
    p === "/api/auth/forgot-password" ||
    p === "/api/auth/reset-password" ||
    p === "/api/public/contact"
  );
}

/**
 * For mutating requests that include a session cookie, require `X-CSRF-Token` to match the readable CSRF cookie
 * (double-submit). Unauthenticated mutations skip (routes return 401 as appropriate).
 */
export async function csrfProtectionMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next,
): Promise<Response | void> {
  if (!UNSAFE_METHODS.has(c.req.method.toUpperCase())) {
    await next();
    return;
  }

  const path = pathname(c);
  if (isCsrfExemptPath(path)) {
    await next();
    return;
  }

  const sessionId = readSessionId(c);
  if (!sessionId) {
    await next();
    return;
  }

  const cookieToken = readCsrfTokenFromCookie(c);
  const headerToken = c.req.header("X-CSRF-Token")?.trim().toLowerCase();
  if (
    !cookieToken ||
    !headerToken ||
    !/^[0-9a-f]{64}$/i.test(headerToken) ||
    !timingSafeEqualHex(cookieToken, headerToken)
  ) {
    return c.json(
      {
        error: {
          code: "csrf_failed",
          message: "Invalid or missing CSRF token. Refresh the page and try again.",
        },
      },
      403,
    );
  }

  await next();
}
