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
- [x] Document `wrangler d1` / `wrangler r2` / KV / secrets / migrations for new environments (`apps/api/README.md`). Further automation optional.
- [x] Optional: extend CI with `wrangler deploy` on main (secrets + remote `database_id` required) — manual **Deploy API** workflow (`.github/workflows/deploy-api.yml`); auto-deploy on every `main` push still optional
- [x] OpenNext / Windows: prefer WSL or Linux CI for reproducible production builds (`apps/web/README.md`)
- [x] Secrets: move sensitive vars to `wrangler secret` / dashboard (Stripe, Brevo, Mapbox, BudgetSMS) — policy + tables in `apps/api/README.md`, `apps/api/.dev.vars.example`, web note in `apps/web/README.md`; apply secrets per env when integrating each vendor
- [x] Rate limiting: optional `RATE_LIMIT_KV` — fixed-window per IP on auth routes + `POST /api/public/contact` (`middleware/rate-limit.ts`, routes in `auth.ts` / `public-site.ts`). Uncomment KV in `wrangler.toml` with a real id; without KV, limits are skipped (local dev).
- [x] Structured request logging: one JSON line per request with redacted query secrets and booleans for auth/cookie headers (`middleware/request-log.ts`, `lib/log-redact.ts`). Raw client IPs are not logged.

## Security & compliance

- [x] CSRF protection: double-submit cookie `tradebook_csrf` + `X-CSRF-Token` on mutating requests when a session cookie is present; exempt auth register/login/forgot/reset + public contact; GET bootstrap mints CSRF for existing sessions (`middleware/csrf.ts`, `lib/csrf-cookie.ts`, `apiFetch` + CORS header). Native/mobile API clients must send the same header or use a non-cookie auth strategy.
- [x] Argon2id or policy note if staying on bcrypt for passwords (policy note in `apps/api/src/lib/password.ts`; Argon2id upgrade still optional)
- [x] `GET`/`POST /api/gdpr/export` (JSON) and `DELETE`/`POST /api/gdpr/erase` (typed email + cascade delete + R2 portfolio cleanup; clears session). Dashboard UI when email verified. Formal retention / legal hold / grace period still product/legal TODO.
- [x] Consent audit log (timestamp, IP, user agent, GDPR checkbox snapshot) on `POST /api/auth/register` (`consent_audit_log` migration + GDPR export). Admin: `GET /api/admin/users/:id/consent-audit` + “Load consent log” on `/admin/users/[id]`.
- [x] Cookie banner + stored consent prefs (necessary vs accept-all for future analytics/marketing; `cookie-consent-banner.tsx`). Per-category toggles, cookie-category audit trail to D1, and ad/analytics wiring still TODO.
- [x] Stub legal routes: `/terms`, `/privacy` (draft copy), site footer + home “Explore” links, sitemap entries. Counsel-reviewed Terms / Privacy / subscription terms still TODO.

## Product integrations (chosen stack)

- [x] **Brevo**: transactional email (verify, reset — shipped); SPF/DKIM / sender domain runbook (`apps/api/README.md`); digests still TODO
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

- [x] `GET /api/tradesmen` with filters: trade, address/county text search, rating, availability, subscription tier (`GET /api/tradesmen/search` is an alias). Find-tradesmen UI: “Show recent reviews” loads `GET /api/tradesmen/:id/reviews`. Geo / postcode radius still TODO.
- [ ] Efficient geo/postcode strategy on D1 (bounding box + haversine, geohash, or auxiliary index)
- [ ] Edge caching for public search/profile payloads (Cache API + SWR)

## Work orders & jobs

- [x] Richer status model vs spec (`quotes_submitted`, `customer_rejected`, etc.) if still required
- [x] Attach job media via R2 (presigned or multipart) and link in `job_updates.media_urls`
- [x] Email notifications (Brevo) on new bid, bid awarded, status changes (incl. cancel), direct job assigned, direct accept/decline (`lib/work-order-email-notify.ts`, `routes/work-orders.ts`). In-app / digest still TODO.

## Messaging

- [ ] `conversations` + `messages` + REST + read receipts
- [ ] Realtime: Durable Objects + WebSocket/SSE (spec)

## Reviews & reputation

- [x] `reviews` table + `POST /api/reviews` (customer, email verified, completed job with assignee; one review per work order). `GET /api/reviews/for-work-order/:id` for the job owner. `GET /api/tradesmen/:id/reviews` public list (first name + rating + comment). GDPR export includes `reviewsReceived` / `reviewsGiven`. Work order detail UI to submit/view review.
- [x] Update `avg_rating` / `review_count` on `tradesmen_profiles` after each new review (`lib/review-stats.ts`). Moderation flags + admin tools still TODO.

## Planner (Jira-style)

- [x] Data model: boards/columns/tasks (or map to `job_updates` + UI only)
- [x] Tradesman planner UI + customer-visible projection

## Admin

- [x] Admin contact inbox: `GET /api/admin/contact-submissions` + list on `/admin` (latest 100). Full dashboard (users, billing, moderation) still TODO.
- [x] Admin role + dashboard: subscriptions, moderation, ad slots, GDPR tooling — hub on `/admin` (users link, contact anchor, placeholder cards for Stripe / moderation / ads); user directory + edit at `/admin/users`; consent log on user detail; pricing + inbox on `/admin`

## Frontend (real UI)

- [x] Replace dev sandboxes with production routes: auth, profile, portfolio, jobs, tradesman search
- [x] Mobile-first layout, WCAG 2.1 AA pass
- [x] PWA web app manifest (`apps/web/src/app/manifest.ts`). Offline draft queue still TODO.
- [x] Ads: responsive slots, lazy load, no blocking CTAs

## Website SEO

- [x] Per-route metadata: `/find-tradesmen` layout; plus login, register (chooser + customer + tradesman), dashboard, work orders, portfolio, admin (noindex), contact, forgot/reset password — `title`, `description`, `canonical`, Open Graph where added. `/terms` & `/privacy` use segment `layout.tsx` for OG/Twitter. `/work-orders/[id]` uses `generateMetadata` (title from job when session can read API).
- [x] Structured data: Organization JSON-LD in root layout (`components/organization-jsonld.tsx`). Breadcrumbs / more pages still optional.
- [x] Technical basics (incremental): internal links from home hub; legal pages use `h1` (shell) + section `h2` hierarchy. Continue alt text and image audits on media-heavy pages.
- [x] Performance for SEO: Core Web Vitals (LCP, INP, CLS), image strategy (`next/image` or equivalent) — `next/image` + `remotePatterns` for public portfolio photos (`next.config.ts`, `tradesman-public-profile-view.tsx`); full CWV audit & further image work still optional

## Testing

- [x] API unit tests (Vitest `npm run test --workspace=api`; `log-redact` covered). CI runs tests. Full integration tests against `wrangler dev` / miniflare still TODO.
- [x] E2E smoke (Playwright): `apps/web/e2e/smoke.spec.ts`, `npm run test:e2e` (root or web workspace). CI runs Chromium after `next build` via `PLAYWRIGHT_WEB_SERVER_SKIP_BUILD=1`. For a deployed preview, run with `PLAYWRIGHT_BASE_URL=https://…` (no local `webServer`).

---

## How to use

1. Pick a section and move items to **Done** when merged.
2. Add new items as the product scope grows.
3. For remote DB: run `npm run db:migrate:remote --workspace=api` after pulling new migrations.
