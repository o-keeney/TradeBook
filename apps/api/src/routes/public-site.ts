import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db/drizzle";
import { contactSubmissions } from "../db/schema";
import type { Env } from "../env";
import { getTradesmanMonthlyEuros } from "../lib/platform-settings";
import { rateLimitKv } from "../middleware/rate-limit";

const contactBodySchema = z.object({
  email: z.string().trim().email().max(320),
  name: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(4000),
});

export const publicSiteRoutes = new Hono<{ Bindings: Env }>()
  .use("/contact", rateLimitKv({ prefix: "public_contact", windowMs: 60_000, max: 20 }))
  .get("/site-config", async (c) => {
    const db = createDb(c.env.DB);
    const tradesmanMonthlyEuros = await getTradesmanMonthlyEuros(db);
    return c.json({ tradesmanMonthlyEuros });
  })
  .post("/contact", async (c) => {
    let body: z.infer<typeof contactBodySchema>;
    try {
      body = contactBodySchema.parse(await c.req.json());
    } catch (e) {
      if (e instanceof z.ZodError) {
        return c.json(
          { error: { code: "validation_error", message: "Invalid request", details: e.flatten() } },
          400,
        );
      }
      throw e;
    }

    const db = createDb(c.env.DB);
    const id = crypto.randomUUID();
    await db.insert(contactSubmissions).values({
      id,
      email: body.email.toLowerCase(),
      name: body.name,
      message: body.message,
    });

    return c.json({ ok: true }, 201);
  });
