import { Hono } from "hono";
import type { Env } from "../env";
import { toPublicUser, type UserRow } from "../lib/public-user";
import { requireUser } from "../middleware/session";

export const userRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: UserRow };
}>()
  .use(requireUser)
  .get("/me", (c) => c.json({ user: toPublicUser(c.get("user")) }));
