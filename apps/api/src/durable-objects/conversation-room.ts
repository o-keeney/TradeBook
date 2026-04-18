import type { Env } from "../env";

/**
 * One Durable Object instance per conversation id (`idFromName(conversationId)`).
 * Holds WebSocket server peers and accepts internal POST /notify to fan out JSON payloads.
 */
export class ConversationRoom {
  private sockets: WebSocket[] = [];

  constructor(
    _ctx: DurableObjectState,
    _env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/notify" && request.method === "POST") {
      const text = await request.text();
      const dead: WebSocket[] = [];
      for (const ws of this.sockets) {
        try {
          ws.send(text);
        } catch {
          dead.push(ws);
        }
      }
      for (const ws of dead) {
        const i = this.sockets.indexOf(ws);
        if (i >= 0) this.sockets.splice(i, 1);
      }
      return Response.json({ ok: true, peers: this.sockets.length });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    server.accept();

    this.sockets.push(server);
    const detach = () => {
      const i = this.sockets.indexOf(server);
      if (i >= 0) this.sockets.splice(i, 1);
    };
    server.addEventListener("close", detach);
    server.addEventListener("error", detach);

    return new Response(null, { status: 101, webSocket: client });
  }
}
