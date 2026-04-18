import type { Context, Next } from "hono";
import { redactRequestUrlForLog } from "../lib/log-redact";
import type { Env } from "../env";

function hasSensitiveRequestHeaders(c: Context): { authorization: boolean; cookie: boolean } {
  return {
    authorization: Boolean(c.req.header("Authorization")),
    cookie: Boolean(c.req.header("Cookie")),
  };
}

/**
 * Emits one JSON line per request after the handler finishes. Omits raw IPs and header secrets;
 * records only whether auth/cookie headers were present.
 */
export async function requestLogMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next,
): Promise<void> {
  const t0 = Date.now();
  try {
    await next();
  } finally {
    const durationMs = Date.now() - t0;
    const sensitive = hasSensitiveRequestHeaders(c);
    const path = redactRequestUrlForLog(c.req.url);
    const payload: Record<string, unknown> = {
      level: "info",
      msg: "request",
      ts: new Date().toISOString(),
      method: c.req.method,
      path,
      status: c.res?.status ?? 0,
      durationMs,
      env: c.env.ENVIRONMENT,
      cfRay: c.req.header("cf-ray") ?? undefined,
      clientAuthHeader: sensitive.authorization,
      clientCookieHeader: sensitive.cookie,
    };
    console.log(JSON.stringify(payload));
  }
}
