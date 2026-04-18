import { apiFetch } from "@/lib/api";

export type ConversationWsMessage = {
  id: string;
  authorId: string;
  body: string;
  createdAt: number;
};

/**
 * Opens a WebSocket to the API (via signed ticket) and pushes new `message` rows for this thread.
 * Next.js HTTP rewrites do not support WebSocket upgrades, so the ticket response includes a direct
 * `ws://` / `wss://` URL to the API origin (`NEXT_PUBLIC_API_URL`).
 */
export function subscribeConversationMessages(
  conversationId: string,
  onMessage: (msg: ConversationWsMessage) => void,
): () => void {
  let cancelled = false;
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0;

  const cleanupTimers = () => {
    if (reconnectTimer != null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
  };

  const scheduleReconnect = () => {
    if (cancelled) return;
    cleanupTimers();
    const delayMs = Math.min(30_000, 800 * 2 ** Math.min(attempt, 6));
    attempt += 1;
    reconnectTimer = setTimeout(() => void connect(), delayMs);
  };

  async function connect() {
    if (cancelled) return;
    cleanupTimers();
    try {
      const res = await apiFetch(`/api/conversations/${encodeURIComponent(conversationId)}/ws-ticket`, {
        method: "POST",
      });
      if (cancelled) return;
      if (res.status === 503) return;
      if (res.status === 401 || res.status === 403) return;
      if (!res.ok) {
        scheduleReconnect();
        return;
      }
      const j = (await res.json()) as { wsUrl?: string };
      if (!j.wsUrl || cancelled) return;
      ws = new WebSocket(j.wsUrl);
      attempt = 0;
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(String(ev.data)) as {
            type?: string;
            message?: ConversationWsMessage;
          };
          if (data.type === "message" && data.message?.id) {
            onMessage(data.message);
          }
        } catch {
          /* ignore */
        }
      };
      ws.onerror = () => {
        /* closed will fire */
      };
      ws.onclose = () => {
        ws = null;
        if (!cancelled) scheduleReconnect();
      };
    } catch {
      if (!cancelled) scheduleReconnect();
    }
  }

  void connect();

  return () => {
    cancelled = true;
    cleanupTimers();
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    ws = null;
  };
}
