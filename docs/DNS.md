# DNS

abhishekgoyal.me is registered at Namecheap. DNS moves to Cloudflare in M0.5 (issues #7, #8). Keep this
file in sync with every record change.

## abhishekgoyal.me

Email: **Google Workspace** (`contact@abhishekgoyal.me`). The site is currently S3 + CloudFront on `www`.
It moves to the Cloudflare Worker at launch (M4).

### Target zone in Cloudflare

| Type  | Name                                    | Content                                                                | Proxy    | Purpose                                                                                                                                                                                                                 |
| ----- | --------------------------------------- | ---------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A     | `@`                                     | `192.0.2.1`                                                            | Proxied  | Placeholder so the apex → www redirect rule runs                                                                                                                                                                        |
| CNAME | `www`                                   | `dpxp3d37iqwxe.cloudfront.net`                                         | DNS only | Current site (CloudFront, own certificate)                                                                                                                                                                              |
| CNAME | `_4b827a17faf94ed1dcfba0fa68783cb4`     | `_6e4a5348328ebc77989610c310b93dea.jkddzztszm.acm-validations.aws`     | DNS only | AWS ACM validation (apex) for the CloudFront cert                                                                                                                                                                       |
| CNAME | `_ca938b3ece78951a9031a9c357744d51.www` | `_ff7540e9bb931d33029a3f5cfd2e5187.jkddzztszm.acm-validations.aws`     | DNS only | AWS ACM validation (www) for the CloudFront cert                                                                                                                                                                        |
| MX    | `@`                                     | `smtp.google.com` (priority 1)                                         | —        | Google Workspace inbound mail                                                                                                                                                                                           |
| TXT   | `@`                                     | `google-site-verification=SiKHHj1WvOrjQ6cfOi4n8g4hgFAnyxLLgTG3M3Axpl4` | —        | Google domain verification                                                                                                                                                                                              |
| TXT   | `google._domainkey`                     | `v=DKIM1;k=rsa;p=MIIB…` (unchanged; copy from the import)              | —        | Google Workspace DKIM signing                                                                                                                                                                                           |
| TXT   | `@`                                     | `v=spf1 include:_spf.google.com ~all`                                  | —        | **New.** SPF: was missing, which hurts deliverability                                                                                                                                                                   |
| TXT   | `_dmarc`                                | `v=DMARC1; p=none; rua=mailto:contact@abhishekgoyal.me`                | —        | **New.** DMARC in monitor mode; tighten to `quarantine` after 2–4 weeks of clean reports (**M4 launch checklist**: confirm both the Google `google` and Resend `resend` DKIM selectors pass in the daily reports first) |

**Not carried over:** the Namecheap _URL Redirect_ on `@` (it resolved to `192.64.119.248` and is HTTP-only,
which is why `https://abhishekgoyal.me` timed out). A Cloudflare Redirect Rule replaces it:

- **Redirect Rule "apex to www":** when the hostname equals `abhishekgoyal.me`, do a dynamic redirect to
  `concat("https://www.abhishekgoyal.me", http.request.uri.path)` with status **301**, preserving the query string.
- SSL/TLS mode: **Full**. Always Use HTTPS: **on**.

At launch (M4), the apex becomes the Worker's custom domain, and `www` flips to redirect to the apex.

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
