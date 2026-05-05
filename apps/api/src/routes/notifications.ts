import { and, count, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db/drizzle";
import { notifications } from "../db/schema";
import type { Env } from "../env";
import type { UserRow } from "../lib/public-user";
import { requireUser } from "../middleware/session";

export const notificationsRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: UserRow };
}>()
  .use(requireUser)
  .get("/", async (c) => {
    const u = c.get("user");
    const db = createDb(c.env.DB);
    const limitRaw = c.req.query("limit");
    const parsed = Number.parseInt(limitRaw ?? "", 10);
    const limit = Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : 40;
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, u.id))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    return c.json({
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href,
        readAt: n.readAt ? n.readAt.getTime() : null,
        createdAt: n.createdAt.getTime(),
      })),
    });
  })
  .get("/unread-count", async (c) => {
    const u = c.get("user");
    const db = createDb(c.env.DB);
    const [row] = await db
      .select({ n: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, u.id), isNull(notifications.readAt)));
    return c.json({ unreadCount: row?.n ?? 0 });
  })
  .post("/read-all", async (c) => {
    const u = c.get("user");
    const db = createDb(c.env.DB);
    const now = new Date();
    await db
      .update(notifications)
      .set({ readAt: now })
      .where(and(eq(notifications.userId, u.id), isNull(notifications.readAt)));
    return c.json({ ok: true, readAt: now.getTime() });
  })
  .post("/:id/read", async (c) => {
    const u = c.get("user");
    const id = c.req.param("id");
    const db = createDb(c.env.DB);
    const now = new Date();
    await db
      .update(notifications)
      .set({ readAt: now })
      .where(and(eq(notifications.id, id), eq(notifications.userId, u.id)));
    return c.json({ ok: true, readAt: now.getTime() });
  });
