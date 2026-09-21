# 003 — Leads are written to D1 first; Google Sheets is a view

**Status:** accepted · 2026-09-21

Every lead is inserted into Cloudflare D1 before the visitor sees a success message. Delivery to Google Sheets, email, and Telegram happens afterwards through a Cloudflare Queue, with retries, a dead-letter queue, and a per-step outbox, so an outage at Google or Resend can never lose a lead or send a duplicate. Sheets rows are appended with `valueInputOption=RAW` and values are sanitised to prevent formula injection. The trade-off is one extra moving part (the Queue) and two copies of each lead; the D1 copy is authoritative and is purged after 18 months.
