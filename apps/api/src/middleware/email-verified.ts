import { createMiddleware } from "hono/factory";
import { createDb } from "../db/drizzle";
import type { Env } from "../env";
import { getVerificationMutationPolicy } from "../lib/verification-mutation-policy";
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

/**
 * For mutating HTTP methods only (GET/HEAD/OPTIONS pass). Honors
 * `platform_settings.require_email_verified_for_mutations` so admins can relax the gate for testing.
 */
export const requireEmailVerifiedForMutations = createMiddleware<{
  Bindings: Env;
  Variables: { user: UserRow };
}>(async (c, next) => {
  const m = c.req.method;
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") {
    await next();
    return;
  }
  const db = createDb(c.env.DB);
  const policy = await getVerificationMutationPolicy(db);
  if (!policy.requireEmailVerifiedForMutations) {
    await next();
    return;
  }
  if (c.get("user").emailVerified) {
    await next();
    return;
  }
  return c.json(EMAIL_NOT_VERIFIED, 403);
});
