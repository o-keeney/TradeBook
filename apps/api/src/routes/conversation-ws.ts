import { and, eq, isNull } from "drizzle-orm";
import type { Context } from "hono";
import { createDb } from "../db/drizzle";
import { users } from "../db/schema";
import type { Env } from "../env";
import { loadConversationForUser } from "../lib/conversation-access";
import { verifyWsTicket } from "../lib/ws-ticket";

export function buildConversationWsUrl(requestUrl: string, ticket: string): string {
  const u = new URL(requestUrl);
  const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${u.host}/api/conversations/ws?ticket=${encodeURIComponent(ticket)}`;
}

/**
 * WebSocket upgrade for message threads. Auth is a short-lived HMAC ticket from
 * `POST /api/conversations/:id/ws-ticket` (cookie session) so the browser can connect
 * directly to the API origin (Next.js rewrites do not proxy WebSockets).
 */
export async function handleConversationWebSocket(
  c: Context<{ Bindings: Env }>,
): Promise<Response> {
  const secret = c.env.WEBSOCKET_TICKET_SECRET?.trim();
  if (!secret) {
    return c.json({ error: { code: "disabled", message: "Realtime is not configured" } }, 503);
  }

  if (c.req.header("Upgrade") !== "websocket") {
    return c.text("Expected Upgrade: websocket", 426);
  }

  const ticket = c.req.query("ticket")?.trim();
  if (!ticket) {
    return c.json({ error: { code: "unauthorized", message: "Missing ticket" } }, 401);
  }

  const payload = await verifyWsTicket(secret, ticket);
  if (!payload) {
    return c.json({ error: { code: "unauthorized", message: "Invalid or expired ticket" } }, 401);
  }

  const db = createDb(c.env.DB);
  const userRow = await db
    .select()
    .from(users)
    .where(and(eq(users.id, payload.u), isNull(users.deletedAt)))
    .get();
  if (!userRow) {
    return c.json({ error: { code: "unauthorized", message: "Invalid ticket" } }, 401);
  }

  const { conversation } = await loadConversationForUser(db, payload.c, userRow);
  if (!conversation || conversation.id !== payload.c) {
    return c.json({ error: { code: "forbidden", message: "No access to this thread" } }, 403);
  }

  const doId = c.env.CONVERSATION_ROOM.idFromName(conversation.id);
  const stub = c.env.CONVERSATION_ROOM.get(doId);
  return stub.fetch(c.req.raw);
}
