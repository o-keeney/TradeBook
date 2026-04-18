import { desc } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db/drizzle";
import { contactSubmissions } from "../db/schema";
import type { Env } from "../env";
import {
  getTradesmanMonthlyEuros,
  setTradesmanMonthlyEuros,
} from "../lib/platform-settings";
import type { UserRow } from "../lib/public-user";
import { requireAdmin } from "../middleware/admin";
import { requireUser } from "../middleware/session";

const patchSchema = z.object({
  tradesmanMonthlyEuros: z.number().finite().min(0).max(999_999),
});

export const adminPricingRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: UserRow };
}>()
  .use(requireUser)
  .use(requireAdmin)
  .get("/pricing", async (c) => {
    const db = createDb(c.env.DB);
    const tradesmanMonthlyEuros = await getTradesmanMonthlyEuros(db);
    return c.json({ tradesmanMonthlyEuros });
  })
  .get("/contact-submissions", async (c) => {
    const db = createDb(c.env.DB);
    const rows = await db
      .select()
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(100);
    return c.json({
      submissions: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.getTime(),
        email: r.email,
        name: r.name,
        message: r.message,
      })),
    });
  })
  .patch("/pricing", async (c) => {
    let body: z.infer<typeof patchSchema>;
    try {
      body = patchSchema.parse(await c.req.json());
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
    const db = createDb(c.env.DB);
    await setTradesmanMonthlyEuros(db, body.tradesmanMonthlyEuros);
    return c.json({ tradesmanMonthlyEuros: body.tradesmanMonthlyEuros });
  });
