import { createMiddleware } from "hono/factory";
import type { Env } from "../env";
import type { UserRow } from "../lib/public-user";

const EMAIL_NOT_VERIFIED = {
  error: {
    code: "email_not_verified",
    message: "Verify your email address to continue.",
  },
} as const;

/** Blocks the request unless the signed-in user has a verified email. */
export const requireEmailVerified = createMiddleware<{
  Bindings: Env;
  Variables: { user: UserRow };
}>(async (c, next) => {
  if (c.get("user").emailVerified) {
    await next();
    return;
  }
  return c.json(EMAIL_NOT_VERIFIED, 403);
});

/** Same as {@link requireEmailVerified} for mutating HTTP methods only (GET/HEAD/OPTIONS pass). */
export const requireEmailVerifiedForMutations = createMiddleware<{
  Bindings: Env;
  Variables: { user: UserRow };
}>(async (c, next) => {
  const m = c.req.method;
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") {
    await next();
    return;
  }
  if (c.get("user").emailVerified) {
    await next();
    return;
  }
  return c.json(EMAIL_NOT_VERIFIED, 403);
});
