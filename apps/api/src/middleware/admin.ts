import { createMiddleware } from "hono/factory";
import type { Env } from "../env";
import type { UserRow } from "../lib/public-user";

export const requireAdmin = createMiddleware<{
  Bindings: Env;
  Variables: { user: UserRow };
}>(async (c, next) => {
  const user = c.get("user");
  if (user.role !== "admin") {
    return c.json(
      { error: { code: "forbidden", message: "Admin access required" } },
      403,
    );
  }
  await next();
});
