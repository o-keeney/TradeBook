import { and, asc, desc, eq, ne, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db/drizzle";
import {
  bidsQuotes,
  jobUpdates,
  jobWorkMedia,
  plannerTasks,
  users,
  workOrders,
} from "../db/schema";
import type { Env } from "../env";
import type { UserRow } from "../lib/public-user";
import { requireCustomer } from "../middleware/customer";
import { requireEmailVerifiedForMutations } from "../middleware/email-verified";
import { requireTradesman } from "../middleware/tradesman";
import { requireUser } from "../middleware/session";
import {
  canMutatePlanner,
  canTransitionStatus,
  canUploadJobMedia,
  canViewWorkOrder,
  isJobParticipant,
} from "../lib/work-order-access";
import {
  notifyCustomerDirectJobResponse,
  notifyCustomerNewBid,
  notifyPeerWorkOrderStatus,
  notifyTradesmanBidAccepted,
  notifyTradesmanDirectJobAssigned,
  scheduleWorkOrderEmail,
} from "../lib/work-order-email-notify";

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

const plannerColumnSchema = z.enum(["todo", "in_progress", "done", "blocked"]);

const postPlannerTaskSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(8000).optional(),
  columnKey: plannerColumnSchema.optional(),
  sortOrder: z.number().int().optional(),
});

const patchPlannerTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(8000).nullable().optional(),
  columnKey: plannerColumnSchema.optional(),
  sortOrder: z.number().int().optional(),
});

/** Same caps as portfolio uploads (client compression expected). */
const MAX_JOB_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_JOB_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export const workOrderRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: UserRow };
}>()
  .use(requireUser)
  .use(requireEmailVerifiedForMutations)
  .get("/media/:mediaId/file", async (c) => {
    const mediaId = c.req.param("mediaId");
    const u = c.get("user");
    const bucket = c.env.MEDIA_BUCKET;
    if (!bucket) {
      return c.json(
        { error: { code: "service_unavailable", message: "Media storage not configured" } },
        503,
      );
    }

    const db = createDb(c.env.DB);
    const [row] = await db.select().from(jobWorkMedia).where(eq(jobWorkMedia.id, mediaId));
    if (!row) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }

    const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, row.workOrderId));
    if (!wo || !canViewWorkOrder(u, wo)) {
      return c.json({ error: { code: "forbidden", message: "Forbidden" } }, 403);
    }

    const obj = await bucket.get(row.r2Key);
    if (!obj) {
      return c.json({ error: { code: "not_found", message: "Object missing" } }, 404);
    }

    const ct = obj.httpMetadata?.contentType ?? row.mimeType;
    return new Response(obj.body, {
      headers: {
        "Content-Type": ct,
        "Cache-Control": "private, max-age=3600",
      },
    });
  })
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
              or(
                eq(workOrders.status, "open_bidding"),
                eq(workOrders.status, "quotes_submitted"),
              ),
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
    if (row?.assignedTradesmanId) {
      scheduleWorkOrderEmail(c.env, () => notifyTradesmanDirectJobAssigned(c.env, db, row), "direct_job");
    }
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
      ![
        "pending",
        "open_bidding",
        "quotes_submitted",
        "accepted",
        "in_progress",
        "awaiting_info",
      ].includes(wo.status)
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
    if (row) {
      scheduleWorkOrderEmail(
        c.env,
        () => notifyPeerWorkOrderStatus(c.env, db, row, "cancelled", u.id),
        "job_cancelled",
      );
    }
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
    if (row) {
      scheduleWorkOrderEmail(
        c.env,
        () => notifyCustomerDirectJobResponse(c.env, db, row, row.status === "accepted"),
        "direct_respond",
      );
    }
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

    if (
      wo.submissionType !== "open_bid" ||
      (wo.status !== "open_bidding" && wo.status !== "quotes_submitted")
    ) {
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

    if (wo.status === "open_bidding") {
      const nowQs = new Date();
      await db
        .update(workOrders)
        .set({ status: "quotes_submitted", updatedAt: nowQs })
        .where(eq(workOrders.id, id));
    }

    scheduleWorkOrderEmail(c.env, () => notifyCustomerNewBid(c.env, db, wo, u.id), "new_bid");
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

    if (
      wo.submissionType !== "open_bid" ||
      (wo.status !== "open_bidding" && wo.status !== "quotes_submitted")
    ) {
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
    if (row) {
      scheduleWorkOrderEmail(
        c.env,
        () => notifyTradesmanBidAccepted(c.env, db, row, bid.tradesmanId),
        "bid_awarded",
      );
    }
    return c.json({ workOrder: row });
  })
  .post("/:id/reject-bidding", requireCustomer, async (c) => {
    const id = c.req.param("id");
    const u = c.get("user");
    const db = createDb(c.env.DB);

    const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    if (!wo || wo.customerId !== u.id) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }

    if (
      wo.submissionType !== "open_bid" ||
      (wo.status !== "open_bidding" && wo.status !== "quotes_submitted")
    ) {
      return c.json(
        { error: { code: "conflict", message: "This job is not awaiting quotes" } },
        409,
      );
    }

    const now = new Date();
    await db
      .update(bidsQuotes)
      .set({ status: "rejected" })
      .where(
        and(eq(bidsQuotes.workOrderId, id), eq(bidsQuotes.status, "submitted")),
      );

    await db
      .update(workOrders)
      .set({ status: "customer_rejected", updatedAt: now })
      .where(eq(workOrders.id, id));

    const [row] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    return c.json({ workOrder: row });
  })
  .get("/:id/planner", async (c) => {
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

    const tasks = await db
      .select()
      .from(plannerTasks)
      .where(eq(plannerTasks.workOrderId, id))
      .orderBy(asc(plannerTasks.columnKey), asc(plannerTasks.sortOrder), asc(plannerTasks.createdAt));

    return c.json({ tasks });
  })
  .post("/:id/planner", requireTradesman, async (c) => {
    const id = c.req.param("id");
    const u = c.get("user");
    let body: z.infer<typeof postPlannerTaskSchema>;
    try {
      body = postPlannerTaskSchema.parse(await c.req.json());
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
    if (!canMutatePlanner(u, wo)) {
      return c.json({ error: { code: "forbidden", message: "Forbidden" } }, 403);
    }

    const col = body.columnKey ?? "todo";
    const [mx] = await db
      .select({ s: plannerTasks.sortOrder })
      .from(plannerTasks)
      .where(and(eq(plannerTasks.workOrderId, id), eq(plannerTasks.columnKey, col)))
      .orderBy(desc(plannerTasks.sortOrder))
      .limit(1);
    const sortOrder =
      body.sortOrder ?? (typeof mx?.s === "number" ? mx.s + 1 : 0);

    const taskId = crypto.randomUUID();
    const now = new Date();
    await db.insert(plannerTasks).values({
      id: taskId,
      workOrderId: id,
      columnKey: col,
      title: body.title,
      body: body.body ?? null,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    });

    const [row] = await db.select().from(plannerTasks).where(eq(plannerTasks.id, taskId));
    return c.json({ task: row }, 201);
  })
  .patch("/:id/planner/:taskId", requireTradesman, async (c) => {
    const id = c.req.param("id");
    const taskId = c.req.param("taskId");
    const u = c.get("user");
    let body: z.infer<typeof patchPlannerTaskSchema>;
    try {
      body = patchPlannerTaskSchema.parse(await c.req.json());
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
    if (!canMutatePlanner(u, wo)) {
      return c.json({ error: { code: "forbidden", message: "Forbidden" } }, 403);
    }

    const [existing] = await db
      .select()
      .from(plannerTasks)
      .where(and(eq(plannerTasks.id, taskId), eq(plannerTasks.workOrderId, id)));
    if (!existing) {
      return c.json({ error: { code: "not_found", message: "Task not found" } }, 404);
    }

    const now = new Date();
    const set: Partial<typeof plannerTasks.$inferInsert> = { updatedAt: now };
    if (body.title !== undefined) set.title = body.title;
    if (body.body !== undefined) set.body = body.body;
    if (body.columnKey !== undefined) set.columnKey = body.columnKey;
    if (body.sortOrder !== undefined) set.sortOrder = body.sortOrder;

    await db.update(plannerTasks).set(set).where(eq(plannerTasks.id, taskId));

    const [row] = await db.select().from(plannerTasks).where(eq(plannerTasks.id, taskId));
    return c.json({ task: row });
  })
  .post("/:id/media", async (c) => {
    const id = c.req.param("id");
    const u = c.get("user");
    const bucket = c.env.MEDIA_BUCKET;
    if (!bucket) {
      return c.json(
        { error: { code: "service_unavailable", message: "Media storage not configured" } },
        503,
      );
    }

    const db = createDb(c.env.DB);
    const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    if (!wo) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }
    if (!canUploadJobMedia(u, wo)) {
      return c.json({ error: { code: "forbidden", message: "Forbidden" } }, 403);
    }

    const form = await c.req.formData();
    const raw = form.get("file");
    if (raw === null || typeof raw === "string") {
      return c.json(
        { error: { code: "validation_error", message: 'Expected multipart field "file"' } },
        400,
      );
    }
    const file = raw as Blob & { name?: string };

    if (!ALLOWED_JOB_IMAGE_MIME.has(file.type)) {
      return c.json(
        {
          error: {
            code: "validation_error",
            message: `Unsupported type. Use: ${[...ALLOWED_JOB_IMAGE_MIME].join(", ")}`,
          },
        },
        400,
      );
    }

    if (file.size > MAX_JOB_IMAGE_BYTES) {
      return c.json(
        { error: { code: "validation_error", message: "File exceeds 5MB limit" } },
        400,
      );
    }

    const mediaId = crypto.randomUUID();
    const ext = jobMediaExtensionFromMime(file.type);
    const safeName = sanitizeJobFilename(
      typeof file.name === "string" ? file.name : "image",
    );
    const r2Key = `job-media/${id}/${mediaId}-${safeName}${ext}`;

    const buf = await file.arrayBuffer();
    await bucket.put(r2Key, buf, {
      httpMetadata: { contentType: file.type },
    });

    const now = new Date();
    await db.insert(jobWorkMedia).values({
      id: mediaId,
      workOrderId: id,
      uploadedByUserId: u.id,
      r2Key,
      mimeType: file.type,
      sizeBytes: file.size,
      createdAt: now,
    });

    await db.update(workOrders).set({ updatedAt: now }).where(eq(workOrders.id, id));

    const urlPath = `/api/work-orders/media/${mediaId}/file`;
    return c.json({ media: { id: mediaId, url: urlPath, mimeType: file.type, sizeBytes: file.size } }, 201);
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

    if (["completed", "cancelled", "declined", "customer_rejected"].includes(wo.status)) {
      return c.json(
        { error: { code: "conflict", message: "Job is closed" } },
        409,
      );
    }

    const canPost =
      ((wo.status === "open_bidding" || wo.status === "quotes_submitted") &&
        wo.customerId === u.id) ||
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
    if (row) {
      scheduleWorkOrderEmail(
        c.env,
        () => notifyPeerWorkOrderStatus(c.env, db, row, body.status, u.id),
        "status_change",
      );
    }
    return c.json({ workOrder: row });
  });

function sanitizeJobFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "image";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "image";
}

function jobMediaExtensionFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/avif":
      return ".avif";
    default:
      return "";
  }
}
