import { and, asc, count, desc, eq, gt, inArray, ne, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { createDb } from "../db/drizzle";
import {
  conversationMessages,
  conversationReadStates,
  conversations,
  workOrders,
} from "../db/schema";
import type { Env } from "../env";
import {
  ensureConversationRow,
  loadConversationForUser,
} from "../lib/conversation-access";
import { broadcastConversationEvent } from "../lib/conversation-realtime";
import type { UserRow } from "../lib/public-user";
import { canPostJobMessage } from "../lib/work-order-access";
import { signWsTicket } from "../lib/ws-ticket";
import { requireEmailVerifiedForMutations } from "../middleware/email-verified";
import { requireSmsVerifiedForMutations } from "../middleware/sms-verified-for-mutations";
import { requireUser } from "../middleware/session";
import { buildConversationWsUrl } from "./conversation-ws";

const postMessageSchema = z.object({
  body: z.string().trim().min(1).max(8000),
});

const postReadSchema = z.object({
  /** If omitted, marks all messages as read (uses latest message time). */
  readThroughMessageId: z.string().uuid().optional(),
});

export const conversationRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: UserRow };
}>()
  .use(requireUser)
  .use(requireEmailVerifiedForMutations)
  .use(requireSmsVerifiedForMutations)
  .get("/", async (c) => {
    const u = c.get("user");
    const db = createDb(c.env.DB);

    const rows = await db
      .select({ c: conversations, wo: workOrders })
      .from(conversations)
      .innerJoin(workOrders, eq(conversations.workOrderId, workOrders.id))
      .where(
        or(eq(workOrders.customerId, u.id), eq(workOrders.assignedTradesmanId, u.id)),
      )
      .orderBy(desc(conversations.updatedAt));

    const convIds = rows.map((r) => r.c.id);
    const readRows =
      convIds.length > 0
        ? await db
            .select()
            .from(conversationReadStates)
            .where(
              and(
                eq(conversationReadStates.userId, u.id),
                inArray(conversationReadStates.conversationId, convIds),
              ),
            )
        : [];
    const readByConv = new Map(readRows.map((r) => [r.conversationId, r.lastReadAt]));

    const list = await Promise.all(
      rows.map(async ({ c, wo }) => {
        const lastReadAt = readByConv.get(c.id) ?? new Date(0);
        const [unreadRow] = await db
          .select({ n: count() })
          .from(conversationMessages)
          .where(
            and(
              eq(conversationMessages.conversationId, c.id),
              ne(conversationMessages.authorId, u.id),
              gt(conversationMessages.createdAt, lastReadAt),
            ),
          );
        const [lastMsg] = await db
          .select()
          .from(conversationMessages)
          .where(eq(conversationMessages.conversationId, c.id))
          .orderBy(desc(conversationMessages.createdAt))
          .limit(1);

        return {
          id: c.id,
          workOrderId: c.workOrderId,
          workOrderTitle: wo.title,
          updatedAt: c.updatedAt.getTime(),
          unreadCount: unreadRow?.n ?? 0,
          lastMessagePreview: lastMsg
            ? {
                authorId: lastMsg.authorId,
                body: lastMsg.body.slice(0, 160),
                createdAt: lastMsg.createdAt.getTime(),
              }
            : null,
        };
      }),
    );

    return c.json({ conversations: list });
  })
  .post("/", async (c) => {
    const u = c.get("user");
    const body = z.object({ workOrderId: z.string().uuid() }).safeParse(await c.req.json());
    if (!body.success) {
      return c.json({ error: { code: "validation_error", details: body.error.flatten() } }, 400);
    }

    const db = createDb(c.env.DB);
    const { wo, conversation } = await ensureConversationRow(db, body.data.workOrderId, u);
    if (!wo || !conversation) {
      return c.json(
        { error: { code: "forbidden", message: "Cannot start a conversation for this job" } },
        403,
      );
    }

    return c.json({ conversation: { id: conversation.id, workOrderId: conversation.workOrderId } }, 201);
  })
  .get("/by-work-order/:workOrderId", async (c) => {
    const workOrderId = c.req.param("workOrderId");
    const u = c.get("user");
    const db = createDb(c.env.DB);

    const { wo, conversation } = await ensureConversationRow(db, workOrderId, u);
    if (!wo || !conversation) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }

    return c.json({
      conversation: {
        id: conversation.id,
        workOrderId: conversation.workOrderId,
        canPost: canPostJobMessage(u, wo),
      },
    });
  })
  .post("/:id/ws-ticket", async (c) => {
    const convId = c.req.param("id");
    const u = c.get("user");
    const secret = c.env.WEBSOCKET_TICKET_SECRET?.trim();
    if (!secret) {
      return c.json({ error: { code: "disabled", message: "Realtime is not configured" } }, 503);
    }

    const db = createDb(c.env.DB);
    const { conversation, wo } = await loadConversationForUser(db, convId, u);
    if (!conversation || !wo) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }

    const exp = Math.floor(Date.now() / 1000) + 90;
    const ticket = await signWsTicket(secret, { u: u.id, c: conversation.id, exp });
    const wsUrl = buildConversationWsUrl(c.req.url, ticket);
    return c.json({ wsUrl, expiresAt: exp * 1000 });
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const u = c.get("user");
    const db = createDb(c.env.DB);

    const { conversation, wo } = await loadConversationForUser(db, id, u);
    if (!conversation || !wo) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }

    return c.json({
      conversation: {
        id: conversation.id,
        workOrderId: conversation.workOrderId,
        workOrderTitle: wo.title,
        canPost: canPostJobMessage(u, wo),
        updatedAt: conversation.updatedAt.getTime(),
      },
    });
  })
  .get("/:id/messages", async (c) => {
    const id = c.req.param("id");
    const u = c.get("user");
    const db = createDb(c.env.DB);

    const { conversation, wo } = await loadConversationForUser(db, id, u);
    if (!conversation || !wo) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }

    const limitRaw = c.req.query("limit");
    let limit = 100;
    if (limitRaw) {
      const n = Number.parseInt(limitRaw, 10);
      if (Number.isFinite(n)) limit = Math.min(200, Math.max(1, n));
    }

    const msgs = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, id))
      .orderBy(asc(conversationMessages.createdAt))
      .limit(limit);

    return c.json({
      messages: msgs.map((m) => ({
        id: m.id,
        authorId: m.authorId,
        body: m.body,
        createdAt: m.createdAt.getTime(),
      })),
    });
  })
  .post("/:id/messages", async (c) => {
    const id = c.req.param("id");
    const u = c.get("user");
    let body: z.infer<typeof postMessageSchema>;
    try {
      body = postMessageSchema.parse(await c.req.json());
    } catch (e) {
      if (e instanceof z.ZodError) {
        return c.json({ error: { code: "validation_error", details: e.flatten() } }, 400);
      }
      throw e;
    }

    const db = createDb(c.env.DB);
    const { conversation, wo } = await loadConversationForUser(db, id, u);
    if (!conversation || !wo) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }

    if (!canPostJobMessage(u, wo)) {
      return c.json(
        { error: { code: "conflict", message: "Messaging is closed for this job" } },
        409,
      );
    }

    const msgId = crypto.randomUUID();
    const now = new Date();
    await db.insert(conversationMessages).values({
      id: msgId,
      conversationId: id,
      authorId: u.id,
      body: body.body,
      createdAt: now,
    });

    await db
      .update(conversations)
      .set({ updatedAt: now })
      .where(eq(conversations.id, id));

    const [row] = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.id, msgId));

    if (row) {
      await broadcastConversationEvent(c.env, id, {
        type: "message",
        message: {
          id: row.id,
          authorId: row.authorId,
          body: row.body,
          createdAt: row.createdAt.getTime(),
        },
      });
    }

    return c.json(
      {
        message: row
          ? {
              id: row.id,
              authorId: row.authorId,
              body: row.body,
              createdAt: row.createdAt.getTime(),
            }
          : null,
      },
      201,
    );
  })
  .post("/:id/read", async (c) => {
    const id = c.req.param("id");
    const u = c.get("user");
    let body: z.infer<typeof postReadSchema>;
    try {
      body = postReadSchema.parse(await c.req.json().catch(() => ({})));
    } catch (e) {
      if (e instanceof z.ZodError) {
        return c.json({ error: { code: "validation_error", details: e.flatten() } }, 400);
      }
      throw e;
    }

    const db = createDb(c.env.DB);
    const { conversation, wo } = await loadConversationForUser(db, id, u);
    if (!conversation || !wo) {
      return c.json({ error: { code: "not_found", message: "Not found" } }, 404);
    }

    let readAt = new Date();
    if (body.readThroughMessageId) {
      const [m] = await db
        .select()
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.id, body.readThroughMessageId),
            eq(conversationMessages.conversationId, id),
          ),
        );
      if (m) readAt = m.createdAt;
    } else {
      const [last] = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, id))
        .orderBy(desc(conversationMessages.createdAt))
        .limit(1);
      if (last) readAt = last.createdAt;
    }

    await db
      .insert(conversationReadStates)
      .values({
        conversationId: id,
        userId: u.id,
        lastReadAt: readAt,
      })
      .onConflictDoUpdate({
        target: [conversationReadStates.conversationId, conversationReadStates.userId],
        set: { lastReadAt: readAt },
      });

    return c.json({ ok: true, lastReadAt: readAt.getTime() });
  });
