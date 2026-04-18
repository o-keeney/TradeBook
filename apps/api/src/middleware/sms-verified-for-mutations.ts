import { createMiddleware } from "hono/factory";
import { createDb } from "../db/drizzle";
import type { Env } from "../env";
import { getVerificationMutationPolicy } from "../lib/verification-mutation-policy";
import type { UserRow } from "../lib/public-user";

const PHONE_NOT_VERIFIED = {
  error: {
    code: "phone_not_verified",
    message: "Verify your mobile number to continue.",
  },
} as const;

/**
 * When platform policy requires SMS verification, blocks mutating methods unless
 * `user.phoneVerified` is true. (SMS sending is not wired yet; admins can toggle
 * `phone_verified` on users for testing.)
 */
export const requireSmsVerifiedForMutations = createMiddleware<{
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
  if (!policy.requireSmsVerifiedForMutations) {
    await next();
    return;
  }
  if (c.get("user").phoneVerified) {
    await next();
    return;
  }
  return c.json(PHONE_NOT_VERIFIED, 403);
});
