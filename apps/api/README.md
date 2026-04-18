# Tradebook API (Cloudflare Workers + Hono + D1)

## Prerequisites

- Node.js 22+ (matches CI)
- `npm ci` from the **monorepo root**
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (installed with this workspace)

## One-time Cloudflare setup (per account)

Run these once per environment (e.g. production vs staging). IDs go into `wrangler.toml` or Wrangler environments.

### 1. D1 database

```bash
cd apps/api
npx wrangler d1 create tradebook-db --location=weur
```

Copy the printed `database_id` into `wrangler.toml` under `[[d1_databases]]` (replace the placeholder UUID used for local dev).

If the database already exists in your account, list IDs and pick the right row:

```bash
npx wrangler d1 list
# or, for one database by name:
npx wrangler d1 info tradebook-db
```

Use the `uuid` / `database_id` value as `database_id` in `wrangler.toml` before `wrangler deploy` or `db:migrate:remote`.

### 2. R2 bucket (portfolio images)

```bash
npx wrangler r2 bucket create tradebook-media
```

The bucket name must match `bucket_name` in `wrangler.toml` (`tradebook-media`).

### 3. KV (optional — rate limiting)

```bash
npx wrangler kv namespace create RATE_LIMIT
```

Uncomment `[[kv_namespaces]]` in `wrangler.toml` and set `binding = "RATE_LIMIT_KV"` and the returned `id`. Without KV, rate limits are skipped (fine for local dev).

### 4. Secrets vs configuration

**Rule:** anything that grants spend, sends mail as your domain, or bypasses auth belongs in **Wrangler secrets** or the **Cloudflare dashboard** for the deployed Worker — not in `wrangler.toml` `[vars]` and never in git.

| Binding / variable | Where to set (remote) | Local `wrangler dev` |
|--------------------|------------------------|----------------------|
| `BREVO_API_KEY` | `wrangler secret put BREVO_API_KEY` | Optional: `.dev.vars` (see `.dev.vars.example`) |
| `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` | `[vars]` in `wrangler.toml`, dashboard **Variables**, or `.dev.vars` | `.dev.vars` or `[vars]` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (future) | `wrangler secret put …` | `.dev.vars` only |
| `BUDGETSMS_API_KEY` or similar (future) | `wrangler secret put …` | `.dev.vars` only |
| `MAPBOX_*` on the **Worker** (future server geocode) | Secret if it’s a private token | `.dev.vars` |
| `CORS_ORIGINS`, `APP_ORIGIN`, `ENVIRONMENT` | `[vars]` / dashboard (non-secret) | `[vars]` in `wrangler.toml` |
| `WEBSOCKET_TICKET_SECRET` | `wrangler secret put WEBSOCKET_TICKET_SECRET` (recommended for prod) | Defaults in `[vars]` for local; override in `.dev.vars` if needed |

**Web app (`apps/web`):** Mapbox and API URL use `NEXT_PUBLIC_*` — those tokens are **exposed to the browser** by design (Mapbox GL). Do not put server-only secrets in `NEXT_PUBLIC_*`. Use Vercel/Cloudflare **Pages** env UI or `.env.local` (gitignored) for local Next.js.

**Commands (remote):**

```bash
cd apps/api
npx wrangler secret put BREVO_API_KEY
# paste value when prompted; confirm in dashboard → Workers → your worker → Settings → Variables
```

Copy `.dev.vars.example` → `.dev.vars` for local API secrets and non-secret overrides.

## Local development

From repo root:

```bash
npm run dev:all
```

Or API only:

```bash
npm run dev:api
```

Local D1: migrations apply to the **local** `tradebook-db` binding.

```bash
npm run db:migrate:local --workspace=api
```

After pulling new migrations from git:

```bash
npm run db:migrate:local --workspace=api
npm run db:migrate:remote --workspace=api   # production / remote D1
```

## Remote deploy

1. Set real `database_id` (and KV id if used).
2. `npx wrangler deploy` from `apps/api` (or `npm run deploy --workspace=api` from root).
3. Run **remote** migrations after schema changes: `npm run db:migrate:remote --workspace=api`.

### GitHub Actions (manual)

After `database_id` and bindings are correct for production, you can deploy from GitHub:

1. Repository **Settings → Secrets and variables → Actions**: add `CLOUDFLARE_API_TOKEN` (Workers deploy + D1/R2 as needed). Optionally add `CLOUDFLARE_ACCOUNT_ID` if Wrangler prompts for it.
2. Run workflow **Deploy API** (Actions tab → **Deploy API** → **Run workflow**). It only runs on `workflow_dispatch`, not on every push.

Workflow file: `.github/workflows/deploy-api.yml`.

## Scripts (see `package.json`)

| Script | Purpose |
|--------|---------|
| `typecheck` | `tsc --noEmit` |
| `dev` | Wrangler dev (API on default worker port) |
| `deploy` | Wrangler deploy |
| `db:generate` | Drizzle → SQL migrations |
| `db:migrate:local` / `db:migrate:remote` | Apply migrations to D1 |
| `create-admin` | Interactive admin user (local) |

## Messaging realtime (Durable Objects + WebSocket)

The Worker defines a **`ConversationRoom`** Durable Object (`CONVERSATION_ROOM` binding) with one instance per conversation id (`idFromName(conversationId)`). After a row is inserted via `POST /api/conversations/:id/messages`, the API notifies that object, which fans out JSON events to connected WebSockets.

- **`POST /api/conversations/:id/ws-ticket`** (session cookie + CSRF + email verified): returns a short-lived signed `wsUrl` for **`GET /api/conversations/ws?ticket=…`** (WebSocket upgrade). Tickets are HMAC-signed with `WEBSOCKET_TICKET_SECRET`.
- **Why not same-origin only?** Next.js `rewrites()` do not upgrade WebSockets to the API. The browser therefore opens the socket on the **API origin** from `wsUrl` (built from the ticket request URL), while normal REST traffic can stay same-origin via the rewrite.

First deploy after pulling this: run `wrangler deploy` so the **Durable Object migration** in `wrangler.toml` is applied. Local dev uses the bundled migration automatically.

## CORS and web origin

Set `CORS_ORIGINS` in `[vars]` (or dashboard) to your production web origin(s), comma-separated. For local Next.js, defaults include `http://localhost:3000`.

## Brevo (transactional email)

The API sends **email verification** and **password reset** mail when `BREVO_API_KEY` is set (`lib/email-verification.ts`, `lib/password-reset.ts`, `lib/brevo-email.ts`). Without the key, dev mode logs links to the terminal.

**Production checklist**

1. Create a [Brevo](https://www.brevo.com/) account and API key → `wrangler secret put BREVO_API_KEY`.
2. Set `BREVO_SENDER_EMAIL` (and optional `BREVO_SENDER_NAME`) to an address/name Brevo accepts for that key.
3. **Authenticate your sending domain** in Brevo (dashboard → Senders & IP → Domains): add the **SPF** and **DKIM** DNS records they provide for your domain. Until DNS propagates, deliverability may be poor or mail may be blocked.
4. Prefer a subdomain (e.g. `noreply@mail.example.com`) aligned with Brevo’s instructions.

**Not implemented yet:** digest/summary emails — still product TODO.
