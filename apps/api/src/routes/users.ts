import { Hono } from "hono";
import { createDb } from "../db/drizzle";
import type { Env } from "../env";
import { canResendVerification, issueEmailVerificationAndSend } from "../lib/email-verification";
import { toPublicUser, type UserRow } from "../lib/public-user";
import { requireUser } from "../middleware/session";

export const userRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: UserRow };
}>()
  .use(requireUser)
  .get("/me", (c) => c.json({ user: toPublicUser(c.get("user")) }))
  .post("/me/request-email-verification", async (c) => {
    const u = c.get("user");
    if (u.emailVerified) {
      return c.json({ ok: true, alreadyVerified: true });
    }

    const gate = canResendVerification(u.emailVerificationLastSentAt ?? undefined);
    if (!gate.ok) {
      return c.json(
        {
          error: {
            code: "rate_limited",
            message: "Please wait before requesting another verification email.",
            retryAfterMs: gate.retryAfterMs,
          },
        },
        429,
      );
    }

    const db = createDb(c.env.DB);
    const { emailSent } = await issueEmailVerificationAndSend(c.env, db, {
      userId: u.id,
      email: u.email,
      apiRequestUrl: c.req.url,
    });

    return c.json({ ok: true, emailSent });
  });
