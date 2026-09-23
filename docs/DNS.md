# DNS

abhishekgoyal.me is registered at Namecheap. DNS moves to Cloudflare in M0.5 (issues #7, #8). Keep this
file in sync with every record change.

## abhishekgoyal.me

Email: **Google Workspace** (`contact@abhishekgoyal.me`). The site moved from S3 + CloudFront to the
Cloudflare Worker at launch (M4, #81): the **apex is now canonical** and `www` redirects to it.

### Target zone in Cloudflare

| Type  | Name                                    | Content                                                                | Proxy    | Purpose                                                                                                                                                                                                                 |
| ----- | --------------------------------------- | ---------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A     | `@`                                     | (managed by the Worker custom domain)                                  | Proxied  | The site: Worker `abhishekgoyal-me`, added as a custom domain on the apex. Cloudflare creates and owns this record                                                                                                      |
| A     | `www`                                   | `192.0.2.1`                                                            | Proxied  | Placeholder so the "www to apex" redirect rule runs                                                                                                                                                                     |
| CNAME | `_4b827a17faf94ed1dcfba0fa68783cb4`     | `_6e4a5348328ebc77989610c310b93dea.jkddzztszm.acm-validations.aws`     | DNS only | AWS ACM validation (apex) for the CloudFront cert                                                                                                                                                                       |
| CNAME | `_ca938b3ece78951a9031a9c357744d51.www` | `_ff7540e9bb931d33029a3f5cfd2e5187.jkddzztszm.acm-validations.aws`     | DNS only | AWS ACM validation (www) for the CloudFront cert                                                                                                                                                                        |
| MX    | `@`                                     | `smtp.google.com` (priority 1)                                         | —        | Google Workspace inbound mail                                                                                                                                                                                           |
| TXT   | `@`                                     | `google-site-verification=SiKHHj1WvOrjQ6cfOi4n8g4hgFAnyxLLgTG3M3Axpl4` | —        | Google domain verification                                                                                                                                                                                              |
| TXT   | `google._domainkey`                     | `v=DKIM1;k=rsa;p=MIIB…` (unchanged; copy from the import)              | —        | Google Workspace DKIM signing                                                                                                                                                                                           |
| TXT   | `@`                                     | `v=spf1 include:_spf.google.com ~all`                                  | —        | **New.** SPF: was missing, which hurts deliverability                                                                                                                                                                   |
| TXT   | `_dmarc`                                | `v=DMARC1; p=none; rua=mailto:contact@abhishekgoyal.me`                | —        | **New.** DMARC in monitor mode; tighten to `quarantine` after 2–4 weeks of clean reports (**M4 launch checklist**: confirm both the Google `google` and Resend `resend` DKIM selectors pass in the daily reports first) |

**Redirect Rule "www to apex":** when the hostname equals `www.abhishekgoyal.me`, do a dynamic redirect to
`concat("https://abhishekgoyal.me", http.request.uri.path)` with status **301**, preserving the query string.
It replaced the M0.5 rule "apex to www", which pointed at the old CloudFront site.

- SSL/TLS mode: **Full**. Always Use HTTPS: **on**.
- The canonical host is the bare domain, which is what `site` in `astro.config.mjs`, the sitemap and
  robots.txt already use.
- The old CloudFront site's only server-visible URL was `/index.html`; `public/_redirects` sends it to `/`
  with a 301. Its other links were `#anchors`, which never reach a server.

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

**Rollback** (within the 2 weeks that CloudFront stays up): delete the Worker custom domain, point `www`
back to `dpxp3d37iqwxe.cloudfront.net` (DNS only), and restore the "apex to www" rule. DNS is proxied, so
it takes effect in about a minute. The ACM validation CNAMEs stay until CloudFront is retired (#87).

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
