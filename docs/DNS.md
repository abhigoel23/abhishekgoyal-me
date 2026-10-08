# DNS

abhishekgoyal.me is registered at Namecheap. DNS moves to Cloudflare in M0.5 (issues #7, #8). Keep this
file in sync with every record change.

## abhishekgoyal.me

Email: **Google Workspace** (`contact@abhishekgoyal.me`); the site's own emails (auto-replies,
notifications) go out through **Resend**. The site moved from S3 + CloudFront to the
Cloudflare Worker at launch (M4, #81): the **apex is now canonical** and `www` redirects to it.

### Target zone in Cloudflare

| Type  | Name                | Content                                                                | Proxy    | Purpose                                                                                                                                                                                                     |
| ----- | ------------------- | ---------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A     | `@`                 | (managed by the Worker custom domain)                                  | Proxied  | The site: Worker `abhishekgoyal-me`, added as a custom domain on the apex. Cloudflare creates and owns this record                                                                                          |
| A     | `www`               | `192.0.2.1`                                                            | Proxied  | Placeholder so the "www to apex" redirect rule runs                                                                                                                                                         |
| MX    | `@`                 | `smtp.google.com` (priority 1)                                         | —        | Google Workspace inbound mail                                                                                                                                                                               |
| TXT   | `@`                 | `google-site-verification=SiKHHj1WvOrjQ6cfOi4n8g4hgFAnyxLLgTG3M3Axpl4` | —        | Google domain verification                                                                                                                                                                                  |
| TXT   | `google._domainkey` | `v=DKIM1;k=rsa;p=MIIB…` (unchanged; copy from the import)              | —        | Google Workspace DKIM signing                                                                                                                                                                               |
| TXT   | `@`                 | `v=spf1 include:_spf.google.com ~all`                                  | —        | **New.** SPF: was missing, which hurts deliverability                                                                                                                                                       |
| TXT   | `resend._domainkey` | `p=MIGfMA0…` (from Resend → Domains)                                   | —        | Resend DKIM signing for the site's emails (`d=abhishekgoyal.me`)                                                                                                                                            |
| CNAME | `rsend`             | `rsend.forge.rmta.net`                                                 | DNS only | Resend return path (bounces); its SPF passes and aligns with the apex under relaxed alignment                                                                                                               |
| CNAME | `send`              | `send.forge.rmta.net`                                                  | DNS only | Resend's other managed sending subdomain; keep it while Resend lists it under Domains                                                                                                                       |
| TXT   | `_dmarc`            | `v=DMARC1; p=quarantine; rua=mailto:contact@abhishekgoyal.me`          | —        | DMARC. Monitor mode (`p=none`) from launch; moved to `quarantine` on 2026-10-07 (#87) after two weeks of Google reports with all 45 messages passing, both the `google` and `resend` DKIM selectors aligned |

**Redirect Rule "www to apex":** when the hostname equals `www.abhishekgoyal.me`, do a dynamic redirect to
`concat("https://abhishekgoyal.me", http.request.uri.path)` with status **301**, preserving the query string.
It replaced the M0.5 rule "apex to www", which pointed at the old CloudFront site.

- SSL/TLS mode: **Full**. Always Use HTTPS: **on**.
- The canonical host is the bare domain, which is what `site` in `astro.config.mjs`, the sitemap and
  robots.txt already use.
- The old CloudFront site's only server-visible URL was `/index.html`; `public/_redirects` sends it to `/`
  with a 301. Its other links were `#anchors`, which never reach a server.

## Search visibility and analytics (M4, #82)

- **Google Search Console**: Domain property for `abhishekgoyal.me`, verified by TXT record, with
  `sitemap-index.xml` submitted. The older `google-site-verification=SiKHHj…` TXT belongs to Google
  Workspace; Search Console adds its own, and both stay.
- **Bing Webmaster Tools**: imported from Search Console, same sitemap.
- **Crawler Hints** (Caching → Configuration): on, so Bing and Yandex hear about changes via IndexNow.
- **Cloudflare Web Analytics**: set to _Enable with JS Snippet installation_, because Cloudflare's
  automatic injection only touches HTML it serves itself and this site's HTML comes from the Worker.
  The beacon lives in `src/components/WebAnalytics.astro`; the token is public.

## Launch cutover (M4, #81)

1. [ ] Cloudflare → **Workers & Pages → abhishekgoyal-me → Settings → Domains & Routes → Add → Custom
       domain** → `abhishekgoyal.me`. Deleting the old placeholder `A @` record first, if Cloudflare asks.
2. [ ] **Rules → Redirect Rules**: delete "apex to www", add "www to apex" as above.
3. [ ] DNS: `www` becomes a **proxied** `A` record to `192.0.2.1` (the placeholder the rule runs on),
       replacing the CloudFront CNAME.
4. [ ] Set the repo variable `PRODUCTION_URL=https://abhishekgoyal.me` so CI smoke-tests the real site.
5. [ ] Verify: apex 200, `www` 301 to apex keeping path and query, `http://` upgrades to HTTPS,
       `/index.html` 301 to `/`, `/api/health` green, and no `X-Robots-Tag: noindex` on the apex.
       `tests/e2e/headers.spec.ts` asserts all of this whenever `BASE_URL` is the custom domain.
6. [ ] Cal.com → the production webhook URL becomes `https://abhishekgoyal.me/api/booking`.

**Rollback** (closed): CloudFront was disabled on 2026-10-07 and the ACM validation CNAMEs deleted, so there
is no longer an old site to fall back to. Until the distribution is deleted it can still be re-enabled in
AWS, but its cert can't renew without those CNAMEs.

## Post-launch clean-up (M4, #87)

1. [x] DMARC reports (2026-09-22 to 10-06, Google): 45 of 45 messages pass, both `google` and `resend`
       DKIM selectors aligned, no unknown senders.
2. [x] `_dmarc` → `p=quarantine` (2026-10-07). Afterwards both a Workspace email and a Resend auto-reply
       reached a Gmail inbox with `dmarc=pass`. Turnstile rejects the form from an automated browser, so
       this check needs a real browser.
3. [x] CloudFront distribution `dpxp3d37iqwxe.cloudfront.net` disabled; both ACM validation CNAMEs deleted
       (2026-10-07).
4. [ ] **2026-10-14:** AWS → delete the CloudFront distribution, then the ACM certificate (us-east-1), then
       empty and delete the old S3 site bucket.

## Migration checklist

1. [ ] Cloudflare → **Add a domain** → Free plan. Let it scan the records.
2. [ ] Edit the imported zone until it matches the target table exactly. Delete anything not listed,
       especially any imported `192.64.119.x` records.
3. [ ] Add the Redirect Rule. Set SSL **Full** and **Always Use HTTPS**.
4. [ ] Send a test email to and from `contact@abhishekgoyal.me` **before** switching.
5. [ ] Namecheap → Domain List → Manage → **Nameservers: Custom DNS** → the two Cloudflare nameservers.
6. [ ] Wait for Cloudflare to show **Active** (usually under an hour; up to 24 h).
7. [ ] Verify:
   - `curl -I https://abhishekgoyal.me` returns `301` → `https://www.abhishekgoyal.me/`
   - Email sends and receives, and a received Gmail message shows `spf=pass dkim=pass dmarc=pass`
     under "Show original"
