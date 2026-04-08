import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db/drizzle";
import { sessions, tradesmenProfiles, users } from "../db/schema";
import type { Env } from "../env";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  clearSessionCookie,
  readSessionId,
  SESSION_TTL_MS,
  setSessionCookie,
} from "../lib/session-cookie";
import { toPublicUser } from "../lib/public-user";

const registerSchema = z.object({
  email: z
    .string()
    .email()
    .max(320)
    .transform((s) => s.toLowerCase().trim()),
  password: z.string().min(8).max(128),
  role: z.enum(["customer", "tradesman"]),
  phone: z.string().max(32).optional(),
  gdprConsentDataProcessing: z.literal(true),
  gdprConsentMarketing: z.boolean(),
  gdprConsentContactDisplay: z.boolean(),
});

const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((s) => s.toLowerCase().trim()),
  password: z.string().min(1).max(128),
});

export const authRoutes = new Hono<{ Bindings: Env }>()
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
      await db.insert(users).values({
        id,
        role: body.role,
        email: body.email,
        phone: body.phone ?? null,
        passwordHash,
        gdprConsentDataProcessing: true,
        gdprConsentMarketing: body.gdprConsentMarketing,
        gdprConsentContactDisplay: body.gdprConsentContactDisplay,
        emailVerified: false,
      });

      if (body.role === "tradesman") {
        await db.insert(tradesmenProfiles).values({
          userId: id,
          tradeCategories: [],
          regionConfig: {},
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

    const [row] = await db.select().from(users).where(eq(users.id, id));
    return c.json({ user: row ? toPublicUser(row) : null }, 201);
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
    return c.json({ user: toPublicUser(user) });
  })
  .post("/logout", async (c) => {
    const sid = readSessionId(c);
    if (sid) {
      const db = createDb(c.env.DB);
      await db.delete(sessions).where(eq(sessions.id, sid));
    }
    clearSessionCookie(c);
    return c.body(null, 204);
  });
