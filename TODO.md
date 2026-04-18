# TradeBook: outstanding work & progress

Use this as a living checklist. Toggle items as you complete them (`[ ]` → `[x]`).

## Done (baseline shipped in repo)

- [x] Monorepo: Next.js (OpenNext) + Hono API on Cloudflare Workers
- [x] D1 schema + migrations workflow (`db:generate`, `db:migrate:local` / remote)
- [x] R2 media bucket binding + portfolio image upload/stream
- [x] Auth: register, login, logout, session cookie, `GET /api/users/me`
- [x] Tradesman profiles (`tradesmen_profiles`) + public `GET` + `PUT` own profile
- [x] Portfolio projects + images + client-side image compression
- [x] Work orders: direct + open bid, bids, award, cancel, tradesman respond
- [x] Job timeline: `job_updates`, `GET /timeline`, `POST /updates`, `PUT /status`
- [x] Dev sandboxes on home page (non-production) for API exercises
- [x] GitHub Actions: API `tsc` + web `lint` + `build` on push/PR (`.github/workflows/ci.yml`)
- [x] Contact page + `POST /api/public/contact` storing messages in D1 (`contact_submissions`)
- [x] `sitemap.xml` + `robots.txt` (Next.js `app/sitemap.ts` / `app/robots.ts`; set `NEXT_PUBLIC_SITE_URL` in prod)
- [x] Password reset: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `/forgot-password`, `/reset-password` (email via Brevo; dev logs link if email not configured)

---

## Infrastructure & quality

- [ ] Replace placeholder D1 `database_id` in `apps/api/wrangler.toml` for remote deploy
- [ ] Document or automate `wrangler d1` / `wrangler r2` one-time setup for new environments
- [ ] Optional: extend CI with `wrangler deploy` on main (secrets + remote `database_id` required)
- [ ] OpenNext / Windows: prefer WSL or Linux CI for reproducible production builds
- [ ] Secrets: move sensitive vars to `wrangler secret` / dashboard (Stripe, Brevo, Mapbox, BudgetSMS)
- [x] Rate limiting: optional `RATE_LIMIT_KV` — fixed-window per IP on auth routes + `POST /api/public/contact` (`middleware/rate-limit.ts`, routes in `auth.ts` / `public-site.ts`). Uncomment KV in `wrangler.toml` with a real id; without KV, limits are skipped (local dev).
- [x] Structured request logging: one JSON line per request with redacted query secrets and booleans for auth/cookie headers (`middleware/request-log.ts`, `lib/log-redact.ts`). Raw client IPs are not logged.

## Security & compliance

- [x] CSRF protection: double-submit cookie `tradebook_csrf` + `X-CSRF-Token` on mutating requests when a session cookie is present; exempt auth register/login/forgot/reset + public contact; GET bootstrap mints CSRF for existing sessions (`middleware/csrf.ts`, `lib/csrf-cookie.ts`, `apiFetch` + CORS header). Native/mobile API clients must send the same header or use a non-cookie auth strategy.
- [x] Argon2id or policy note if staying on bcrypt for passwords (policy note in `apps/api/src/lib/password.ts`; Argon2id upgrade still optional)
- [x] `GET`/`POST /api/gdpr/export` (JSON) and `DELETE`/`POST /api/gdpr/erase` (typed email + cascade delete + R2 portfolio cleanup; clears session). Dashboard UI when email verified. Formal retention / legal hold / grace period still product/legal TODO.
- [ ] Consent audit log (timestamp, IP) for GDPR checkboxes
- [x] Cookie banner + stored consent prefs (necessary vs accept-all for future analytics/marketing; `cookie-consent-banner.tsx`). Per-category toggles, consent audit log, and ad/analytics wiring still TODO.
- [x] Stub legal routes: `/terms`, `/privacy` (draft copy), site footer + home “Explore” links, sitemap entries. Counsel-reviewed Terms / Privacy / subscription terms still TODO.

## Product integrations (chosen stack)

- [ ] **Brevo**: transactional email (verify, reset, digests); domain auth (SPF/DKIM)
- [ ] **Stripe Billing**: products/prices, checkout, portal, `POST /api/subscription/webhook`, enforce active subscription for tradesman actions
- [ ] **Mapbox**: map UI, geocode, Ireland bounds; wire `region_config` + search
- [ ] **BudgetSMS**: critical SMS paths + env wiring
- [ ] **Google AdSense**: slots, consent mode, non-blocking layout

## Auth & accounts

- [x] Email verification gate for mutating API routes + dashboard resend (full “block all reads” optional)
- [x] Password reset flow (`forgot-password` / `reset-password`)
- [ ] Optional OAuth (callbacks, providers you choose)
- [ ] Optional 2FA (spec: future)

## Discovery & search

- [x] `GET /api/tradesmen` with filters: trade, address/county text search, rating, availability, subscription tier (`GET /api/tradesmen/search` is an alias). Geo / postcode radius still TODO.
- [ ] Efficient geo/postcode strategy on D1 (bounding box + haversine, geohash, or auxiliary index)
- [ ] Edge caching for public search/profile payloads (Cache API + SWR)

## Work orders & jobs

- [ ] Richer status model vs spec (`quotes_submitted`, `customer_rejected`, etc.) if still required
- [ ] Attach job media via R2 (presigned or multipart) and link in `job_updates.media_urls`
- [ ] Notifications (email/in-app) on bid, award, status change

## Messaging

- [ ] `conversations` + `messages` + REST + read receipts
- [ ] Realtime: Durable Objects + WebSocket/SSE (spec)

## Reviews & reputation

- [ ] `reviews` table + `POST /api/reviews` (gated on completed work order)
- [ ] Moderation flags + admin tools; update `avg_rating` / `review_count` on tradesmen_profiles

## Planner (Jira-style)

- [ ] Data model: boards/columns/tasks (or map to `job_updates` + UI only)
- [ ] Tradesman planner UI + customer-visible projection

## Admin

- [x] Admin contact inbox: `GET /api/admin/contact-submissions` + list on `/admin` (latest 100). Full dashboard (users, billing, moderation) still TODO.
- [ ] Admin role + dashboard: users, subscriptions, moderation, ad slots, GDPR requests

## Frontend (real UI)

- [ ] Replace dev sandboxes with production routes: auth, profile, portfolio, jobs, tradesman search
- [ ] Mobile-first layout, WCAG 2.1 AA pass
- [x] PWA web app manifest (`apps/web/src/app/manifest.ts`). Offline draft queue still TODO.
- [ ] Ads: responsive slots, lazy load, no blocking CTAs

## Website SEO

- [x] Per-route metadata example: `/find-tradesmen` layout (`title`, `description`, canonical). Extend to other hubs as pages stabilize.
- [x] Structured data: Organization JSON-LD in root layout (`components/organization-jsonld.tsx`). Breadcrumbs / more pages still optional.
- [x] Technical basics (incremental): internal links from home hub; legal pages use `h1` (shell) + section `h2` hierarchy. Continue alt text and image audits on media-heavy pages.
- [ ] Performance for SEO: Core Web Vitals (LCP, INP, CLS), image strategy (`next/image` or equivalent)

## Testing

- [ ] API integration tests (Vitest + `wrangler dev` or miniflare) for critical paths
- [ ] E2E smoke (Playwright) against preview URL

---

## How to use

1. Pick a section and move items to **Done** when merged.
2. Add new items as the product scope grows.
3. For remote DB: run `npm run db:migrate:remote --workspace=api` after pulling new migrations.
