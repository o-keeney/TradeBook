import { isConstructionProfession } from "@tradebook/construction-professions";
import { and, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db/drizzle";
import { sessions, tradesmenProfiles, users } from "../db/schema";
import type { Env } from "../env";
import { issueEmailVerificationAndSend } from "../lib/email-verification";
import { issuePasswordResetAndSend } from "../lib/password-reset";
import { resolveAppOrigin } from "../lib/app-origin";
import { hashPassword, verifyPassword } from "../lib/password";
import { sha256Hex } from "../lib/token-hash";
import { clearCsrfCookie, setCsrfCookie } from "../lib/csrf-cookie";
import {
  clearSessionCookie,
  readSessionId,
  SESSION_TTL_MS,
  setSessionCookie,
} from "../lib/session-cookie";
import { toPublicUser } from "../lib/public-user";
import { rateLimitKv } from "../middleware/rate-limit";

const registerSchema = z
  .object({
    email: z
      .string()
      .email()
      .max(320)
      .transform((s) => s.toLowerCase().trim()),
    password: z.string().min(8).max(128),
    role: z.enum(["customer", "tradesman"]),
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    /** Tradesman only; optional. */
    companyName: z.string().trim().max(120).optional(),
    phone: z.string().max(32).optional(),
    /** @deprecated Use `specialties`. Kept for older clients. */
    specialty: z.string().max(64).optional(),
    /** Trades at signup (tradesman only); each value must match the platform profession list. */
    specialties: z.array(z.string().min(1).max(64)).max(24).optional(),
    /** Service or contact address (tradesman only). */
    address: z.string().max(500).optional(),
    addressLat: z.number().finite().min(-90).max(90).optional(),
    addressLng: z.number().finite().min(-180).max(180).optional(),
    gdprConsentDataProcessing: z.literal(true),
    gdprConsentMarketing: z.boolean(),
    gdprConsentContactDisplay: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.role !== "tradesman") return;
    if (!data.phone?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone number is required.",
        path: ["phone"],
      });
    }
    if (!data.address?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Address is required.",
        path: ["address"],
      });
    }
    const fromArray = (data.specialties ?? [])
      .map((s) => s.trim())
      .filter(Boolean);
    const fromLegacy = data.specialty?.trim() ? [data.specialty.trim()] : [];
    const combined = fromArray.length ? fromArray : fromLegacy;
    if (combined.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one specialty.",
        path: ["specialties"],
      });
    } else {
      const invalid = combined.filter((s) => !isConstructionProfession(s));
      if (invalid.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "One or more specialties are not recognised.",
          path: ["specialties"],
        });
      }
    }
  });

const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((s) => s.toLowerCase().trim()),
  password: z.string().min(1).max(128),
});

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email()
    .transform((s) => s.toLowerCase().trim()),
});

const resetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .length(64)
    .regex(/^[0-9a-f]+$/i, "Invalid token format"),
  password: z.string().min(8).max(128),
});

export const authRoutes = new Hono<{ Bindings: Env }>()
  .use("/login", rateLimitKv({ prefix: "auth_login", windowMs: 60_000, max: 40 }))
  .use("/register", rateLimitKv({ prefix: "auth_register", windowMs: 60_000, max: 15 }))
  .use("/forgot-password", rateLimitKv({ prefix: "auth_forgot_pw", windowMs: 60_000, max: 8 }))
  .use("/reset-password", rateLimitKv({ prefix: "auth_reset_pw", windowMs: 60_000, max: 20 }))
  .use(
    "/verify-email",
    rateLimitKv({ prefix: "auth_verify_email", windowMs: 60_000, max: 60, methods: ["GET"] }),
  )
  .get("/verify-email", async (c) => {
    const appOrigin = resolveAppOrigin(c.env);
    const bounce = (search: string) => c.redirect(`${appOrigin}/verify-email${search}`, 302);

    const token = c.req.query("token")?.trim() ?? "";
    if (token.length !== 64 || !/^[0-9a-f]+$/i.test(token)) {
      return bounce("?error=invalid");
    }

    const hash = await sha256Hex(token);
    const db = createDb(c.env.DB);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.emailVerificationTokenHash, hash));

    if (!user) {
      return bounce("?error=invalid");
    }
    if (user.emailVerified) {
      return bounce("?verified=1");
    }
    if (
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt.getTime() < Date.now()
    ) {
      return bounce("?error=expired");
    }

    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
        emailVerificationLastSentAt: null,
      })
      .where(eq(users.id, user.id));

    return bounce("?verified=1");
  })
  .post("/register", async (c) => {
    let body: z.infer<typeof registerSchema>;
    try {
      body = registerSchema.parse(await c.req.json());
    } catch (e) {
      if (e instanceof z.ZodError) {
        return c.json(
          {
            error: {
              code: "validation_error",
              message: "Invalid request",
              details: e.flatten(),
            },
          },
          400,
        );
      }
      throw e;
    }

    const db = createDb(c.env.DB);
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(body.password);

    try {
      const phoneNorm = body.phone?.trim() ? body.phone.trim() : null;

      await db.insert(users).values({
        id,
        role: body.role,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: phoneNorm,
        passwordHash,
        gdprConsentDataProcessing: true,
        gdprConsentMarketing: body.gdprConsentMarketing,
        gdprConsentContactDisplay: body.gdprConsentContactDisplay,
        emailVerified: false,
      });

      if (body.role === "tradesman") {
        const fromArray = (body.specialties ?? [])
          .map((s) => s.trim())
          .filter(Boolean);
        const fromLegacy = body.specialty?.trim() ? [body.specialty.trim()] : [];
        const combined = fromArray.length ? fromArray : fromLegacy;
        const tradeCategories = [...new Set(combined.filter(isConstructionProfession))];
        const address = body.address!.trim();
        const regionConfig: Record<string, unknown> = { serviceAddress: address };
        if (
          body.addressLat !== undefined &&
          body.addressLng !== undefined &&
          Number.isFinite(body.addressLat) &&
          Number.isFinite(body.addressLng)
        ) {
          regionConfig.lat = body.addressLat;
          regionConfig.lon = body.addressLng;
        }
        const companyTrim = body.companyName?.trim();
        await db.insert(tradesmenProfiles).values({
          userId: id,
          tradeCategories,
          regionConfig,
          contactPhone: phoneNorm,
          companyName: companyTrim ? companyTrim : null,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("UNIQUE") || msg.includes("unique")) {
        return c.json(
          { error: { code: "conflict", message: "Email already registered" } },
          409,
        );
      }
      throw err;
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db.insert(sessions).values({
      id: sessionId,
      userId: id,
      expiresAt,
    });

    setSessionCookie(c, sessionId);
    setCsrfCookie(c);

    const [row] = await db.select().from(users).where(eq(users.id, id));
    const emailVerification = await issueEmailVerificationAndSend(c.env, db, {
      userId: id,
      email: body.email,
      apiRequestUrl: c.req.url,
    });

    return c.json(
      {
        user: row ? toPublicUser(row) : null,
        emailVerificationSent: emailVerification.emailSent,
      },
      201,
    );
  })
  .post("/login", async (c) => {
    let body: z.infer<typeof loginSchema>;
    try {
      body = loginSchema.parse(await c.req.json());
    } catch (e) {
      if (e instanceof z.ZodError) {
        return c.json(
          {
            error: {
              code: "validation_error",
              message: "Invalid request",
              details: e.flatten(),
            },
          },
          400,
        );
      }
      throw e;
    }

    const db = createDb(c.env.DB);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email));

    if (!user || user.deletedAt || !user.passwordHash) {
      return c.json(
        { error: { code: "invalid_credentials", message: "Invalid email or password" } },
        401,
      );
    }

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      return c.json(
        { error: { code: "invalid_credentials", message: "Invalid email or password" } },
        401,
      );
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt,
    });

    setSessionCookie(c, sessionId);
    setCsrfCookie(c);
    return c.json({ user: toPublicUser(user) });
  })
  .post("/forgot-password", async (c) => {
    let body: z.infer<typeof forgotPasswordSchema>;
    try {
      body = forgotPasswordSchema.parse(await c.req.json());
    } catch (e) {
      if (e instanceof z.ZodError) {
        return c.json(
          {
            error: {
              code: "validation_error",
              message: "Invalid request",
              details: e.flatten(),
            },
          },
          400,
        );
      }
      throw e;
    }

    const db = createDb(c.env.DB);
    const generic = {
      ok: true as const,
      message:
        "If an account exists for that email, we sent instructions to reset your password.",
    };

    const [user] = await db.select().from(users).where(eq(users.email, body.email));
    if (user && !user.deletedAt && user.passwordHash) {
      await issuePasswordResetAndSend(c.env, db, { userId: user.id, email: user.email });
    }

    return c.json(generic);
  })
  .post("/reset-password", async (c) => {
    let body: z.infer<typeof resetPasswordSchema>;
    try {
      body = resetPasswordSchema.parse(await c.req.json());
    } catch (e) {
      if (e instanceof z.ZodError) {
        return c.json(
          {
            error: {
              code: "validation_error",
              message: "Invalid request",
              details: e.flatten(),
            },
          },
          400,
        );
      }
      throw e;
    }

    const db = createDb(c.env.DB);
    const tokenHash = await sha256Hex(body.token);
    const now = new Date();

    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetTokenHash, tokenHash),
          isNotNull(users.passwordResetExpiresAt),
          gt(users.passwordResetExpiresAt, now),
          isNull(users.deletedAt),
        ),
      );

    if (!user) {
      return c.json(
        {
          error: {
            code: "invalid_or_expired_token",
            message: "This reset link is invalid or has expired. Request a new one from the login page.",
          },
        },
        400,
      );
    }

    const newPasswordHash = await hashPassword(body.password);
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      })
      .where(eq(users.id, user.id));

    await db.delete(sessions).where(eq(sessions.userId, user.id));

    clearSessionCookie(c);
    clearCsrfCookie(c);
    return c.json({ ok: true });
  })
  .post("/logout", async (c) => {
    const sid = readSessionId(c);
    if (sid) {
      const db = createDb(c.env.DB);
      await db.delete(sessions).where(eq(sessions.id, sid));
    }
    clearSessionCookie(c);
    clearCsrfCookie(c);
    return c.body(null, 204);
  });
