import { isConstructionProfession } from "@tradebook/construction-professions";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db/drizzle";
import {
  consentAuditLogs,
  subscriptionStatusEnum,
  tradesmenProfiles,
  users,
  verificationStatusEnum,
} from "../db/schema";
import type { Env } from "../env";
import { toOwnerTradesmanProfile } from "../lib/tradesman-profile-view";
import { toPublicUser, type UserRow } from "../lib/public-user";

function toAdminUserJson(u: UserRow) {
  return { ...toPublicUser(u), phoneVerified: u.phoneVerified };
}
import { requireAdmin } from "../middleware/admin";
import { requireUser } from "../middleware/session";

function searchPattern(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.replace(/[%_\\]/g, "").trim().toLowerCase();
  if (!s) return null;
  return `%${s}%`;
}

async function ensureTradesmanProfile(db: ReturnType<typeof createDb>, userId: string) {
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
  if (!row) throw new Error("failed to create tradesman profile");
  return row;
}

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

const adminPatchUserSchema = z
  .object({
    firstName: z.string().trim().max(80).nullable().optional(),
    lastName: z.string().trim().max(80).nullable().optional(),
    phone: z.string().max(32).nullable().optional(),
    email: z
      .string()
      .email()
      .max(320)
      .transform((s) => s.toLowerCase().trim())
      .optional(),
    role: z.enum(["customer", "tradesman", "admin"]).optional(),
    emailVerified: z.boolean().optional(),
    phoneVerified: z.boolean().optional(),
    gdprConsentMarketing: z.boolean().optional(),
    gdprConsentContactDisplay: z.boolean().optional(),
    gdprConsentDataProcessing: z.boolean().optional(),
    /** When false, soft-delete the account; when true, clear `deleted_at`. */
    accountActive: z.boolean().optional(),
  })
  .strict();

const adminTradesmanPatchSchema = z
  .object({
    bio: z.string().max(8000).optional(),
    companyName: z.string().max(120).nullable().optional(),
    tradeCategories: z.array(z.string().min(1).max(64)).max(24).optional(),
    regionConfig: regionConfigSchema,
    isAvailable: z.boolean().optional(),
    contactEmail: z.string().email().max(320).nullable().optional(),
    contactPhone: z.string().max(32).nullable().optional(),
    contactEmailVisible: z.boolean().optional(),
    contactPhoneVisible: z.boolean().optional(),
    verificationStatus: z.enum(verificationStatusEnum).optional(),
    subscriptionStatus: z.enum(subscriptionStatusEnum).optional(),
    subscriptionTier: z.string().max(64).nullable().optional(),
  })
  .strict();

export const adminUserRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: UserRow };
}>()
  .use(requireUser)
  .use(requireAdmin)
  .get("/users", async (c) => {
    const db = createDb(c.env.DB);
    const includeDeleted = c.req.query("all") === "1";
    const qPat = searchPattern(c.req.query("q") ?? undefined);

    const limitRaw = c.req.query("limit");
    let limit = 50;
    if (limitRaw) {
      const n = Number.parseInt(limitRaw, 10);
      if (Number.isFinite(n)) limit = Math.min(100, Math.max(1, n));
    }
    const offsetRaw = c.req.query("offset");
    let offset = 0;
    if (offsetRaw) {
      const n = Number.parseInt(offsetRaw, 10);
      if (Number.isFinite(n)) offset = Math.max(0, n);
    }

    const conditions = [];
    if (!includeDeleted) {
      conditions.push(isNull(users.deletedAt));
    }
    if (qPat) {
      conditions.push(
        sql`(lower(${users.email}) like ${qPat} or lower(coalesce(${users.firstName},'')) like ${qPat} or lower(coalesce(${users.lastName},'')) like ${qPat})`,
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalRow] = await db.select({ c: count() }).from(users).where(where);
    const total = totalRow?.c ?? 0;

    return c.json({
      users: rows.map((u) => toPublicUser(u)),
      total,
      limit,
      offset,
    });
  })
  .get("/users/:id/consent-audit", async (c) => {
    const id = c.req.param("id");
    const db = createDb(c.env.DB);
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, id));
    if (!u) {
      return c.json({ error: { code: "not_found", message: "User not found" } }, 404);
    }
    const rows = await db
      .select()
      .from(consentAuditLogs)
      .where(eq(consentAuditLogs.userId, id))
      .orderBy(desc(consentAuditLogs.createdAt));
    return c.json({
      entries: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.getTime(),
        ip: r.ip,
        userAgent: r.userAgent ? r.userAgent.slice(0, 200) : null,
        gdprConsentDataProcessing: r.gdprConsentDataProcessing,
        gdprConsentMarketing: r.gdprConsentMarketing,
        gdprConsentContactDisplay: r.gdprConsentContactDisplay,
        source: r.source,
      })),
    });
  })
  .get("/users/:id", async (c) => {
    const id = c.req.param("id");
    const db = createDb(c.env.DB);
    const [u] = await db.select().from(users).where(eq(users.id, id));
    if (!u) {
      return c.json({ error: { code: "not_found", message: "User not found" } }, 404);
    }
    let profile =
      (await db.select().from(tradesmenProfiles).where(eq(tradesmenProfiles.userId, id)))[0] ?? null;
    if (u.role === "tradesman" && !profile) {
      profile = await ensureTradesmanProfile(db, id);
    }
    return c.json({
      user: toAdminUserJson(u),
      tradesmanProfile:
        u.role === "tradesman" && profile ? toOwnerTradesmanProfile(profile) : null,
    });
  })
  .patch("/users/:id", async (c) => {
    const id = c.req.param("id");
    const adminUser = c.get("user");

    let body: z.infer<typeof adminPatchUserSchema>;
    try {
      body = adminPatchUserSchema.parse(await c.req.json());
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

    if (adminUser.id === id && body.role !== undefined && body.role !== "admin") {
      return c.json(
        { error: { code: "forbidden", message: "You cannot remove your own admin role" } },
        403,
      );
    }

    const db = createDb(c.env.DB);
    const [target] = await db.select().from(users).where(eq(users.id, id));
    if (!target) {
      return c.json({ error: { code: "not_found", message: "User not found" } }, 404);
    }

    if (body.email !== undefined && body.email !== target.email.toLowerCase()) {
      const [conflict] = await db.select().from(users).where(eq(users.email, body.email));
      if (conflict) {
        return c.json({ error: { code: "conflict", message: "That email is already in use" } }, 409);
      }
    }

    const now = new Date();
    const set: Record<string, unknown> = {};

    if (body.firstName !== undefined) set.firstName = body.firstName?.trim() ? body.firstName.trim() : null;
    if (body.lastName !== undefined) set.lastName = body.lastName?.trim() ? body.lastName.trim() : null;
    if (body.phone !== undefined) {
      const p = body.phone?.trim();
      set.phone = p && p.length > 0 ? p : null;
    }
    if (body.email !== undefined) set.email = body.email;
    if (body.role !== undefined) {
      set.role = body.role;
      if (body.role === "tradesman") {
        await ensureTradesmanProfile(db, id);
      }
    }
    if (body.emailVerified === true) {
      set.emailVerified = true;
      set.emailVerificationTokenHash = null;
      set.emailVerificationExpiresAt = null;
    } else if (body.emailVerified === false) {
      set.emailVerified = false;
    }
    if (body.phoneVerified === true) {
      set.phoneVerified = true;
    } else if (body.phoneVerified === false) {
      set.phoneVerified = false;
    }
    if (body.gdprConsentMarketing !== undefined) set.gdprConsentMarketing = body.gdprConsentMarketing;
    if (body.gdprConsentContactDisplay !== undefined) {
      set.gdprConsentContactDisplay = body.gdprConsentContactDisplay;
    }
    if (body.gdprConsentDataProcessing !== undefined) {
      set.gdprConsentDataProcessing = body.gdprConsentDataProcessing;
    }
    if (body.accountActive === true) {
      set.deletedAt = null;
    } else if (body.accountActive === false) {
      set.deletedAt = now;
    }

    if (Object.keys(set).length === 0) {
      const [row] = await db.select().from(users).where(eq(users.id, id));
      const [profile] = await db.select().from(tradesmenProfiles).where(eq(tradesmenProfiles.userId, id));
      return c.json({
        user: row ? toAdminUserJson(row) : null,
        tradesmanProfile:
          row?.role === "tradesman" && profile ? toOwnerTradesmanProfile(profile) : null,
      });
    }

    await db
      .update(users)
      .set(set as typeof users.$inferInsert)
      .where(eq(users.id, id));

    const [u] = await db.select().from(users).where(eq(users.id, id));
    const [profile] = await db.select().from(tradesmenProfiles).where(eq(tradesmenProfiles.userId, id));
    return c.json({
      user: u ? toAdminUserJson(u) : null,
      tradesmanProfile:
        u?.role === "tradesman" && profile ? toOwnerTradesmanProfile(profile) : null,
    });
  })
  .patch("/users/:id/tradesman-profile", async (c) => {
    const id = c.req.param("id");
    let body: z.infer<typeof adminTradesmanPatchSchema>;
    try {
      body = adminTradesmanPatchSchema.parse(await c.req.json());
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
    const [target] = await db.select().from(users).where(eq(users.id, id));
    if (!target) {
      return c.json({ error: { code: "not_found", message: "User not found" } }, 404);
    }
    if (target.role !== "tradesman") {
      return c.json(
        { error: { code: "invalid_state", message: "This account is not a tradesman" } },
        400,
      );
    }

    if (body.tradeCategories !== undefined) {
      const invalid = body.tradeCategories.filter((s) => !isConstructionProfession(s));
      if (invalid.length) {
        return c.json(
          {
            error: {
              code: "validation_error",
              message: "One or more trade categories are not recognised.",
            },
          },
          400,
        );
      }
    }

    await ensureTradesmanProfile(db, id);

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

    const now = new Date();
    await db
      .update(tradesmenProfiles)
      .set({
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
        ...companyPatch,
        ...(body.tradeCategories !== undefined ? { tradeCategories: body.tradeCategories } : {}),
        ...(body.regionConfig !== undefined
          ? { regionConfig: body.regionConfig as Record<string, unknown> }
          : {}),
        ...(body.isAvailable !== undefined ? { isAvailable: body.isAvailable } : {}),
        ...(body.contactEmail !== undefined ? { contactEmail: body.contactEmail } : {}),
        ...(body.contactPhone !== undefined ? { contactPhone: body.contactPhone } : {}),
        ...(body.contactEmailVisible !== undefined ? { contactEmailVisible: body.contactEmailVisible } : {}),
        ...(body.contactPhoneVisible !== undefined ? { contactPhoneVisible: body.contactPhoneVisible } : {}),
        ...(body.verificationStatus !== undefined ? { verificationStatus: body.verificationStatus } : {}),
        ...(body.subscriptionStatus !== undefined ? { subscriptionStatus: body.subscriptionStatus } : {}),
        ...(body.subscriptionTier !== undefined
          ? {
              subscriptionTier:
                body.subscriptionTier === null || body.subscriptionTier.trim() === ""
                  ? null
                  : body.subscriptionTier.trim(),
            }
          : {}),
        updatedAt: now,
      })
      .where(eq(tradesmenProfiles.userId, id));

    const [profile] = await db.select().from(tradesmenProfiles).where(eq(tradesmenProfiles.userId, id));
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return c.json({
      user: u ? toAdminUserJson(u) : null,
      tradesmanProfile: profile ? toOwnerTradesmanProfile(profile) : null,
    });
  });
