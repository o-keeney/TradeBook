import { Hono } from "hono";
import type { Env } from "../env";
import type { UserRow } from "../lib/public-user";
import { adminPricingRoutes } from "./admin-pricing";
import { adminUserRoutes } from "./admin-users";
import { adminVerificationPolicyRoutes } from "./admin-verification-policy";

/** Combined admin API (pricing, contact inbox, user management). */
export const adminRoutes = new Hono<{ Bindings: Env; Variables: { user: UserRow } }>()
  .route("/", adminPricingRoutes)
  .route("/", adminUserRoutes)
  .route("/", adminVerificationPolicyRoutes);
