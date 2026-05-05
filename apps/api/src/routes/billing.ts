import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db/drizzle";
import { tradesmenProfiles } from "../db/schema";
import type { Env } from "../env";
import { getTradesmanMonthlyEuros } from "../lib/platform-settings";
import type { UserRow } from "../lib/public-user";
import { requireTradesman } from "../middleware/tradesman";
import { requireUser } from "../middleware/session";

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const STRIPE_API_VERSION = "2024-06-20";
const FIRST_MONTH_FREE_DAYS = 30;
const SUBSCRIPTION_TIER = "pro";

type StripeFetchInit = {
  method: "GET" | "POST";
  secretKey: string;
  path: string;
  form?: URLSearchParams;
};

async function stripeFetchJson(init: StripeFetchInit): Promise<unknown> {
  const url = `${STRIPE_API_BASE}${init.path}`;
  const headers = new Headers({
    Authorization: `Bearer ${init.secretKey}`,
    "Stripe-Version": STRIPE_API_VERSION,
  });
  let body: string | undefined;
  if (init.form) {
    headers.set("Content-Type", "application/x-www-form-urlencoded");
    body = init.form.toString();
  }
  const res = await fetch(url, {
    method: init.method,
    headers,
    body,
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!res.ok) {
    const message = json.error?.message ?? `Stripe request failed (${res.status})`;
    throw new Error(message);
  }
  return json;
}

function centsFromEur(euros: number): number {
  return Math.max(0, Math.round(euros * 100));
}

function apiOriginFromUrl(url: string): string {
  return new URL(url).origin;
}

function appOrigin(env: Env, requestUrl: string): string {
  const raw = env.APP_ORIGIN?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return apiOriginFromUrl(requestUrl);
}

function stripeStatusToLocal(status: string | undefined): "inactive" | "trialing" | "active" | "past_due" | "cancelled" {
  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled" || status === "incomplete_expired") return "cancelled";
  return "inactive";
}

function parseStripeWebhookHeader(value: string | undefined): { timestamp: string; v1: string } | null {
  if (!value) return null;
  const parts = value.split(",").map((p) => p.trim());
  let timestamp = "";
  let v1 = "";
  for (const part of parts) {
    const [k, v] = part.split("=", 2);
    if (k === "t" && v) timestamp = v;
    if (k === "v1" && v) v1 = v;
  }
  if (!timestamp || !v1) return null;
  return { timestamp, v1 };
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const aa = a.toLowerCase();
  const bb = b.toLowerCase();
  if (aa.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < aa.length; i++) out |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  return out === 0;
}

type StripeSubscription = {
  id?: string;
  customer?: string;
  status?: string;
  current_period_end?: number;
  trial_end?: number | null;
  items?: { data?: Array<{ price?: { id?: string } }> };
  metadata?: Record<string, string | undefined>;
};

async function applySubscriptionSnapshot(
  env: Env,
  input: { customerId?: string; subscriptionId?: string; userId?: string; subscription?: StripeSubscription },
) {
  const db = createDb(env.DB);
  let profile:
    | (typeof tradesmenProfiles.$inferSelect)
    | undefined;

  if (input.customerId) {
    [profile] = await db
      .select()
      .from(tradesmenProfiles)
      .where(eq(tradesmenProfiles.stripeCustomerId, input.customerId));
  }
  if (!profile && input.subscriptionId) {
    [profile] = await db
      .select()
      .from(tradesmenProfiles)
      .where(eq(tradesmenProfiles.stripeSubscriptionId, input.subscriptionId));
  }
  if (!profile && input.userId) {
    [profile] = await db.select().from(tradesmenProfiles).where(eq(tradesmenProfiles.userId, input.userId));
  }
  if (!profile) return;

  const subscription = input.subscription;
  const nextStatus = stripeStatusToLocal(subscription?.status);
  const nextTier = nextStatus === "inactive" || nextStatus === "cancelled" ? null : SUBSCRIPTION_TIER;
  const nextCurrentPeriodEnd =
    typeof subscription?.current_period_end === "number"
      ? new Date(subscription.current_period_end * 1000)
      : null;
  const nextTrialEndsAt =
    typeof subscription?.trial_end === "number" ? new Date(subscription.trial_end * 1000) : null;
  const nextPriceId = subscription?.items?.data?.[0]?.price?.id ?? null;

  await db
    .update(tradesmenProfiles)
    .set({
      subscriptionStatus: nextStatus,
      subscriptionTier: nextTier,
      stripeCustomerId: input.customerId ?? profile.stripeCustomerId ?? null,
      stripeSubscriptionId: input.subscriptionId ?? profile.stripeSubscriptionId ?? null,
      stripePriceId: nextPriceId,
      stripeCurrentPeriodEnd: nextCurrentPeriodEnd,
      stripeTrialEndsAt: nextTrialEndsAt,
      updatedAt: new Date(),
    })
    .where(eq(tradesmenProfiles.userId, profile.userId));
}

export const billingRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: UserRow };
}>()
  .post("/stripe/webhook", async (c) => {
    const secret = c.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!secret) {
      return c.json({ error: { code: "service_unavailable", message: "Stripe webhook not configured" } }, 503);
    }

    const sigHeader = c.req.header("stripe-signature");
    const parsed = parseStripeWebhookHeader(sigHeader);
    if (!parsed) {
      return c.json({ error: { code: "invalid_signature", message: "Missing Stripe signature" } }, 400);
    }

    const body = await c.req.text();
    const signedPayload = `${parsed.timestamp}.${body}`;
    const expected = await hmacSha256Hex(secret, signedPayload);
    if (!timingSafeEqualHex(expected, parsed.v1)) {
      return c.json({ error: { code: "invalid_signature", message: "Webhook signature mismatch" } }, 400);
    }

    const event = JSON.parse(body) as {
      type?: string;
      data?: { object?: Record<string, unknown> };
    };
    const eventType = event.type ?? "";
    const obj = event.data?.object ?? {};

    if (eventType === "checkout.session.completed") {
      const customerId = typeof obj.customer === "string" ? obj.customer : undefined;
      const subscriptionId = typeof obj.subscription === "string" ? obj.subscription : undefined;
      const metadata = obj.metadata as Record<string, string | undefined> | undefined;
      await applySubscriptionSnapshot(c.env, {
        customerId,
        subscriptionId,
        userId: metadata?.userId,
      });
    } else if (
      eventType === "customer.subscription.updated" ||
      eventType === "customer.subscription.deleted" ||
      eventType === "customer.subscription.created"
    ) {
      const sub = obj as StripeSubscription;
      await applySubscriptionSnapshot(c.env, {
        customerId: typeof sub.customer === "string" ? sub.customer : undefined,
        subscriptionId: typeof sub.id === "string" ? sub.id : undefined,
        userId: sub.metadata?.userId,
        subscription: sub,
      });
    } else if (eventType === "invoice.payment_failed") {
      const customerId = typeof obj.customer === "string" ? obj.customer : undefined;
      const subId = typeof obj.subscription === "string" ? obj.subscription : undefined;
      const db = createDb(c.env.DB);
      const condition = customerId
        ? eq(tradesmenProfiles.stripeCustomerId, customerId)
        : subId
          ? eq(tradesmenProfiles.stripeSubscriptionId, subId)
          : null;
      if (condition) {
        await db
          .update(tradesmenProfiles)
          .set({ subscriptionStatus: "past_due", updatedAt: new Date() })
          .where(condition);
      }
    }

    return c.json({ received: true });
  })
  .use("/tradesman/*", requireUser, requireTradesman)
  .get("/tradesman", async (c) => {
    const db = createDb(c.env.DB);
    const u = c.get("user");
    const [profile] = await db
      .select()
      .from(tradesmenProfiles)
      .where(eq(tradesmenProfiles.userId, u.id));
    if (!profile) {
      return c.json({ error: { code: "not_found", message: "Tradesman profile not found" } }, 404);
    }
    const tradesmanMonthlyEuros = await getTradesmanMonthlyEuros(db);
    return c.json({
      tradesmanMonthlyEuros,
      firstMonthFreeDays: FIRST_MONTH_FREE_DAYS,
      subscription: {
        status: profile.subscriptionStatus,
        tier: profile.subscriptionTier,
        stripeCustomerId: profile.stripeCustomerId,
        stripeSubscriptionId: profile.stripeSubscriptionId,
        currentPeriodEndMs: profile.stripeCurrentPeriodEnd?.getTime() ?? null,
        trialEndsAtMs: profile.stripeTrialEndsAt?.getTime() ?? null,
      },
    });
  })
  .post("/tradesman/checkout-session", async (c) => {
    const stripeSecret = c.env.STRIPE_SECRET_KEY?.trim();
    if (!stripeSecret) {
      return c.json({ error: { code: "service_unavailable", message: "Stripe is not configured" } }, 503);
    }

    const db = createDb(c.env.DB);
    const u = c.get("user");
    const [profile] = await db.select().from(tradesmenProfiles).where(eq(tradesmenProfiles.userId, u.id));
    if (!profile) {
      return c.json({ error: { code: "not_found", message: "Tradesman profile not found" } }, 404);
    }

    const tradesmanMonthlyEuros = await getTradesmanMonthlyEuros(db);
    const amountCents = centsFromEur(tradesmanMonthlyEuros);
    const origin = appOrigin(c.env, c.req.url);

    const form = new URLSearchParams();
    form.set("mode", "subscription");
    form.set("success_url", `${origin}/dashboard?billing=success`);
    form.set("cancel_url", `${origin}/dashboard?billing=cancelled`);
    form.set("allow_promotion_codes", "true");
    form.set("line_items[0][quantity]", "1");
    form.set("line_items[0][price_data][currency]", "eur");
    form.set("line_items[0][price_data][unit_amount]", String(amountCents));
    form.set("line_items[0][price_data][recurring][interval]", "month");
    form.set("line_items[0][price_data][product_data][name]", "Tradebook tradesman plan");
    form.set("line_items[0][price_data][product_data][description]", "Monthly listing and workflow tools");
    form.set("subscription_data[trial_period_days]", String(FIRST_MONTH_FREE_DAYS));
    form.set("subscription_data[metadata][userId]", u.id);
    form.set("metadata[userId]", u.id);
    form.set("metadata[tier]", SUBSCRIPTION_TIER);
    if (profile.stripeCustomerId) {
      form.set("customer", profile.stripeCustomerId);
    } else {
      form.set("customer_email", u.email);
    }

    try {
      const session = (await stripeFetchJson({
        method: "POST",
        secretKey: stripeSecret,
        path: "/checkout/sessions",
        form,
      })) as { id?: string; url?: string; customer?: string; subscription?: string };

      await db
        .update(tradesmenProfiles)
        .set({
          stripeCustomerId:
            typeof session.customer === "string" ? session.customer : profile.stripeCustomerId,
          stripeSubscriptionId:
            typeof session.subscription === "string" ? session.subscription : profile.stripeSubscriptionId,
          updatedAt: new Date(),
        })
        .where(eq(tradesmenProfiles.userId, u.id));

      if (!session.url) {
        return c.json(
          { error: { code: "stripe_error", message: "Stripe did not return a checkout URL" } },
          502,
        );
      }
      return c.json({ url: session.url, checkoutSessionId: session.id ?? null }, 201);
    } catch (e) {
      return c.json(
        {
          error: {
            code: "stripe_error",
            message: e instanceof Error ? e.message : "Could not create checkout session",
          },
        },
        502,
      );
    }
  })
  .post("/tradesman/portal-session", async (c) => {
    const stripeSecret = c.env.STRIPE_SECRET_KEY?.trim();
    if (!stripeSecret) {
      return c.json({ error: { code: "service_unavailable", message: "Stripe is not configured" } }, 503);
    }
    const db = createDb(c.env.DB);
    const u = c.get("user");
    const [profile] = await db.select().from(tradesmenProfiles).where(eq(tradesmenProfiles.userId, u.id));
    if (!profile?.stripeCustomerId) {
      return c.json(
        {
          error: {
            code: "invalid_state",
            message: "No Stripe customer found. Start checkout first.",
          },
        },
        400,
      );
    }
    const form = new URLSearchParams();
    form.set("customer", profile.stripeCustomerId);
    form.set("return_url", `${appOrigin(c.env, c.req.url)}/dashboard`);
    try {
      const session = (await stripeFetchJson({
        method: "POST",
        secretKey: stripeSecret,
        path: "/billing_portal/sessions",
        form,
      })) as { url?: string };
      if (!session.url) {
        return c.json({ error: { code: "stripe_error", message: "Stripe did not return a portal URL" } }, 502);
      }
      return c.json({ url: session.url }, 201);
    } catch (e) {
      return c.json(
        {
          error: {
            code: "stripe_error",
            message: e instanceof Error ? e.message : "Could not create portal session",
          },
        },
        502,
      );
    }
  });
