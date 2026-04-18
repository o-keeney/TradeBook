import type { Context, Next } from "hono";
import type { Env } from "../env";

function clientIp(c: Context<{ Bindings: Env }>): string {
  const cf = c.req.header("CF-Connecting-IP")?.trim();
  if (cf) return cf;
  const xff = c.req.header("X-Forwarded-For");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

export type RateLimitKvOptions = {
  /** Distinct limiter bucket (appears in KV key). */
  prefix: string;
  windowMs: number;
  max: number;
  /** HTTP methods this limiter applies to. Default: POST only. */
  methods?: string[];
};

/**
 * Fixed-window rate limit per client IP using `RATE_LIMIT_KV`.
 * If KV is not bound, passes through (local dev without KV).
 */
export function rateLimitKv(options: RateLimitKvOptions) {
  const methods = options.methods ?? ["POST"];
  const methodSet = new Set(methods.map((m) => m.toUpperCase()));

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    if (!methodSet.has(c.req.method.toUpperCase())) return next();

    const kv = c.env.RATE_LIMIT_KV;
    if (!kv) return next();

    const ip = clientIp(c);
    const windowId = Math.floor(Date.now() / options.windowMs);
    const key = `rl:v1:${options.prefix}:${ip}:${windowId}`;

    const raw = await kv.get(key);
    let count = 0;
    if (raw != null && raw !== "") {
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 0) count = n;
    }

    if (count >= options.max) {
      const elapsedIntoWindow = Date.now() % options.windowMs;
      const retryAfterMs = Math.max(1, options.windowMs - elapsedIntoWindow);
      return c.json(
        {
          error: {
            code: "rate_limited",
            message: "Too many requests. Please try again later.",
            retryAfterMs,
          },
        },
        429,
      );
    }

    const ttlSec = Math.max(60, Math.ceil((options.windowMs * 2) / 1000));
    await kv.put(key, String(count + 1), { expirationTtl: ttlSec });
    return next();
  };
}
