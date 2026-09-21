# 002 — Cloudflare Workers (not Pages, not AWS)

**Status:** accepted · 2026-09-21

The site deploys as one Cloudflare Worker with static assets. Pages are served from the asset store, and the same Worker handles `/api/*`, a queue consumer, and cron. Cloudflare now steers new full-stack projects to Workers, and D1, Queues, Cron, and rate-limit bindings fit Workers natively. Moving DNS to Cloudflare also fixes the apex-domain HTTPS problem left by Namecheap URL forwarding. The trade-off is that the Workers runtime is not full Node, so Google APIs are called through `fetch` with WebCrypto-signed JWTs rather than the official SDK.
