import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db/drizzle";
import { users } from "../db/schema";
import type { Env } from "../env";
import { canResendVerification, issueEmailVerificationAndSend } from "../lib/email-verification";
import { toPublicUser, type UserRow } from "../lib/public-user";
import { requireUser } from "../middleware/session";

const patchMeSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
  })
  .strict();

export const userRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: UserRow };
}>()
  .use(requireUser)
  .get("/me", (c) => c.json({ user: toPublicUser(c.get("user")) }))
  .patch("/me", async (c) => {
    let body: z.infer<typeof patchMeSchema>;
    try {
      body = patchMeSchema.parse(await c.req.json());
    } catch (e) {
      if (e instanceof z.ZodError) {
        return c.json(
          {
            error: {
              code: "validation_error",
              message: "Invalid request",
              details: e.flatten(),
            },
          },
          400,
        );
      }
      throw e;
    }

    const me = c.get("user");
    const db = createDb(c.env.DB);
    await db
      .update(users)
      .set({ firstName: body.firstName, lastName: body.lastName })
      .where(eq(users.id, me.id));

    const [fresh] = await db.select().from(users).where(eq(users.id, me.id));
    return c.json({ user: fresh ? toPublicUser(fresh) : null });
  })
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
