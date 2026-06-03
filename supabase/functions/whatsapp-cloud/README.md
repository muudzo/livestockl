# whatsapp-cloud — seller-lifecycle bot (Meta WhatsApp Cloud API)

Official Cloud API replacement for the `whatsapp-bot/` demo (which ran on
`whatsapp-web.js` and could only send plain text). Because this is the real
Cloud API, the seller taps **interactive list rows** and **buttons** instead of
typing option numbers.

## What it does (seller side, end to end)

```
list an animal ─▶ bid lands ─▶ accept the top bid ─▶ buyer pays ─▶ trigger delivery
   (lists +        (in-chat      (closes auction     (in-chat       (accept the
    buttons)        push)         to top bidder)       push)          quote)
```

- **List an animal** — category and city are interactive **list messages**;
  delivery and confirm are **buttons**. The seller's WhatsApp number *is* their
  identity, so unlike the Messenger bot we never ask for a phone number.
- **My listings** — each active lot is sent as an **image-header button card**
  (a swipe-free carousel) with `Accept top bid` / `View bids` actions. This uses
  in-session interactive messages, so — unlike a WhatsApp carousel *template* —
  it needs no Meta pre-approval and still carries per-card buttons.
- **Accept the top bid** — the platform is an ascending auction, so "accept a
  bid" means **sell now to the current top bidder**. `accept_top_bid()` closes
  the lot, marks the winner, and notifies all parties (mirrors
  `end_expired_auctions()` for one lot, authorised by the seller's phone).
- **Payment received → delivery** — `payment-webhook` pushes the seller a
  "payment received" message; if the buyer requested delivery
  (`transport_requests`), the seller accepts the distance-based quote with one tap.

## Proactive pushes & the 24-hour window

WhatsApp only allows free-form (interactive) business-initiated messages inside
the **24h customer-service window**. Rather than block on Meta **template
approval**, the bot checks `wa_cloud_sessions.last_inbound_at`:

- **inside 24h** → rich interactive WhatsApp message (with action buttons)
- **outside 24h** → falls back to the existing **TXT.co.zw SMS** (`send-sms`)

New-bid pushes fire from an `AFTER INSERT` trigger on `bids`
(`notify_whatsapp_new_bid`), so they work for bids placed from **any** channel
(web, USSD, bot). Payment pushes fire from `payment-webhook`.

## Endpoints (one function, two surfaces)

| Method | Path | Caller | Auth |
| --- | --- | --- | --- |
| `GET`  | `/whatsapp-cloud` | Meta webhook verify | `hub.verify_token` == `WHATSAPP_VERIFY_TOKEN` |
| `POST` | `/whatsapp-cloud` | Meta messages | `x-hub-signature-256` (HMAC-SHA256, `WHATSAPP_APP_SECRET`) |
| `POST` | `/whatsapp-cloud/notify` | bid trigger + payment-webhook | `Bearer` == `CRON_SECRET` or service-role key |

## Environment

| Var | Required | Notes |
| --- | --- | --- |
| `WHATSAPP_PHONE_NUMBER_ID` | yes | from the Meta app's WhatsApp product |
| `WHATSAPP_ACCESS_TOKEN` | yes | permanent token; **unset ⇒ SIM mode** (payloads logged, not sent) |
| `WHATSAPP_VERIFY_TOKEN` | yes | your choice; entered in the Meta webhook config |
| `WHATSAPP_APP_SECRET` | yes | Meta app secret; **unset ⇒ signature check skipped (dev only)** |
| `CRON_SECRET` | yes | must equal the Vault secret `cron_secret` the bid trigger reads |
| `APP_URL` | no | default `https://zimlivestock.co.zw` |
| `LISTING_DURATION_DAYS` | no | default `7` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | auto | injected by Supabase |

## Deploy

```bash
supabase functions deploy whatsapp-cloud --no-verify-jwt   # Meta sends no Supabase JWT
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=... WHATSAPP_ACCESS_TOKEN=... \
  WHATSAPP_VERIFY_TOKEN=... WHATSAPP_APP_SECRET=...
```

`--no-verify-jwt` is required so Meta's unauthenticated webhooks reach the
function — it does its own signature / verify-token / Bearer auth internally.

In the Meta App dashboard → WhatsApp → Configuration:
- **Callback URL**: `https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/whatsapp-cloud`
- **Verify token**: the `WHATSAPP_VERIFY_TOKEN` value
- **Subscribe** the webhook field: `messages`

### Go-live / health check (no dashboard, no shell token)

The `/notify` path has a bearer-gated `selfcheck` action that runs the Graph API
calls *inside* the Edge runtime, where the Meta secrets already live — so the
access token never has to be exported to a shell. It returns metadata only.

```bash
FN=https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/whatsapp-cloud
# Inspect the token (validity, type, expiry, scopes, WABA id):
curl -s -X POST "$FN/notify" -H "Authorization: Bearer $CRON_SECRET" \
  -H 'Content-Type: application/json' -d '{"event":"selfcheck"}'
# Same, plus register the webhook (callback/verify/messages) + subscribe the WABA:
curl -s -X POST "$FN/notify" -H "Authorization: Bearer $CRON_SECRET" \
  -H 'Content-Type: application/json' -d '{"event":"selfcheck","subscribe":true}'
```

`WHATSAPP_ACCESS_TOKEN` must be a **permanent System User token** (Meta Business
Settings → System Users → Generate token, expiration **Never**, scopes
`whatsapp_business_messaging` + `whatsapp_business_management`). A temporary
API-Setup token expires in ~24h and `selfcheck` will report `is_valid:false`.

### DB prerequisites

Apply migration `20260601120000_whatsapp_cloud_bot.sql` and ensure the Vault
secret used by the existing end-auctions cron exists (the bid trigger reuses it):

```sql
select vault.create_secret('<CRON_SECRET value>', 'cron_secret');
```

## Test

```bash
# Unit tests (phone matching + Cloud API payload limits) — no DB/creds needed:
SUPABASE_URL=http://localhost SUPABASE_SERVICE_ROLE_KEY=x \
  deno test -A supabase/functions/whatsapp-cloud/index_test.ts

# Type check:
deno check supabase/functions/whatsapp-cloud/index.ts
```

For a full conversational run, `supabase start` (local DB + applied migrations),
`supabase functions serve whatsapp-cloud --no-verify-jwt`, and POST simulated
WhatsApp webhook bodies. With `WHATSAPP_ACCESS_TOKEN` unset the bot logs every
outbound payload (`[WA-CLOUD SIM]`) instead of calling Meta.
