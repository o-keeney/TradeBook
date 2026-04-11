import { count } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { getAllowedOrigins } from "./cors";
import { createDb } from "./db/drizzle";
import { users } from "./db/schema";
import type { Env } from "./env";
import { adminPricingRoutes } from "./routes/admin-pricing";
import { authRoutes } from "./routes/auth";
import { portfolioManageRoutes } from "./routes/portfolio-manage";
import { publicPortfolioRoutes } from "./routes/portfolio-public";
import { publicSiteRoutes } from "./routes/public-site";
import { tradesmenRoutes } from "./routes/tradesmen";
import { workOrderRoutes } from "./routes/work-orders";
import { userRoutes } from "./routes/users";

const app = new Hono<{ Bindings: Env }>();

app.use("*", (c, next) => {
  const allowed = getAllowedOrigins(c.env);
  return cors({
    origin: (origin) => {
      if (!origin) return allowed[0];
      return allowed.includes(origin) ? origin : allowed[0];
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })(c, next);
});

app.get("/api/health", async (c) => {
  const db = createDb(c.env.DB);
  let d1Status: "reachable" | "unreachable" = "unreachable";
  let userCount: number | null = null;
  try {
    await c.env.DB.prepare("SELECT 1").first();
    d1Status = "reachable";
    try {
      const row = await db.select({ c: count() }).from(users);
      userCount = row[0]?.c ?? 0;
    } catch {
      userCount = null;
    }
  } catch {
    d1Status = "unreachable";
  }
  return c.json({
    ok: true,
    service: "tradebook-api",
    environment: c.env.ENVIRONMENT,
    d1: d1Status,
    users: userCount,
  });
});

app.route("/api", publicPortfolioRoutes);
app.route("/api/public", publicSiteRoutes);
app.route("/api/tradesmen", tradesmenRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/users", userRoutes);
app.route("/api/admin", adminPricingRoutes);
app.route("/api/portfolio", portfolioManageRoutes);
app.route("/api/work-orders", workOrderRoutes);

export default app;
