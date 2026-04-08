import { createMiddleware } from "hono/factory";
import type { Env } from "../env";
import type { UserRow } from "../lib/public-user";

export const requireCustomer = createMiddleware<{
  Bindings: Env;
  Variables: { user: UserRow };
}>(async (c, next) => {
  if (c.get("user").role !== "customer") {
    return c.json(
      { error: { code: "forbidden", message: "Customer account required" } },
      403,
    );
  }
  await next();
});
