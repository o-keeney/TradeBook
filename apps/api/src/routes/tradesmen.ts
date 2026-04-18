import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db/drizzle";
import { reviews, tradesmenProfiles, users } from "../db/schema";
import type { Env } from "../env";
import type { UserRow } from "../lib/public-user";
import {
  toOwnerTradesmanProfile,
  toPublicTradesmanProfile,
} from "../lib/tradesman-profile-view";
import { requireEmailVerified } from "../middleware/email-verified";
import { requireTradesman } from "../middleware/tradesman";
import { requireUser } from "../middleware/session";

const regionConfigSchema = z
  .object({
    postcodes: z.array(z.string().max(16)).max(50).optional(),
    cities: z.array(z.string().max(80)).max(30).optional(),
    radiusKm: z.number().min(1).max(500).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lon: z.number().min(-180).max(180).optional(),
    serviceAddress: z.string().max(500).optional(),
  })
  .strict()
  .optional();

const patchProfileSchema = z.object({
  bio: z.string().max(8000).optional(),
  companyName: z.string().max(120).nullable().optional(),
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

/** Strip LIKE metacharacters; return null if nothing left to search. */
function likePattern(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.replace(/[%_\\]/g, "").trim().toLowerCase();
  if (!s) return null;
  return `%${s}%`;
}

type DiscoveryFilters = {
  profession: string | null;
  county: string | null;
  address: string | null;
  availableOnly: boolean;
  minRating: number | null;
  subscriptionTier: string | null;
  limit: number;
};

/** Query params for `GET /api/tradesmen` and `GET /api/tradesmen/search` (same behaviour). */
function parseDiscoveryQuery(c: {
  req: { query: (key: string) => string | undefined };
}): DiscoveryFilters {
  const profession = likePattern(c.req.query("profession") ?? undefined);
  const county = likePattern(c.req.query("county") ?? undefined);
  const address = likePattern(c.req.query("address") ?? undefined);
  const av = c.req.query("available") ?? c.req.query("is_available");
  const availableOnly = av === "1" || av === "true" || av === "yes";
  const minRaw = c.req.query("minRating") ?? c.req.query("min_rating");
  let minRating: number | null = null;
  if (minRaw) {
    const n = Number(minRaw);
    if (Number.isFinite(n) && n >= 0 && n <= 5) minRating = n;
  }
  const tierRaw = c.req.query("tier")?.trim() ?? c.req.query("subscriptionTier")?.trim();
  const subscriptionTier = tierRaw ? tierRaw : null;
  const limitRaw = c.req.query("limit");
  let limit = 50;
  if (limitRaw) {
    const n = Number.parseInt(limitRaw, 10);
    if (Number.isFinite(n)) limit = Math.min(100, Math.max(1, n));
  }
  return {
    profession,
    county,
    address,
    availableOnly,
    minRating,
    subscriptionTier,
    limit,
  };
}

async function queryTradesmenDiscovery(
  db: ReturnType<typeof createDb>,
  f: DiscoveryFilters,
) {
  const conditions = [eq(users.role, "tradesman"), isNull(users.deletedAt)];

  if (f.profession) {
    conditions.push(
      sql`lower(cast(${tradesmenProfiles.tradeCategories} as text)) like ${f.profession}`,
    );
  }
  if (f.county) {
    conditions.push(
      sql`(lower(${tradesmenProfiles.bio}) like ${f.county} or lower(cast(${tradesmenProfiles.regionConfig} as text)) like ${f.county})`,
    );
  }
  if (f.address) {
    conditions.push(
      sql`(lower(${tradesmenProfiles.bio}) like ${f.address} or lower(cast(${tradesmenProfiles.regionConfig} as text)) like ${f.address})`,
    );
  }
  if (f.availableOnly) {
    conditions.push(eq(tradesmenProfiles.isAvailable, true));
  }
  if (f.minRating != null) {
    conditions.push(
      sql`${tradesmenProfiles.avgRating} is not null and ${tradesmenProfiles.avgRating} >= ${f.minRating}`,
    );
  }
  if (f.subscriptionTier) {
    conditions.push(eq(tradesmenProfiles.subscriptionTier, f.subscriptionTier));
  }

  return db
    .select({ user: users, profile: tradesmenProfiles })
    .from(users)
    .innerJoin(tradesmenProfiles, eq(tradesmenProfiles.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(tradesmenProfiles.avgRating), desc(tradesmenProfiles.reviewCount))
    .limit(f.limit);
}

function discoveryResponseJson(
  rows: Awaited<ReturnType<typeof queryTradesmenDiscovery>>,
) {
  return {
    results: rows.map(({ user, profile }) => ({
      profile: toPublicTradesmanProfile(user, profile),
    })),
  };
}

export const tradesmenRoutes = new Hono<{
  Bindings: Env;
  Variables: { user?: UserRow };
}>()
  .get("/", async (c) => {
    const db = createDb(c.env.DB);
    const rows = await queryTradesmenDiscovery(db, parseDiscoveryQuery(c));
    return c.json(discoveryResponseJson(rows));
  })
  .get("/search", async (c) => {
    const db = createDb(c.env.DB);
    const rows = await queryTradesmenDiscovery(db, parseDiscoveryQuery(c));
    return c.json(discoveryResponseJson(rows));
  })
  .get("/:id/reviews", async (c) => {
    const id = c.req.param("id");
    const db = createDb(c.env.DB);

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)));

    if (!user || user.role !== "tradesman") {
      return c.json({ error: { code: "not_found", message: "Tradesman not found" } }, 404);
    }

    const limitRaw = c.req.query("limit");
    let limit = 20;
    if (limitRaw) {
      const n = Number.parseInt(limitRaw, 10);
      if (Number.isFinite(n)) limit = Math.min(50, Math.max(1, n));
    }

    const rows = await db
      .select({
        review: reviews,
        reviewerFirstName: users.firstName,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.reviewerId))
      .where(eq(reviews.tradesmanId, id))
      .orderBy(desc(reviews.createdAt))
      .limit(limit);

    return c.json({
      reviews: rows.map((r) => ({
        id: r.review.id,
        rating: r.review.rating,
        comment: r.review.comment,
        createdAt: r.review.createdAt.getTime(),
        reviewerFirstName: r.reviewerFirstName ?? null,
      })),
    });
  })
  .get("/:id/profile", requireUser, requireTradesman, async (c) => {
    const id = c.req.param("id");
    const sessionUser = c.get("user");
    if (id !== sessionUser.id) {
      return c.json({ error: { code: "forbidden", message: "You can only read your own profile" } }, 403);
    }

    const db = createDb(c.env.DB);
    const profile = await ensureTradesmanProfile(db, id);
    return c.json({ profile: toOwnerTradesmanProfile(profile) });
  })
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
  .put("/:id/profile", requireUser, requireTradesman, requireEmailVerified, async (c) => {
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
    const companyPatch =
      body.companyName === undefined
        ? {}
        : {
            companyName:
              body.companyName === null
                ? null
                : body.companyName.trim() === ""
                  ? null
                  : body.companyName.trim(),
          };

    await db
      .update(tradesmenProfiles)
      .set({
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
        ...companyPatch,
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
