import { and, asc, desc, eq, ne, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db/drizzle";
import {
  bidsQuotes,
  jobUpdates,
  users,
  workOrders,
} from "../db/schema";
import type { Env } from "../env";
import type { UserRow } from "../lib/public-user";
import { requireCustomer } from "../middleware/customer";
import { requireTradesman } from "../middleware/tradesman";
import { requireUser } from "../middleware/session";
import {
  canTransitionStatus,
  canViewWorkOrder,
  isJobParticipant,
} from "../lib/work-order-access";

const createWorkOrderSchema = z
  .object({
    submissionType: z.enum(["direct", "open_bid"]),
    tradeCategory: z.string().min(1).max(120),
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(20_000),
    dimensions: z.record(z.unknown()).optional(),
    locationAddress: z.string().min(1).max(500),
    locationPostcode: z.string().min(1).max(20),
    dueDate: z.string().datetime().optional(),
    assignedTradesmanId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.submissionType === "direct" && !data.assignedTradesmanId) {
      ctx.addIssue({
        code: "custom",
        message: "direct jobs require assignedTradesmanId",
        path: ["assignedTradesmanId"],
      });
    }
    if (data.submissionType === "open_bid" && data.assignedTradesmanId) {
      ctx.addIssue({
        code: "custom",
        message: "open_bid jobs must not include assignedTradesmanId",
        path: ["assignedTradesmanId"],
      });
    }
  });

const bidSchema = z.object({
  estimatedCost: z.number().nonnegative().nullable().optional(),
  estimatedTimeline: z.string().max(500).optional(),
  notes: z.string().max(4000).optional(),
});

const awardSchema = z.object({
  bidId: z.string().uuid(),
});

const respondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

const postUpdateSchema = z.object({
  updateType: z.enum([
    "status_change",
    "progress_note",
    "media_upload",
    "quote_update",
  ]),
  content: z.string().max(8000).optional(),
  mediaUrls: z.array(z.string().max(512)).max(20).optional(),
});

const putStatusSchema = z.object({
  status: z.enum([
    "in_progress",
    "awaiting_info",
    "completed",
    "cancelled",
  ]),
});

export const workOrderRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: UserRow };
}>()
  .use(requireUser)
  .get("/", async (c) => {
    const u = c.get("user");
    const db = createDb(c.env.DB);

    if (u.role === "customer") {
      const rows = await db
        .select()
        .from(workOrders)
        .where(eq(workOrders.customerId, u.id))
        .orderBy(desc(workOrders.createdAt));
      return c.json({ workOrders: rows });
    }

    if (u.role === "tradesman") {
      const rows = await db
        .select()
        .from(workOrders)
        .where(
          or(
            eq(workOrders.assignedTradesmanId, u.id),
            and(
              eq(workOrders.submissionType, "open_bid"),
              eq(workOrders.status, "open_bidding"),
            ),
          ),
        )
        .orderBy(desc(workOrders.createdAt));
      return c.json({ workOrders: rows });
    }

    return c.json({ workOrders: [] as (typeof workOrders.$inferSelect)[] });
  })
  .post("/", requireCustomer, async (c) => {
    let body: z.infer<typeof createWorkOrderSchema>;
    try {
      body = createWorkOrderSchema.parse(await c.req.json());
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
    const customer = c.get("user");

    if (body.submissionType === "direct" && body.assignedTradesmanId) {
      const [assignee] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, body.assignedTradesmanId),
            eq(users.role, "tradesman"),
          ),
        );
      if (!assignee) {
        return c.json(
          { error: { code: "validation_error", message: "Invalid tradesman" } },
          400,
        );
      }
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const status =
      body.submissionType === "direct" ? "pending" : "open_bidding";
    const assigned =
      body.submissionType === "direct" ? body.assignedTradesmanId! : null;

    await db.insert(workOrders).values({
      id,
      customerId: customer.id,
      assignedTradesmanId: assigned,
      tradeCategory: body.tradeCategory,
      title: body.title,
      description: body.description,
      dimensionsJson: (body.dimensions ?? {}) as Record<string, unknown>,
      locationAddress: body.locationAddress,
      locationPostcode: body.locationPostcode,
      submissionType: body.submissionType,
      status,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      createdAt: now,
      updatedAt: now,
    });

    const [row] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    return c.json({ workOrder: row }, 201);
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const u = c.get("user");
    const db = createDb(c.env.DB);

    const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    if (!wo) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }

    if (!canViewWorkOrder(u, wo)) {
      return c.json({ error: { code: "forbidden", message: "Forbidden" } }, 403);
    }

    return c.json({ workOrder: wo });
  })
  .post("/:id/cancel", requireCustomer, async (c) => {
    const id = c.req.param("id");
    const u = c.get("user");
    const db = createDb(c.env.DB);

    const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    if (!wo || wo.customerId !== u.id) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }

    if (
      !["pending", "open_bidding", "accepted", "in_progress", "awaiting_info"].includes(
        wo.status,
      )
    ) {
      return c.json(
        { error: { code: "conflict", message: "Cannot cancel this job" } },
        409,
      );
    }

    const now = new Date();
    await db
      .update(workOrders)
      .set({ status: "cancelled", updatedAt: now })
      .where(eq(workOrders.id, id));

    const [row] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    return c.json({ workOrder: row });
  })
  .post("/:id/respond", requireTradesman, async (c) => {
    const id = c.req.param("id");
    const u = c.get("user");
    let body: z.infer<typeof respondSchema>;
    try {
      body = respondSchema.parse(await c.req.json());
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
    const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    if (!wo) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }

    if (wo.submissionType !== "direct" || wo.status !== "pending") {
      return c.json(
        { error: { code: "conflict", message: "Nothing to respond to" } },
        409,
      );
    }

    if (wo.assignedTradesmanId !== u.id) {
      return c.json({ error: { code: "forbidden", message: "Forbidden" } }, 403);
    }

    const now = new Date();
    const nextStatus = body.action === "accept" ? "accepted" : "declined";
    await db
      .update(workOrders)
      .set({ status: nextStatus, updatedAt: now })
      .where(eq(workOrders.id, id));

    const [row] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    return c.json({ workOrder: row });
  })
  .post("/:id/bids", requireTradesman, async (c) => {
    const id = c.req.param("id");
    const u = c.get("user");
    let body: z.infer<typeof bidSchema>;
    try {
      body = bidSchema.parse(await c.req.json());
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
    const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    if (!wo) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }

    if (wo.status !== "open_bidding" || wo.submissionType !== "open_bid") {
      return c.json(
        { error: { code: "conflict", message: "Bidding is not open" } },
        409,
      );
    }

    if (wo.customerId === u.id) {
      return c.json(
        { error: { code: "forbidden", message: "You cannot bid on your own job" } },
        403,
      );
    }

    const bidId = crypto.randomUUID();
    try {
      await db.insert(bidsQuotes).values({
        id: bidId,
        workOrderId: id,
        tradesmanId: u.id,
        estimatedCost: body.estimatedCost ?? null,
        estimatedTimeline: body.estimatedTimeline ?? null,
        notes: body.notes ?? null,
        status: "submitted",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("UNIQUE") || msg.includes("unique")) {
        return c.json(
          { error: { code: "conflict", message: "You already submitted a bid" } },
          409,
        );
      }
      throw err;
    }

    const [bid] = await db.select().from(bidsQuotes).where(eq(bidsQuotes.id, bidId));
    return c.json({ bid }, 201);
  })
  .get("/:id/bids", requireCustomer, async (c) => {
    const id = c.req.param("id");
    const u = c.get("user");
    const db = createDb(c.env.DB);

    const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    if (!wo || wo.customerId !== u.id) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }

    if (wo.submissionType !== "open_bid") {
      return c.json({ error: { code: "conflict", message: "No bids on direct jobs" } }, 409);
    }

    const bids = await db
      .select()
      .from(bidsQuotes)
      .where(eq(bidsQuotes.workOrderId, id))
      .orderBy(desc(bidsQuotes.createdAt));

    return c.json({ bids });
  })
  .post("/:id/award", requireCustomer, async (c) => {
    const id = c.req.param("id");
    const u = c.get("user");
    let body: z.infer<typeof awardSchema>;
    try {
      body = awardSchema.parse(await c.req.json());
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
    const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    if (!wo || wo.customerId !== u.id) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }

    if (wo.submissionType !== "open_bid" || wo.status !== "open_bidding") {
      return c.json(
        { error: { code: "conflict", message: "Job is not open for award" } },
        409,
      );
    }

    const [bid] = await db
      .select()
      .from(bidsQuotes)
      .where(
        and(eq(bidsQuotes.id, body.bidId), eq(bidsQuotes.workOrderId, id)),
      );

    if (!bid || bid.status !== "submitted") {
      return c.json({ error: { code: "not_found", message: "Bid not found" } }, 404);
    }

    const now = new Date();
    await db
      .update(bidsQuotes)
      .set({ status: "rejected" })
      .where(
        and(eq(bidsQuotes.workOrderId, id), ne(bidsQuotes.id, body.bidId)),
      );

    await db
      .update(bidsQuotes)
      .set({ status: "accepted" })
      .where(eq(bidsQuotes.id, body.bidId));

    await db
      .update(workOrders)
      .set({
        status: "accepted",
        assignedTradesmanId: bid.tradesmanId,
        updatedAt: now,
      })
      .where(eq(workOrders.id, id));

    const [row] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    return c.json({ workOrder: row });
  })
  .get("/:id/timeline", async (c) => {
    const id = c.req.param("id");
    const u = c.get("user");
    const db = createDb(c.env.DB);

    const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    if (!wo) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }

    if (!canViewWorkOrder(u, wo)) {
      return c.json({ error: { code: "forbidden", message: "Forbidden" } }, 403);
    }

    const updates = await db
      .select()
      .from(jobUpdates)
      .where(eq(jobUpdates.workOrderId, id))
      .orderBy(asc(jobUpdates.createdAt));

    return c.json({ updates });
  })
  .post("/:id/updates", async (c) => {
    const id = c.req.param("id");
    const u = c.get("user");
    let body: z.infer<typeof postUpdateSchema>;
    try {
      body = postUpdateSchema.parse(await c.req.json());
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
    const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    if (!wo) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }

    if (["completed", "cancelled", "declined"].includes(wo.status)) {
      return c.json(
        { error: { code: "conflict", message: "Job is closed" } },
        409,
      );
    }

    const canPost =
      (wo.status === "open_bidding" && wo.customerId === u.id) ||
      (["accepted", "in_progress", "awaiting_info"].includes(wo.status) &&
        isJobParticipant(u, wo));

    if (!canPost) {
      return c.json({ error: { code: "forbidden", message: "Forbidden" } }, 403);
    }

    const updateId = crypto.randomUUID();
    const now = new Date();
    await db.insert(jobUpdates).values({
      id: updateId,
      workOrderId: id,
      authorId: u.id,
      updateType: body.updateType,
      content: body.content ?? null,
      mediaUrls: body.mediaUrls ?? [],
      createdAt: now,
    });

    await db
      .update(workOrders)
      .set({ updatedAt: now })
      .where(eq(workOrders.id, id));

    const [row] = await db.select().from(jobUpdates).where(eq(jobUpdates.id, updateId));
    return c.json({ update: row }, 201);
  })
  .put("/:id/status", async (c) => {
    const id = c.req.param("id");
    const u = c.get("user");
    let body: z.infer<typeof putStatusSchema>;
    try {
      body = putStatusSchema.parse(await c.req.json());
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
    const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    if (!wo) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }

    if (!isJobParticipant(u, wo)) {
      return c.json({ error: { code: "forbidden", message: "Forbidden" } }, 403);
    }

    if (!canTransitionStatus(wo.status, body.status)) {
      return c.json(
        {
          error: {
            code: "conflict",
            message: `Cannot move from ${wo.status} to ${body.status}`,
          },
        },
        409,
      );
    }

    const now = new Date();
    const prev = wo.status;
    await db
      .update(workOrders)
      .set({ status: body.status, updatedAt: now })
      .where(eq(workOrders.id, id));

    const juId = crypto.randomUUID();
    await db.insert(jobUpdates).values({
      id: juId,
      workOrderId: id,
      authorId: u.id,
      updateType: "status_change",
      content: JSON.stringify({ from: prev, to: body.status }),
      mediaUrls: [],
      createdAt: now,
    });

    const [row] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    return c.json({ workOrder: row });
  });
