import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db/drizzle";
import type { Env } from "../env";
import {
  getVerificationMutationPolicy,
  setVerificationMutationPolicy,
} from "../lib/verification-mutation-policy";
import type { UserRow } from "../lib/public-user";
import { requireAdmin } from "../middleware/admin";
import { requireUser } from "../middleware/session";

const patchSchema = z
  .object({
    requireEmailVerifiedForMutations: z.boolean().optional(),
    requireSmsVerifiedForMutations: z.boolean().optional(),
  })
  .strict();

export const adminVerificationPolicyRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: UserRow };
}>()
  .use(requireUser)
  .use(requireAdmin)
  .get("/verification-policy", async (c) => {
    const db = createDb(c.env.DB);
    const policy = await getVerificationMutationPolicy(db);
    return c.json(policy);
  })
  .patch("/verification-policy", async (c) => {
    let body: z.infer<typeof patchSchema>;
    try {
      body = patchSchema.parse(await c.req.json());
    } catch (e) {
      if (e instanceof z.ZodError) {
        return c.json(
          { error: { code: "validation_error", message: "Invalid request", details: e.flatten() } },
          400,
        );
      }
      throw e;
    }
    if (Object.keys(body).length === 0) {
      return c.json({ error: { code: "validation_error", message: "No fields to update" } }, 400);
    }
    const db = createDb(c.env.DB);
    const policy = await setVerificationMutationPolicy(db, body);
    return c.json(policy);
  });
