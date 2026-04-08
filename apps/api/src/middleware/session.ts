import { and, eq, gt, isNull } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { createDb } from "../db/drizzle";
import { sessions, users } from "../db/schema";
import type { Env } from "../env";
import type { UserRow } from "../lib/public-user";
import { readSessionId } from "../lib/session-cookie";

export const requireUser = createMiddleware<{
  Bindings: Env;
  Variables: { user: UserRow };
}>(async (c, next) => {
  const sid = readSessionId(c);
  if (!sid) {
    return c.json(
      { error: { code: "unauthorized", message: "Sign in required" } },
      401,
    );
  }

  const db = createDb(c.env.DB);
  const now = new Date();

  const row = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.id, sid),
        gt(sessions.expiresAt, now),
        isNull(users.deletedAt),
      ),
    )
    .get();

  if (!row) {
    return c.json(
      { error: { code: "unauthorized", message: "Sign in required" } },
      401,
    );
  }

  c.set("user", row.user);
  await next();
});
