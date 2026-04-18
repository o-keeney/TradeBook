import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db/drizzle";
import { reviews, workOrders } from "../db/schema";
import type { Env } from "../env";
import { refreshTradesmanReviewAggregate } from "../lib/review-stats";
import type { UserRow } from "../lib/public-user";
import { canViewWorkOrder } from "../lib/work-order-access";
import { requireCustomer } from "../middleware/customer";
import { requireEmailVerifiedForMutations } from "../middleware/email-verified";
import { requireUser } from "../middleware/session";

const postReviewSchema = z.object({
  workOrderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const reviewRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: UserRow };
}>()
  .use(requireUser)
  .get("/for-work-order/:workOrderId", async (c) => {
    const user = c.get("user");
    const workOrderId = c.req.param("workOrderId");
    const db = createDb(c.env.DB);

    const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, workOrderId));
    if (!wo) {
      return c.json({ error: { code: "not_found", message: "Work order not found" } }, 404);
    }
    if (!canViewWorkOrder(user, wo)) {
      return c.json({ error: { code: "forbidden", message: "You cannot view this work order" } }, 403);
    }

    if (user.role !== "customer" || user.id !== wo.customerId) {
      return c.json({ review: null, canReview: false });
    }

    const [existing] = await db.select().from(reviews).where(eq(reviews.workOrderId, workOrderId));

    const canReview =
      wo.status === "completed" &&
      wo.assignedTradesmanId != null &&
      wo.assignedTradesmanId.length > 0 &&
      !existing;

    if (!existing) {
      return c.json({
        review: null,
        canReview,
        tradesmanId: wo.assignedTradesmanId,
      });
    }

    return c.json({
      review: {
        id: existing.id,
        rating: existing.rating,
        comment: existing.comment,
        createdAt: existing.createdAt.getTime(),
        tradesmanId: existing.tradesmanId,
      },
      canReview: false,
      tradesmanId: existing.tradesmanId,
    });
  })
  .post("/", requireEmailVerifiedForMutations, requireCustomer, async (c) => {
    let body: z.infer<typeof postReviewSchema>;
    try {
      body = postReviewSchema.parse(await c.req.json());
    } catch (e) {
      if (e instanceof z.ZodError) {
        return c.json(
          { error: { code: "validation_error", message: "Invalid request", details: e.flatten() } },
          400,
        );
      }
      throw e;
    }

    const user = c.get("user");
    const db = createDb(c.env.DB);

    const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, body.workOrderId));
    if (!wo) {
      return c.json({ error: { code: "not_found", message: "Work order not found" } }, 404);
    }
    if (wo.customerId !== user.id) {
      return c.json(
        { error: { code: "forbidden", message: "Only the customer who posted this job may review it" } },
        403,
      );
    }
    if (wo.status !== "completed") {
      return c.json(
        { error: { code: "invalid_state", message: "You can only review after the job is marked completed" } },
        400,
      );
    }
    if (!wo.assignedTradesmanId) {
      return c.json(
        { error: { code: "invalid_state", message: "This job has no assigned tradesman to review" } },
        400,
      );
    }

    const commentTrim =
      body.comment !== undefined ? (body.comment.trim() === "" ? null : body.comment.trim()) : null;

    const id = crypto.randomUUID();
    try {
      await db.insert(reviews).values({
        id,
        workOrderId: wo.id,
        reviewerId: user.id,
        tradesmanId: wo.assignedTradesmanId,
        rating: body.rating,
        comment: commentTrim,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("UNIQUE") || msg.includes("unique")) {
        return c.json(
          { error: { code: "conflict", message: "A review for this job already exists" } },
          409,
        );
      }
      throw err;
    }

    await refreshTradesmanReviewAggregate(db, wo.assignedTradesmanId);

    const [row] = await db.select().from(reviews).where(eq(reviews.id, id));
    if (!row) {
      return c.json({ error: { code: "server_error", message: "Review was not persisted" } }, 500);
    }

    return c.json(
      {
        review: {
          id: row.id,
          workOrderId: row.workOrderId,
          rating: row.rating,
          comment: row.comment,
          createdAt: row.createdAt.getTime(),
          tradesmanId: row.tradesmanId,
        },
      },
      201,
    );
  });
