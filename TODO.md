# TradeBook — outstanding work & progress

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

---

## Infrastructure & quality

- [ ] Replace placeholder D1 `database_id` in `apps/api/wrangler.toml` for remote deploy
- [ ] Document or automate `wrangler d1` / `wrangler r2` one-time setup for new environments
- [ ] GitHub Actions: run API `tsc`, web `lint` + `build`, optional `wrangler deploy` on main
- [ ] OpenNext / Windows: prefer WSL or Linux CI for reproducible production builds
- [ ] Secrets: move sensitive vars to `wrangler secret` / dashboard (Stripe, Brevo, Mapbox, BudgetSMS)
- [ ] Rate limiting: wire `RATE_LIMIT_KV` (namespace id in wrangler) + sensible limits per route
- [ ] Structured request logging with PII redaction (Workers)

## Security & compliance

- [ ] CSRF protection for cookie-based `POST`/`PUT`/`DELETE` from the browser
- [ ] Argon2id or policy note if staying on bcrypt for passwords
- [ ] `GET/POST /api/gdpr/export` and `DELETE /api/gdpr/erase` (spec) + retention / grace period
- [ ] Consent audit log (timestamp, IP) for GDPR checkboxes
- [ ] Cookie banner + consent categories (necessary / analytics / marketing / ads)
- [ ] Terms of Service, Privacy Policy, subscription terms (Ireland / EU counsel)

## Product integrations (chosen stack)

- [ ] **Brevo**: transactional email (verify, reset, digests); domain auth (SPF/DKIM)
- [ ] **Stripe Billing**: products/prices, checkout, portal, `POST /api/subscription/webhook`, enforce active subscription for tradesman actions
- [ ] **Mapbox**: map UI, geocode, Ireland bounds; wire `region_config` + search
- [ ] **BudgetSMS**: critical SMS paths + env wiring
- [ ] **Google AdSense**: slots, consent mode, non-blocking layout

## Auth & accounts

- [ ] Email verification gate (must-verify before full access)
- [ ] Password reset flow (`forgot-password` / `reset-password`)
- [ ] Optional OAuth (callbacks, providers you choose)
- [ ] Optional 2FA (spec: future)

## Discovery & search

- [ ] `GET /api/tradesmen` with filters: trade, postcode/city/GPS + radius, rating, availability, subscription tier
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

- [ ] Admin role + dashboard: users, subscriptions, moderation, ad slots, GDPR requests

## Frontend (real UI)

- [ ] Replace dev sandboxes with production routes: auth, profile, portfolio, jobs, tradesman search
- [ ] Mobile-first layout, WCAG 2.1 AA pass
- [ ] PWA manifest + offline draft queue (spec)
- [ ] Ads: responsive slots, lazy load, no blocking CTAs

## Testing

- [ ] API integration tests (Vitest + `wrangler dev` or miniflare) for critical paths
- [ ] E2E smoke (Playwright) against preview URL

---

## How to use

1. Pick a section and move items to **Done** when merged.
2. Add new items as the product scope grows.
3. For remote DB: run `npm run db:migrate:remote --workspace=api` after pulling new migrations.
