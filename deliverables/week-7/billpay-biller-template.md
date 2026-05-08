# BillPay Integration Template — ZimLivestock

> Filled out for Paynow's BillPay onboarding team per their template (received 2026-05-08).
> Companion API spec: [billpay-biller-api-spec.md](billpay-biller-api-spec.md).

## Contacts

### Operations Contact
*Resolves operational issues, payment/refund enquiries.*

| Field | Value |
|---|---|
| Name | **TBD** — Tatenda Nyemudzo (interim) |
| Email | dev@paynow.co.zw |
| Mobile | **TBD** |
| IM | **TBD** (WhatsApp) |

### Commercials Contact
*Authorizes commercial agreement.*

| Field | Value |
|---|---|
| Name | **TBD** — to be confirmed with ZimLivestock leadership |
| Email | **TBD** |
| Mobile | **TBD** |
| IM | **TBD** |

### Technical Support / Engineering Contact
*Addresses bugs, technical queries, missing functionality.*

| Field | Value |
|---|---|
| Name | Tatenda Nyemudzo |
| Email | dev@paynow.co.zw |
| Mobile | **TBD** |
| IM | **TBD** |

## Commercial Details

| Field | Value |
|---|---|
| ZIG Commission | **TBD** — propose **2.0%** of gross transaction value (matches typical BillPay biller terms) |
| USD Commission | **TBD** — propose **2.0%** |
| ZIG Settlement Account | **TBD** — Paynow merchant ID **23657** (current live integration), to be confirmed once ZimLivestock has its own merchant on record |
| USD Settlement Account | **TBD** — same as above |

## Technical Details — Test Environment

| Field | Value |
|---|---|
| URL | `https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/billpay-biller-inbound` |
| Username | `BILLPAY_BILLER_USERNAME` (provided to Paynow on a separate channel) |
| Password | `BILLPAY_BILLER_PASSWORD` (provided to Paynow on a separate channel) |
| Is Firewalled? | No — Supabase Edge Functions are public over HTTPS, but the function enforces HTTP Basic Auth + an IP allowlist (`BILLPAY_BILLER_ALLOWED_IPS`) at the handler level. Paynow's egress IPs need to be supplied so we can add them. |
| VPN Details | Not required. If Paynow needs an IP-pinned tunnel for ZIG settlement, we can spin up a Cloudflare Worker relay (we already operate one for outbound Paynow Express) — TBD. |

> **Action for Paynow:** please supply the static egress IP(s) you'll call our biller API from, so we can add them to `BILLPAY_BILLER_ALLOWED_IPS`. Until then the function will accept any IP that presents valid Basic credentials.

## Biller API Specification

ZimLivestock exposes a single Supabase Edge Function that routes three actions
(`member`, `pay`, `status`). Full request/response shapes, error codes, and
sample payloads are in the companion document
[billpay-biller-api-spec.md](billpay-biller-api-spec.md).

### 1. Get Member Details ✅

Endpoint: `GET /billpay-biller-inbound?action=member&member=<auction_reference>`

**Returns** (minimum):
- Member name (auction title — e.g. *"Brahman Bull"*)

**Returns** (beneficial):
- Member account currency (`USD`)
- Amount due (`amountDue`)
- Status (`Authorized` / `AlreadyPaid` / `NonExistent`)

### 2. Post a Payment ✅

Endpoint: `POST /billpay-biller-inbound` body `{action:'pay', member, amount, paynowReference}`

**Idempotent**: yes. Duplicate `paynowReference` short-circuits to the original
response. Enforced by a partial unique index on `payments.paynow_reference`
where `method = 'BillPay'`.

**Returns** (minimum):
- Our payment reference (the same `member` value — single-purpose) so the buyer
  can quote it if their account doesn't reflect the payment.

**Returns** (beneficial):
- Accepts BillPay's `paynowReference` for reconciliation.
- Returns `amountPaid`, `currency`, and `billerReference` (their reference echoed back).

### 3. Get Payment Status ✅

Endpoint: `GET /billpay-biller-inbound?action=status&reference=<our_reference>`

**Returns** (minimum):
- Payment status (`Pending` / `Paid` / `Failed` / `NonExistent`)
- Biller payment reference (Paynow's reference we recorded)

**Returns** (beneficial):
- Amount, currency, last-updated timestamp.
- Payment history per member: not provided in v1, but every inbound call is
  logged in `billpay_inbound_log` and exposed to Paynow's reconciliation team
  on request. Date-range listing endpoint deferred to v2.

### 4. Test Credentials & Environment ✅

| Field | Value |
|---|---|
| Test base URL | `https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/billpay-biller-inbound` |
| Auth credentials | HTTP Basic — username/password set as Supabase secrets (shared out-of-band) |
| Sample test member numbers | See [billpay-biller-api-spec.md § 5 — Test Fixtures](billpay-biller-api-spec.md#5-test-fixtures) |
| Test transactions affect live balances? | **Yes — same database**, but transactions are penny-range (≤ US$0.05) and prefixed `DEMO`. Until a true sandbox lands, Paynow can flag the test reference set we provide and we'll exclude them from settlement. |
| Dedicated isolated sandbox | **Roadmap (post-v1)**. v1 ships against the live database with `DEMO`-prefixed test references. v2 will spin up a parallel Supabase project for full isolation. |

### Open items for Paynow ⚠️

1. **Egress IP list** — needed to populate `BILLPAY_BILLER_ALLOWED_IPS`.
2. **Reference format** — we use our internal `payments.reference` (e.g. `ZL-AUTO-MOWHCJ9J-HEPJ`, ~22 chars). Confirm this fits BillPay's USSD entry length.
3. **Settlement account** — confirm whether Paynow settles via merchant transfer to integration **23657**, or whether a separate biller-settlement account is required.
4. **Commission split** — proposed 2.0% on USD/ZIG; awaiting Paynow's standard biller terms.
