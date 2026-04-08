export interface Env {
  DB: D1Database;
  /** Portfolio / uploads — omit binding only when R2 is disabled in wrangler */
  MEDIA_BUCKET?: R2Bucket;
  /** Add after: wrangler kv namespace create RATE_LIMIT */
  RATE_LIMIT_KV?: KVNamespace;
  ENVIRONMENT: string;
  /** Comma-separated browser origins allowed for CORS (e.g. https://app.example.com) */
  CORS_ORIGINS?: string;
}
