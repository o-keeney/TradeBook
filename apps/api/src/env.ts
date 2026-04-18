export interface Env {
  DB: D1Database;
  /** Fan-out for per-conversation WebSocket subscribers (`idFromName(conversationId)`). */
  CONVERSATION_ROOM: DurableObjectNamespace;
  /**
   * HMAC secret for short-lived WebSocket tickets (`POST .../ws-ticket`).
   * Set in production via `wrangler secret put WEBSOCKET_TICKET_SECRET` or `[vars]` for non-prod.
   */
  WEBSOCKET_TICKET_SECRET?: string;
  /** Portfolio / uploads: omit binding only when R2 is disabled in wrangler */
  MEDIA_BUCKET?: R2Bucket;
  /** Add after: wrangler kv namespace create RATE_LIMIT */
  RATE_LIMIT_KV?: KVNamespace;
  ENVIRONMENT: string;
  /** Comma-separated browser origins allowed for CORS (e.g. https://app.example.com) */
  CORS_ORIGINS?: string;
  /**
   * Public web app URL (no trailing slash). Used after email verification redirect.
   * Falls back to the first `CORS_ORIGINS` entry, then http://localhost:3000.
   */
  APP_ORIGIN?: string;
  /**
   * Brevo REST API key (`wrangler secret put BREVO_API_KEY`).
   * If unset, verification emails are skipped (dev logs the link).
   */
  BREVO_API_KEY?: string;
  /** Verified sender address in Brevo (e.g. noreply@yourdomain.com). Non-secret: use [vars] or .dev.vars. */
  BREVO_SENDER_EMAIL?: string;
  /** Display name for the sender (optional). */
  BREVO_SENDER_NAME?: string;
}
