import { Hono } from "hono";
import { createDb } from "../db/drizzle";
import type { Env } from "../env";
import { getTradesmanMonthlyEuros } from "../lib/platform-settings";

export const publicSiteRoutes = new Hono<{ Bindings: Env }>().get(
  "/site-config",
  async (c) => {
    const db = createDb(c.env.DB);
    const tradesmanMonthlyEuros = await getTradesmanMonthlyEuros(db);
    return c.json({ tradesmanMonthlyEuros });
  },
);
