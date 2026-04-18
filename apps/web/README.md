# Tradebook web (Next.js)

## Development

From the monorepo root:

```bash
npm run dev
```

The app calls `/api/*` on the same origin; `next.config.ts` rewrites those requests to `NEXT_PUBLIC_API_URL` (default `http://localhost:8787`) so session cookies stay on the web host.

**Live job messages** use a WebSocket to the API origin returned by `POST /api/conversations/:id/ws-ticket` (see `src/lib/conversation-websocket.ts`). Ensure `NEXT_PUBLIC_API_URL` matches where `wrangler dev` (or production) serves the Worker so the client opens `ws://` / `wss://` on the correct host.

**Environment variables:** use `.env.local` (gitignored) for `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, and `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`. These `NEXT_PUBLIC_*` values are embedded in the client bundle — only use **public** tokens (e.g. Mapbox default token with URL restrictions), never Worker or payment secrets.

**Google AdSense (optional):** set `NEXT_PUBLIC_ADSENSE_PUBLISHER` to your client id (`ca-pub-…`), plus numeric slot ids: `NEXT_PUBLIC_ADSENSE_SLOT_HOME` and `NEXT_PUBLIC_ADSENSE_SLOT_FIND`. Slots render only after the user chooses **Accept all** on the cookie banner (marketing consent). Without these vars, ad regions stay empty and no third-party script loads.

## Production builds (OpenNext + Cloudflare)

Deploy uses [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare). On **Windows**, local `next build` / OpenNext output can differ from **Linux** (paths, symlinks, optional native tooling), which can make “works on my machine” diverge from CI or Cloudflare’s build image.

For **reproducible** production builds, prefer:

- **WSL2** (e.g. Ubuntu) on Windows, or
- **Linux runners in CI** (see `.github/workflows/ci.yml`), aligned with how Workers + OpenNext are usually built.

Useful commands from `apps/web`:

```bash
npm run build
npm run preview   # OpenNext + Wrangler preview (requires API env / bindings as per OpenNext docs)
```

See the [OpenNext Cloudflare](https://opennext.js.org/cloudflare) adapter docs for binding and preview details.

**Portfolio images:** `next.config.ts` sets `images.remotePatterns` for `NEXT_PUBLIC_API_URL` so public tradesperson portfolios can use `next/image` for API-hosted portfolio file URLs.
