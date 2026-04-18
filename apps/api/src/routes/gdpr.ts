import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db/drizzle";
import type { Env } from "../env";
import { clearCsrfCookie } from "../lib/csrf-cookie";
import {
  buildGdprExportJson,
  collectJobWorkMediaR2Keys,
  collectPortfolioR2Keys,
  collectTradesmanProfilePhotoR2Keys,
  deleteUserById,
} from "../lib/gdpr-data";
import type { UserRow } from "../lib/public-user";
import { clearSessionCookie } from "../lib/session-cookie";
import { requireEmailVerified } from "../middleware/email-verified";
import { requireUser } from "../middleware/session";

const eraseBodySchema = z.object({
  confirmEmail: z.string().email(),
});

async function handleErase(
  c: Context<{ Bindings: Env; Variables: { user: UserRow } }>,
): Promise<Response> {
  let body: z.infer<typeof eraseBodySchema>;
  try {
    body = eraseBodySchema.parse(await c.req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return c.json(
        { error: { code: "validation_error", message: "Invalid request", details: e.flatten() } },
        400,
      );
    }
    throw e;
  }

  const u = c.get("user");
  if (body.confirmEmail.trim().toLowerCase() !== u.email.toLowerCase()) {
    return c.json(
      {
        error: {
          code: "confirmation_mismatch",
          message: "Typed email must exactly match your account email.",
        },
      },
      400,
    );
  }

  const db = createDb(c.env.DB);
  const keys = [
    ...new Set([
      ...(await collectPortfolioR2Keys(db, u.id)),
      ...(await collectJobWorkMediaR2Keys(db, u.id)),
      ...(await collectTradesmanProfilePhotoR2Keys(db, u.id)),
    ]),
  ];
  const bucket = c.env.MEDIA_BUCKET;
  if (bucket) {
    for (const key of keys) {
      try {
        await bucket.delete(key);
      } catch {
        console.error(
          JSON.stringify({
            level: "error",
            msg: "gdpr_r2_delete_failed",
            key,
            userId: u.id,
          }),
        );
      }
    }
  }

  await deleteUserById(db, u.id);
  clearSessionCookie(c);
  clearCsrfCookie(c);
  return c.json({ ok: true });
}

export const gdprRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: UserRow };
}>()
  .use(requireUser)
  .use(requireEmailVerified)
  .get("/export", async (c) => {
    const u = c.get("user");
    const db = createDb(c.env.DB);
    const payload = await buildGdprExportJson(db, u);
    return c.json(payload);
  })
  .post("/export", async (c) => {
    const u = c.get("user");
    const db = createDb(c.env.DB);
    const payload = await buildGdprExportJson(db, u);
    return c.json(payload);
  })
  .delete("/erase", handleErase)
  .post("/erase", handleErase);
