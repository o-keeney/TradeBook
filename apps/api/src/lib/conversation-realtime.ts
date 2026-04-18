import type { Env } from "../env";

export type ConversationRealtimeEvent =
  | {
      type: "message";
      message: { id: string; authorId: string; body: string; createdAt: number };
    }
  | { type: "ping" };

/**
 * Notifies all WebSocket clients subscribed to this conversation's Durable Object.
 * Best-effort: failures are swallowed so HTTP message POST still succeeds.
 */
export async function broadcastConversationEvent(
  env: Env,
  conversationId: string,
  event: ConversationRealtimeEvent,
): Promise<void> {
  const ns = env.CONVERSATION_ROOM;
  if (!ns) return;
  try {
    const doId = ns.idFromName(conversationId);
    const stub = ns.get(doId);
    await stub.fetch("https://conversation-room.internal/notify", {
      method: "POST",
      body: JSON.stringify(event),
    });
  } catch {
    /* ignore */
  }
}
