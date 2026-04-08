import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db/drizzle";
import { tradesmenProfiles, users } from "../db/schema";
import type { Env } from "../env";
import type { UserRow } from "../lib/public-user";
import {
  toOwnerTradesmanProfile,
  toPublicTradesmanProfile,
} from "../lib/tradesman-profile-view";
import { requireTradesman } from "../middleware/tradesman";
import { requireUser } from "../middleware/session";

const regionConfigSchema = z
  .object({
    postcodes: z.array(z.string().max(16)).max(50).optional(),
    cities: z.array(z.string().max(80)).max(30).optional(),
    radiusKm: z.number().min(1).max(500).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lon: z.number().min(-180).max(180).optional(),
  })
  .strict()
  .optional();

const patchProfileSchema = z.object({
  bio: z.string().max(8000).optional(),
  tradeCategories: z.array(z.string().min(1).max(64)).max(24).optional(),
  regionConfig: regionConfigSchema,
  isAvailable: z.boolean().optional(),
  contactEmail: z.string().email().max(320).nullable().optional(),
  contactPhone: z.string().max(32).nullable().optional(),
  contactEmailVisible: z.boolean().optional(),
  contactPhoneVisible: z.boolean().optional(),
});

async function ensureTradesmanProfile(
  db: ReturnType<typeof createDb>,
  userId: string,
) {
  const [existing] = await db
    .select()
    .from(tradesmenProfiles)
    .where(eq(tradesmenProfiles.userId, userId));
  if (existing) return existing;

  await db.insert(tradesmenProfiles).values({
    userId,
    tradeCategories: [],
    regionConfig: {},
  });

  const [row] = await db
    .select()
    .from(tradesmenProfiles)
    .where(eq(tradesmenProfiles.userId, userId));
  if (!row) {
    throw new Error("failed to create tradesman profile");
  }
  return row;
}

export const tradesmenRoutes = new Hono<{
  Bindings: Env;
  Variables: { user?: UserRow };
}>()
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const db = createDb(c.env.DB);

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)));

    if (!user || user.role !== "tradesman") {
      return c.json({ error: { code: "not_found", message: "Tradesman not found" } }, 404);
    }

    const profile = await ensureTradesmanProfile(db, id);

    return c.json({
      profile: toPublicTradesmanProfile(user, profile),
    });
  })
  .put("/:id/profile", requireUser, requireTradesman, async (c) => {
    const id = c.req.param("id");
    const sessionUser = c.get("user");
    if (id !== sessionUser.id) {
      return c.json({ error: { code: "forbidden", message: "You can only edit your own profile" } }, 403);
    }

    let body: z.infer<typeof patchProfileSchema>;
    try {
      body = patchProfileSchema.parse(await c.req.json());
    } catch (e) {
      if (e instanceof z.ZodError) {
        return c.json(
          { error: { code: "validation_error", details: e.flatten() } },
          400,
        );
      }
      throw e;
    }

    const db = createDb(c.env.DB);
    await ensureTradesmanProfile(db, id);

    const now = new Date();
    await db
      .update(tradesmenProfiles)
      .set({
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
        ...(body.tradeCategories !== undefined
          ? { tradeCategories: body.tradeCategories }
          : {}),
        ...(body.regionConfig !== undefined
          ? { regionConfig: body.regionConfig as Record<string, unknown> }
          : {}),
        ...(body.isAvailable !== undefined ? { isAvailable: body.isAvailable } : {}),
        ...(body.contactEmail !== undefined ? { contactEmail: body.contactEmail } : {}),
        ...(body.contactPhone !== undefined ? { contactPhone: body.contactPhone } : {}),
        ...(body.contactEmailVisible !== undefined
          ? { contactEmailVisible: body.contactEmailVisible }
          : {}),
        ...(body.contactPhoneVisible !== undefined
          ? { contactPhoneVisible: body.contactPhoneVisible }
          : {}),
        updatedAt: now,
      })
      .where(eq(tradesmenProfiles.userId, id));

    const [profile] = await db
      .select()
      .from(tradesmenProfiles)
      .where(eq(tradesmenProfiles.userId, id));

    if (!profile) {
      return c.json({ error: { code: "not_found", message: "Profile not found" } }, 404);
    }

    return c.json({ profile: toOwnerTradesmanProfile(profile) });
  });
