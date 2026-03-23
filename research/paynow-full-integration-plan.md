# ZimLivestock × Paynow — Full Ecosystem Integration Plan

> Brainstorm document mapping every Paynow product and API to a ZimLivestock feature.
> Goal: Use the ENTIRE Paynow product ecosystem — not just the payment gateway.

---

## Paynow Product Family (Beyond the Payment Gateway)

Paynow isn't just a payment gateway. It's an ecosystem of 10+ products built by Softwarehouse (Pvt) Ltd / Webdev Group:

| # | Product | URL | What it is |
|---|---------|-----|------------|
| 1 | **Paynow Gateway** | paynow.co.zw | Payment acceptance (cards, mobile money, bank) |
| 2 | **BillPay** | billpay.paynow.co.zw | Bill payment API gateway — 106 billers integrated |
| 3 | **TopUp** | topup.co.zw | Airtime, data bundles, ISP, utility payments |
| 4 | **Paynow WhatsApp Bot** | +263 8644 729 100 | Buy airtime, pay bills via WhatsApp |
| 5 | **BuySafe Escrow** | Built into Gateway | Funds held until delivery confirmed |
| 6 | **ZIMRA Fiscalisation** | Via Panier API | Tax-compliant invoicing for every transaction |
| 7 | **Verified Merchant** | Dashboard | Trust badge, daily settlement, card acceptance |
| 8 | **Custom Forms / Cart** | Dashboard | No-code payment pages |
| 9 | **Disbursement API** | disbursement.paynow.co.zw | Send money OUT — pay sellers, refunds, payouts to EcoCash/bank |
| 10 | **txt.co.zw (SMS Gateway)** | usd.txt.co.zw | Bulk SMS, scheduled airtime topups, SMS API |

---

## NEW: Disbursement API — Pay Sellers Directly

**URL:** `https://disbursement.paynow.co.zw`
**Docs:** `https://disbursement.paynow.co.zw/swagger/ui/index`
**Access:** Requires approval from `support@paynow.co.zw`

This is the **missing piece** — until now we could only collect money. The Disbursement API lets us **send money OUT**.

### Full API Surface (from Swagger spec)

| # | Method | Endpoint | What it does |
|---|--------|----------|-------------|
| 1 | `POST /api/login` | Get bearer token (auth) | Returns `BearerToken` + `ExpiryDate` |
| 2 | `POST /api/logout` | Invalidate token | Session cleanup |
| 3 | `POST /api/disbursement` | **Send money to someone** | Idempotent — safe to retry |
| 4 | `GET /api/disbursement/{reference}` | Check disbursement status | Track payout |
| 5 | `GET /api/disbursements` | List all disbursements (T-30 days) | Reconciliation, filtering by date/account |
| 6 | `GET /api/wallet` | Check wallet balance | Know how much you can disburse |
| 7 | `GET /api/wallet/{walletId}` | Get specific wallet | Multi-wallet support |
| 8 | `GET /api/wallet/{walletId}/transactions` | Wallet transaction history | Full audit trail with pagination |

### Disbursement Channels (where you can send money)

| Channel | What it is |
|---------|-----------|
| **EcoCash** | Send to any EcoCash wallet |
| **OneMoney** | Send to any OneMoney wallet |
| **EcoCashBulk** | Bulk EcoCash disbursements |
| **InnBucks** | Send to InnBucks wallet |
| **O'mari** | Send to O'mari wallet |
| **CBZ** | Direct bank transfer to CBZ accounts |
| **UssdServer** | Generic USSD-based disbursement |

### Disbursement Request Schema

```json
{
  "Channel": "Ecocash",
  "DestinationAccountNumber": "0771234567",
  "DestinationAccountName": "John Farmer",
  "DestinationMobileNumber": "0771234567",
  "Amount": 1140.00,
  "CurrencyCode": "USD",
  "Reference": "ZL-PAYOUT-AUCTION-4521"
}
```

### Disbursement Statuses
- `Pending` — queued for processing
- `Processing` — in progress
- `Success` — money delivered
- `Failed` — delivery failed (check `ErrorCode` + `Error`)
- `Flagged` — held for review

### ZimLivestock Use Cases for Disbursement API

**Use Case 1: Automatic Seller Payout**
```
Buyer pays US$1,200 via EcoCash (Gateway API)
  → Paynow holds in BuySafe escrow
  → Buyer confirms delivery
  → 24hr dispute window passes
  → ZimLivestock triggers disbursement:
      POST /api/disbursement
      Channel: "Ecocash"
      Amount: 1140.00  (US$1,200 - 5% fee)
      DestinationMobileNumber: seller's EcoCash
  → Seller gets US$1,140 in their EcoCash wallet
```
**This is the full loop.** Collect via Gateway → Hold in BuySafe → Disburse to seller. No manual bank transfers.

**Use Case 2: Transport Driver Payment**
```
Buyer pays transport fee US$150
  → Animal delivered + buyer confirms
  → Disbursement to trucker's EcoCash:
      Amount: 142.50 (US$150 - 5% referral cut)
      DestinationMobileNumber: trucker's number
```

**Use Case 3: Agent Refunds**
```
Agent bid on item but lost auction
  → Refund deposit to agent owner's EcoCash:
      POST /api/disbursement
      Channel: "Ecocash"
      Amount: 50.00  (deposit refund)
      Reference: "ZL-REFUND-AGENT-123"
```

**Use Case 4: Bulk Seller Payouts (Weekly Settlement)**
```
Every Saturday at 8am:
  → Query all completed sales for the week
  → For each seller:
      POST /api/disbursement (Channel: "EcoCashBulk")
  → All sellers paid in one batch
  → GET /api/disbursements to reconcile
```

**Use Case 5: Airtime Rewards via Disbursement**
```
Seller lists first animal → reward US$1 airtime:
  POST /api/disbursement
  Channel: "Ecocash"
  Amount: 1.00
  DestinationMobileNumber: seller's phone
```

**Use Case 6: Wallet Monitoring**
```
Cron job every hour:
  GET /api/wallet → check balance
  If balance < US$500 → alert admin
  If balance < US$100 → pause disbursements
```

### Why This Changes Everything

Before: Buyer pays → we collect → we manually send money to seller via bank.
After: Buyer pays → BuySafe holds → delivery confirmed → **automatic EcoCash payout to seller**.

**No manual intervention. No bank transfers. No delays. The seller gets paid to their EcoCash automatically.**

This is what makes ZimLivestock a real marketplace, not just a listing site.

---

## NEW: txt.co.zw — SMS Gateway

**URL:** `https://usd.txt.co.zw` (USD-denominated) / `https://www.txt.co.zw`
**Pricing:** From 3 cents/SMS to Econet, NetOne, Telecel
**API:** Available for integration into third-party software
**Contact:** `info@text.co.zw`

### Features
- Single and bulk SMS to any country
- Delivery reporting
- Address book + group management
- Scheduled airtime topups (weekly/monthly)
- Email templates/newsletters
- API integration

### ZimLivestock Use Cases for SMS

**Use Case 1: Bid Notifications (the 80% who don't have push notifications)**
```
New bid on your Hereford Bull: US$1,200 from buyer in Harare.
3 bids total, 2h 15m remaining.
Reply ACCEPT to sell now or wait for auction end.
```
Most Zimbabwean farmers use feature phones or basic smartphones. SMS is the only reliable notification channel.

**Use Case 2: Auction Ending Alert**
```
⏰ Your Brahman Cow auction ends in 30 minutes!
Current bid: US$950. 5 bidders watching.
Open app: zimlivestock.co.zw/auction/4521
```

**Use Case 3: Payment Confirmation**
```
✅ Payment received: US$1,200 for your Hereford Bull.
Buyer: John M. (Harare)
Your payout of US$1,140 will be sent to EcoCash 077XXXXXXX within 24hrs.
```

**Use Case 4: Transport Coordination**
```
🚛 Transport booked for your purchase.
Driver: Tendai (078XXXXXXX)
Pickup: Masvingo Auction Yard, Sat 29 Mar, 8am
Delivery: Harare North, Sat 29 Mar, 2pm
```

**Use Case 5: Seller Onboarding (WhatsApp-free)**
```
Welcome to ZimLivestock! List your first animal:
1. Reply CATTLE, GOAT, SHEEP, PIG, or POULTRY
2. We'll call you to complete your listing
Or visit: zimlivestock.co.zw/sell
```
For sellers who don't use WhatsApp or the web app — SMS-based listing initiation.

**Use Case 6: Scheduled Airtime Rewards**
```
Use the Scheduled Topup feature:
- Every seller who lists an animal gets US$0.50 airtime weekly
- Top sellers (5+ listings) get US$2 airtime monthly
- Automated via txt.co.zw scheduled topup groups
```

**Use Case 7: Bulk Market Intel**
```
Weekly SMS to all registered farmers:
📊 This week's average prices:
Cattle: US$1,150 (+5%)
Goats: US$85 (-2%)
Sheep: US$120 (flat)
List now: zimlivestock.co.zw/sell
```

### Why SMS Matters in Zimbabwe

- Feature phone users (40%+ of rural population) can't use web apps
- Push notifications require internet connection — SMS doesn't
- SMS has 98% open rate vs 20% for email
- At 3 cents/message, sending 1,000 notifications costs US$30
- It's the only channel that reaches EVERY phone in Zimbabwe

### BillPay — The Hidden Gem (106 Billers)

BillPay is a **bill payment API gateway** with 106 integrated billers. Vendors integrate once and can process payments to any biller on the platform.

**How it works:**
- **Billers** upload member lists (API or web interface)
- **Vendors** integrate with a single API to pay any biller
- Members confirm account details before paying
- Instant reconciliation to member accounts
- Auto-configuration endpoint downloads biller artwork, descriptions, fields

**What you can pay via BillPay:**
- ZESA prepaid electricity
- ZINWA water
- Municipal councils (Harare, Bulawayo, Mutare, Gweru, etc.)
- University tuition (UZ, NUST, MSU, etc.)
- Insurance premiums
- Internet/broadband (TelOne, ZOL, Africom)
- School fees
- Subscriptions

### TopUp — Airtime & Data

**Services:**
- Airtime Direct (Econet, NetOne, Telecel) — no extra charges
- Data & social bundles
- NetOne OneFusion, EasyCall
- Econet Buddie, Telecel Go
- TelOne ADSL/Blaze LTE/FTTH
- ZOL broadband
- NetOne One-Fi

**Payment methods:** EcoCash, OneMoney, Zimswitch, Visa/MC

**WhatsApp Bot:** Message "airtime" to +263 8644 729 100 → guided purchase flow

### ZIMRA Fiscalisation (via Panier)

Zimbabwe now requires all transactions to be ZIMRA-fiscalised (tax-compliant). Through the Panier API:
- Every payment auto-generates a ZIMRA fiscal invoice
- Digital signature + hash verification
- PDF receipt emailed to customer
- Compliance deadline: 31 May 2025 (already in effect)

**Supported payment methods via Panier:** EcoCash (USD), InnBucks (USD)

---

## How ZimLivestock Should Use EVERY Product

### Gateway APIs → Core Auction Payments
*(Covered in detail below)*

### BillPay API → Seller Value-Add Services

**The insight:** Livestock sellers need to pay bills too. If we embed BillPay into our app, sellers never need to leave:

| Service | ZimLivestock Feature | Why sellers care |
|---------|---------------------|-----------------|
| **ZESA prepaid** | "Pay your electricity from auction earnings" | Farmers need power for water pumps, feed mills |
| **Municipal water (ZINWA)** | Pay water bills in-app | Rural farmers' #1 utility |
| **Veterinary fees** | Pay vet bills via BillPay | Direct link to livestock health |
| **School fees** | "Send your child to school with auction proceeds" | Emotional hook — livestock sales fund education |
| **Insurance** | Livestock insurance premium payments | Natural cross-sell |

**Implementation:** Integrate BillPay vendor API → show "Pay Bills" tab in seller dashboard → seller pays directly from their ZimLivestock balance/EcoCash.

**SEED pitch angle:** "We're not just a marketplace — we're the financial hub for livestock farmers. They sell cattle and pay school fees in the same app."

### TopUp API → Buyer/Seller Airtime Rewards

| Feature | How it works | Why |
|---------|-------------|-----|
| **Airtime rewards** | Complete a sale → get US$1 airtime bonus | Incentivize first listings |
| **Data bundle for listing** | "List your first animal, get 1GB data free" | Sellers need data to upload photos |
| **Referral reward** | Refer a seller → both get US$0.50 airtime | Growth loop |
| **Transport driver tips** | Buyer tips transporter in airtime | Practical — drivers always need airtime |

**Implementation:** TopUp API → automated airtime delivery to phone number after triggering event.

### ZIMRA Fiscalisation → Tax Compliance

**Why this matters for SEED:**
- Zimbabwe mandates ZIMRA fiscalisation for all commercial transactions
- If ZimLivestock generates fiscal invoices for every sale, we're ahead of every informal auction house
- Gives sellers a formal transaction record (useful for bank loans, tax returns)
- Buyers get a legitimate receipt with ZIMRA verification code

**Implementation:** Integrate Panier API → set `zimra_fiscalize: true` on every payment → auto-generate fiscal invoice → email to both buyer and seller.

**Pitch:** "Every ZimLivestock sale is ZIMRA-fiscalised. Sellers get formal transaction records they can show to banks for agricultural loans."

### WhatsApp Bot → Low-Tech Seller Access

**The problem:** Many livestock farmers don't have smartphones that can run our web app. But they ALL have WhatsApp.

| Feature | WhatsApp Flow |
|---------|--------------|
| **Check auction status** | "status" → "Your bull has 3 bids, highest US$1,200" |
| **Accept/reject bids** | "accept" → "Bid of US$1,200 accepted. Buyer will arrange transport." |
| **Confirm delivery** | "delivered" → triggers BuySafe release |
| **Pay bills from earnings** | "pay ZESA" → TopUp/BillPay flow via WhatsApp |
| **Get paid notification** | Auto-message: "US$1,140 settled to your CBZ account" |

**Implementation:** Build a WhatsApp Business API integration that bridges our backend. For MVP: manual WhatsApp-based ops (you ARE the bot).

### Verified Merchant → Trust Foundation

Register ZimLivestock as a Paynow Verified Merchant:
- ✅ Display "Paynow Verified" badge on every listing page
- ✅ Accept Visa/Mastercard (diaspora buyers sending money home for cattle)
- ✅ Daily settlement (sellers get paid next day, not next week)
- ✅ Disable BuySafe escrow for trusted repeat sellers (optional, speeds up flow)

**Cost:** Free — just requires identity verification through Paynow portal.

---

## The Full Ecosystem Vision

```
┌─────────────────────────────────────────────────────────────────┐
│                     ZIMLIVESTOCK APP                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   SELL                    BUY                    MANAGE          │
│   ────                    ───                    ──────          │
│   List animal             Browse                 Pay ZESA        │
│   Upload stock card       Place bid              Pay school fees │
│   Track bids              Win auction             Buy airtime    │
│   Confirm delivery        Pay (EcoCash/Card)      Pay water      │
│   Get settled             Track delivery          Pay insurance  │
│                           Dispute (24hr)          Pay vet bills  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                     PAYNOW ECOSYSTEM                             │
├────────┬──────────┬──────────┬──────────┬───────────────────────┤
│Gateway │ BillPay  │ TopUp    │ BuySafe  │ ZIMRA Fiscalisation   │
│10 APIs │ 106      │ Airtime  │ Escrow   │ Tax-compliant         │
│6 pay   │ billers  │ Data     │ Delivery │ invoicing for         │
│methods │          │ ISP      │ Dispute  │ every sale            │
│        │          │ ZESA     │ Mediate  │                       │
├────────┴──────────┴──────────┴──────────┴───────────────────────┤
│  Verified Merchant │ WhatsApp Bot │ Custom Forms │ Tokenization │
└────────────────────┴──────────────┴──────────────┴──────────────┘
```

---

## Revenue Opportunities from Full Integration

| Revenue stream | Paynow product | How |
|---------------|---------------|-----|
| Auction fees (5-6%) | Gateway | Core business |
| Bill payment commissions | BillPay vendor API | Earn commission on every bill paid through our app |
| Airtime margin | TopUp API | Small margin on airtime purchases |
| Transport booking fee | Gateway (or ticket API) | Fee per transport arrangement |
| Premium seller subscription | Gateway + tokenization | Monthly recurring charge via saved token |
| Diaspora remittance fee | Gateway (Visa/MC) | International buyers pay premium for Visa/MC |
| Livestock insurance referral | BillPay | Refer to insurance billers, earn commission |

**SEED pitch:** "ZimLivestock isn't a one-trick marketplace. We monetize across the entire livestock value chain — auctions, transport, bills, airtime, insurance — all through Paynow's ecosystem."

---

---

## Updated Integration Priority Matrix

| Priority | Product | ZimLivestock Feature | Effort | Impact |
|----------|---------|---------------------|--------|--------|
| **P0** | Gateway (collect) | Buyer pays for livestock | Already built | Critical |
| **P0** | **Disbursement API (payout)** | **Auto-pay sellers via EcoCash** | MEDIUM | **Game-changing** |
| **P0** | BuySafe escrow | Delivery confirmation + dispute | MEDIUM | Game-changing |
| **P0** | **txt.co.zw SMS** | **Bid alerts, payment confirmations** | LOW | **Critical for rural users** |
| P1 | BillPay (106 billers) | Sellers pay ZESA, school fees from earnings | MEDIUM | High |
| P1 | Tokenization | Saved cards, deposit holds | MEDIUM | High |
| P1 | TopUp | Airtime rewards for listings | LOW | Medium |
| P1 | ZIMRA Fiscalisation | Tax-compliant invoices | MEDIUM | High (compliance) |
| P2 | Verified Merchant | Trust badge, daily settlement | ZERO (dashboard) | High |
| P2 | InnBucks express | QR code payments | LOW | Medium |
| P3 | Passenger ticket | Transport booking | MEDIUM | Novel |
| P3 | Custom forms | Seller registration | ZERO (dashboard) | Low |

---

## The Complete Money Flow (with Disbursement)

```
┌──────────────────────────────────────────────────────────────────┐
│                    THE FULL LOOP                                  │
│                                                                   │
│  BUYER                                                            │
│    │                                                              │
│    ├─── Pays US$1,200 via EcoCash ──→ GATEWAY API (collect)      │
│    │                                                              │
│  PAYNOW                                                          │
│    │                                                              │
│    ├─── Holds funds ──→ BUYSAFE ESCROW                           │
│    │                                                              │
│  SELLER delivers animal                                          │
│    │                                                              │
│  BUYER confirms receipt ──→ 24hr dispute window                  │
│    │                                                              │
│  ZIMLIVESTOCK                                                    │
│    │                                                              │
│    ├─── POST /api/disbursement ──→ DISBURSEMENT API (payout)     │
│    │      Channel: "Ecocash"                                     │
│    │      Amount: US$1,140 (US$1,200 - 5% fee)                  │
│    │      → Seller's EcoCash wallet                              │
│    │                                                              │
│    ├─── POST /api/disbursement ──→ trucker's EcoCash             │
│    │      Amount: US$142.50 (transport - 5% cut)                 │
│    │                                                              │
│    ├─── SMS via txt.co.zw ──→ seller's phone                    │
│    │      "✅ US$1,140 sent to your EcoCash"                     │
│    │                                                              │
│    └─── SMS via txt.co.zw ──→ buyer's phone                     │
│           "Your Hereford Bull purchase is complete"               │
│                                                                   │
│  RESULT: US$60 revenue (5% of US$1,200)                         │
│          + US$7.50 transport referral cut                         │
│          + US$0.06 SMS cost                                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Open Questions for Paynow

1. **Disbursement API access** — How do we get approved? What are the fees per disbursement? (Contact: support@paynow.co.zw)
2. **txt.co.zw API docs** — Where is the SMS API documentation? (Contact: info@text.co.zw)
3. **BillPay vendor API access** — How do we register as a BillPay vendor? What's the commission structure?
4. **BuySafe delivery confirmation API** — Can we confirm delivery programmatically or only via dashboard?
5. **ZIMRA fiscalisation** — Do we need our own Panier account, or can Paynow handle this?
6. **Disbursement + BuySafe integration** — Can we auto-trigger disbursement when BuySafe releases funds?
7. **Cloudflare timeline** — When will the Gateway API be moved to a separate subdomain?
8. **Wallet funding** — How do we top up our disbursement wallet? Auto-sweep from Gateway collections?

---

## Paynow Product Ecosystem (Complete Map)

### APIs & Endpoints

| # | API | Endpoint | What it does |
|---|-----|----------|-------------|
| 1 | **Initiate Transaction** (Web) | `POST /interface/initiatetransaction` | Creates a payment, returns `browserurl` for redirect checkout |
| 2 | **Express Checkout** (Mobile) | `POST /interface/remotetransaction` | In-app payment — EcoCash, OneMoney, InnBucks, O'mari, Zimswitch, Visa/MC |
| 3 | **Passenger Ticket Transaction** | `POST /interface/initiatetickettransaction` | Airline ticket payments with passenger/flight data |
| 4 | **Poll Status** | `POST {pollurl}` | Empty POST to check transaction status |
| 5 | **Merchant Trace** | `POST /interface/trace` | Find transaction by merchanttrace when pollurl is lost |
| 6 | **Status Update (Webhook)** | `POST {resulturl}` | Paynow pushes status changes to your server |
| 7 | **Tokenization** | `tokenize=true` on initiate | Returns reusable token for recurring payments |
| 8 | **Token Payment** | Express checkout with `token` field | Charge a saved card/wallet without customer interaction |
| 9 | **O'mari OTP Flow** | Express checkout → `POST {remoteotpurl}` | Two-step OTP verification for O'mari payments |
| 10 | **BuySafe Escrow** | Automatic (enabled by default) | Holds funds until delivery confirmed, 24hr dispute window |

### Payment Methods Supported

| Method | Type | Express Checkout? | Tokenizable? |
|--------|------|-------------------|-------------|
| EcoCash | Mobile money (USSD) | Yes | No |
| OneMoney | Mobile money (USSD) | Yes | No |
| InnBucks | Mobile money (code) | Yes | No |
| O'mari | Mobile money (OTP) | Yes | No |
| Telecash | Mobile money | Via web only | No |
| Visa/Mastercard (local) | Card | Yes (with token) | Yes |
| Visa/Mastercard (foreign) | Card | Yes (with token) | Yes |
| Zimswitch | Debit card | Yes (with token) | Yes |
| Vpayments | Bank transfer | Via web only | No |
| CABS | Bank | Via web only | No |

### Settlement

| Payment method | Settlement time |
|---------------|----------------|
| EcoCash, OneMoney, Telecash, Vpayments | T+1 (next day) |
| Local Visa/Mastercard | T+2 |
| Foreign Visa/Mastercard | T+3 |
| Verified merchants | Daily (Mon–Sat) |
| Non-verified merchants | Weekly (Tuesdays) |

### Merchant Tools

| Tool | What it does |
|------|-------------|
| BuySafe Escrow | Default escrow — holds funds until delivery confirmed |
| Verified Merchant badge | Trust signal, enables daily settlement + card payments |
| Custom Forms | Create payment forms with dropdowns/validation |
| Paynow Cart | Shopping cart for sites without one |
| Payment method control | Merchants can enable/disable specific methods |
| Fee passthrough | Absorb fees, pass to buyer, or split |
| Topup.co.zw | Airtime/internet top-up platform (EcoNet, NetOne, Telecel, TelOne, etc.) |

---

## How ZimLivestock Should Use Every API

### 1. Web Payments — `initiatetransaction`
**Feature:** Standard checkout for desktop/laptop users

**ZimLivestock use case:** Buyer wins auction → clicks "Pay Now" → redirected to Paynow hosted checkout page → pays with any method → redirected back

**Fields we use:**
- `amount` — winning bid amount
- `reference` — `ZL-{auction_id}-{timestamp}`
- `additionalinfo` — "Payment for {breed} {category} — Auction #{id}"
- `authemail` — buyer's email (auto-login)
- `tokenize=true` — save card for future purchases
- `resulturl` — our webhook endpoint
- `returnurl` — `/payment-status/{reference}`

**Why it matters:** This is the baseline. Every buyer can pay from any device.

---

### 2. Express Checkout (EcoCash/OneMoney) — `remotetransaction`
**Feature:** In-app mobile money payment without redirect

**ZimLivestock use case:** Buyer pays directly from the app — USSD prompt sent to their phone. No redirect, no leaving the app. This is how 80%+ of Zimbabwe transacts.

**Implementation:**
```
POST /interface/remotetransaction
method=ecocash
phone=0771234567
amount=1200.00
reference=ZL-ABC123
```

**Why critical:** At livestock auctions, buyers use EcoCash. If we redirect them to a browser page, we lose them. Express checkout keeps them in-app.

---

### 3. InnBucks Express Checkout
**Feature:** Pay with InnBucks authorization code or QR code

**ZimLivestock use case:** Young/urban buyers who use InnBucks. After initiating:
- We display the `authorizationcode` on screen
- Generate a QR code from the deep link: `schinn.wbpycode://innbucks.co.zw?pymInnCode={code}`
- Buyer scans QR or enters code in InnBucks app
- We poll until `status=Paid`

**Why valuable:** InnBucks is growing in the under-30 demographic. Supporting it differentiates us from auction houses that only take cash/EcoCash.

---

### 4. O'mari OTP Flow
**Feature:** Two-step OTP verification payment

**ZimLivestock use case:** For O'mari users:
1. Initiate express checkout with `method=omari`
2. System sends SMS with OTP to buyer
3. We display an OTP input field in-app
4. Buyer enters OTP → we POST to `remoteotpurl`
5. Payment completes

**Implementation detail:** Max 5 OTP attempts before cancellation. We need to show a countdown/attempt counter in the UI.

---

### 5. Tokenization + Recurring Payments
**Feature:** Save buyer's card, charge it later without their interaction

**ZimLivestock use cases:**

**a) Repeat buyer quick-pay:**
- First purchase: `tokenize=true` → Paynow returns `token` + `tokenexpiry` in webhook
- Second purchase: Express checkout with `token={saved_token}` → instant charge, no card re-entry
- "Pay with saved card •••• 4081" button in checkout

**b) Deposit holds:**
- Buyer registers for auction → we tokenize a US$50 hold
- When they win, charge the token for the full amount
- If they don't win, token expires naturally (up to 6 months)

**c) Subscription/membership:**
- "Premium seller" monthly fee — charge token on the 1st of each month
- Agent subscription — automated bidding agents charge token when they win

**d) Installment payments:**
- High-value livestock (US$2,000+ cattle): split into 3 token charges over 3 months
- Seller gets BuySafe escrow release on first payment, we hold the rest

**Why this is huge:** No other livestock platform in Zimbabwe offers saved payment methods or installments. This is a competitive moat.

---

### 6. BuySafe Escrow — Default on all transactions
**Feature:** Paynow holds funds until delivery confirmed, 24hr dispute window

**ZimLivestock use case — THIS IS THE KILLER FEATURE:**

The #1 problem at livestock auctions is trust. BuySafe solves it for free:

```
Buyer pays → Paynow holds funds (status: "Awaiting Delivery")
  → Seller transports animal
  → Buyer confirms receipt in app
  → Merchant (us) confirms delivery to Paynow
  → Status changes to "Delivered"
  → 24hr dispute window opens
  → If no dispute: funds released to seller (status: "Paid")
  → If disputed: Paynow mediates
```

**How we implement it:**
1. Buyer pays → status = `Awaiting Delivery`
2. Seller ships → we track transport status in-app
3. Buyer clicks "I received the animal" → we call... (BuySafe delivery confirmation is likely manual via Paynow dashboard for now, or we need to confirm if there's an API endpoint)
4. 24hr window → buyer can dispute via Paynow website
5. Funds release → seller gets paid

**What we tell sellers:** "Your money is held safely by Paynow — Zimbabwe's largest payment gateway — until the buyer confirms they received your animal. No more cash-in-hand risk."

**What we tell buyers:** "Your money is protected. If the animal isn't as described, you have 24 hours to dispute through Paynow's mediation service."

**Marketing angle:** "ZimLivestock — the only marketplace where your money is protected by Paynow BuySafe."

---

### 7. Passenger Ticket Transaction — `initiatetickettransaction`
**Feature:** Airline-style ticket payments with passenger data

**ZimLivestock use case — TRANSPORT TICKETS:**

This is creative but could work: when a buyer purchases transport for their livestock, we use the passenger ticket API to record the transport details:

- `passengerFirstname` / `passengerLastname` → Animal owner name
- `departureLocationCode` → Origin (e.g., "HRE" for Harare auction yard)
- `arrivalLocationCode` → Destination (buyer's farm)
- `departureDate` → Transport pickup date
- `pnr` → Transport booking reference
- `journeytype` → "oneway" (livestock doesn't come back!)

**Why:** This gives us a structured, Paynow-tracked record of every transport transaction. The payment and transport are linked in Paynow's system. If there's a dispute about transport, there's a clear audit trail.

**Caveat:** This is a stretch use of the API — designed for airlines. We'd need to confirm with Paynow that non-airline use is acceptable. But the data structure fits perfectly.

---

### 8. Merchant Trace — `POST /interface/trace`
**Feature:** Find lost transactions by merchant trace ID

**ZimLivestock use case — RECONCILIATION:**

If our webhook misses a status update (server down, network issue), we can recover:
```
POST /interface/trace
merchanttrace=ZL-AUCTION-4521-BID-WIN
id={integration_id}
hash={computed_hash}
```

This is critical for the autonomous agent system — agents place bids and payments automatically. If a payment status is lost, the agent can self-heal by tracing the transaction.

**Implementation:** Add a reconciliation cron job that traces any payment stuck in "pending" for >10 minutes.

---

### 9. Poll Status — `POST {pollurl}`
**Feature:** Check transaction status on demand

**ZimLivestock use case — REAL-TIME PAYMENT STATUS:**

Instead of waiting for webhooks (which may be delayed), we actively poll:
- Buyer is on payment status screen → poll every 5 seconds
- Mobile money (EcoCash/OneMoney): USSD prompt takes 10-30 seconds, poll until confirmed
- Show real-time status updates: "Waiting for EcoCash confirmation..." → "Payment received!"

**For agents:** Agent payment orchestrator polls after initiating payment to confirm before proceeding to next auction.

---

### 10. Fee Passthrough Control
**Feature:** Merchants choose who pays Paynow fees

**ZimLivestock use case — TRANSPARENT PRICING:**

Three options:
| Mode | Who pays Paynow fee | Our app fee | Buyer sees |
|------|---------------------|-------------|-----------|
| **Absorb** | Seller | 2% seller, 3% buyer | "US$1,200.00" |
| **Pass-through** | Buyer | 2% seller, 1.5% buyer (+ Paynow fee) | "US$1,200.00 + US$18.00 Paynow fee" |
| **Split** | Both | 2% seller, 2% buyer | "US$1,200.00 + US$9.00 processing" |

**Recommendation:** Use **absorb** mode and bake Paynow's fee into our 3-4% buyer fee. Simpler UX, no surprise charges. Total: 5-6% (vs auction house 12%).

---

### 11. Verified Merchant Status
**Feature:** Trust badge, daily settlements, card payments

**ZimLivestock use case:**
- Register ZimLivestock as a Verified Merchant
- Display "Paynow Verified" badge on every listing
- Enable Visa/Mastercard for international diaspora buyers
- Daily settlements → sellers get paid faster → incentive to list

**For sellers:** "ZimLivestock is Paynow Verified — your payments are settled daily into your bank account."

---

### 12. Custom Payment Forms
**Feature:** Paynow-hosted forms with custom fields

**ZimLivestock use case — SELLER REGISTRATION PAYMENT:**
- New seller pays US$5 listing fee via Paynow custom form
- Form includes: farm name, location, livestock type (dropdown), phone number
- No code needed — configure in Paynow dashboard
- Useful for sellers who aren't tech-savvy (just send them a Paynow payment link)

---

## Integration Priority Matrix

| Priority | API | ZimLivestock Feature | Effort | Impact |
|----------|-----|---------------------|--------|--------|
| P0 | Web checkout | Basic buyer payment | LOW (already built) | Critical |
| P0 | Express checkout (EcoCash) | In-app mobile money | LOW (already built) | Critical |
| P0 | Express checkout (OneMoney) | In-app mobile money | LOW (already built) | High |
| P0 | BuySafe escrow | Trust + delivery confirmation | MEDIUM | **Game-changing** |
| P0 | Poll status | Real-time payment tracking | LOW (already built) | High |
| P1 | Tokenization | Saved cards, repeat purchases | MEDIUM | High |
| P1 | Express checkout (InnBucks) | QR code / auth code payment | LOW | Medium |
| P1 | Merchant trace | Transaction reconciliation | LOW | Medium |
| P1 | Verified Merchant | Trust badge, daily settlement | ZERO (dashboard setup) | High |
| P2 | Token recurring | Deposit holds, installments | MEDIUM | High |
| P2 | Express checkout (O'mari) | OTP flow payment | LOW | Low |
| P2 | Fee passthrough | Transparent pricing | LOW (config) | Medium |
| P3 | Passenger ticket | Transport booking payments | MEDIUM | Novel (portfolio) |
| P3 | Custom forms | Seller registration | ZERO (dashboard) | Low |

---

## The BuySafe Story — Our Competitive Moat

This is the single most important integration. Here's why:

**The auction house problem:**
- Cash changes hands at the auction — no protection
- If the animal is sick after purchase, buyer has no recourse
- Transport disputes happen weekly — who's responsible?
- Trust depends on personal relationships, not systems

**Our solution with BuySafe:**
```
┌─────────────────────────────────────────────────────┐
│                   BUYER PAYS                         │
│  US$1,200 via EcoCash → Paynow holds in escrow     │
├─────────────────────────────────────────────────────┤
│               SELLER TRANSPORTS                      │
│  Tracked via transport partner + in-app status      │
├─────────────────────────────────────────────────────┤
│            BUYER CONFIRMS RECEIPT                    │
│  "I received the animal" → tap in app              │
├─────────────────────────────────────────────────────┤
│            24-HOUR DISPUTE WINDOW                    │
│  Buyer can dispute → Paynow mediates               │
├─────────────────────────────────────────────────────┤
│              FUNDS RELEASED                          │
│  Seller gets US$1,200 - fees → bank account         │
└─────────────────────────────────────────────────────┘
```

**For the SEED presentation:**
> "Unlike physical auctions where cash changes hands with zero protection, every ZimLivestock transaction is held in Paynow's BuySafe escrow until the buyer confirms delivery. This isn't a feature we built — it's Paynow's infrastructure. We're the first livestock marketplace in Zimbabwe to leverage it."

---

## What We've Already Built vs What's Left

| API | Code exists? | Deployed? | Works end-to-end? |
|-----|-------------|-----------|-------------------|
| Web checkout (`initiatetransaction`) | Yes (257 LOC) | Yes | Blocked (Cloudflare) |
| Express checkout EcoCash | Yes (in same function) | Yes | Blocked (Cloudflare) |
| Express checkout OneMoney | Yes (in same function) | Yes | Blocked (Cloudflare) |
| Poll status | Yes (frontend polling) | Yes | Blocked (Cloudflare) |
| Webhook handler | Yes (146 LOC, 3 hash strategies) | Yes | Can't test (no inbound webhooks) |
| Tokenization | Field exists (`tokenize=true`) | Partial | Need to add token storage + UI |
| Token payment | Not yet | No | Need express checkout with token |
| InnBucks flow | Not yet | No | Need QR code display + auth code UI |
| O'mari OTP flow | Not yet | No | Need OTP input UI + POST to remoteotpurl |
| BuySafe integration | Not yet | No | Need delivery confirmation flow |
| Merchant trace | Not yet | No | Need reconciliation cron |
| Passenger ticket | Not yet | No | Need transport booking flow |
| Go backend equivalents | Yes (444 LOC client + 643 LOC orchestrator) | Yes | Blocked (same Cloudflare issue) |

---

## Action Plan — Making It All Work Despite Cloudflare

### Option A: Wait for Paynow to fix (recommended in DX report)
- We've documented the issue
- Forum confirms it's known
- If they move to `api.paynow.co.zw`, everything we've built works immediately

### Option B: VPS Relay Proxy
- Rent a DigitalOcean/Hetzner VPS with static IP in South Africa
- Run a tiny Express/Go proxy: `Edge Function → VPS → Paynow`
- Cost: ~US$5/month
- Adds ~50-100ms latency
- Risk: VPS becomes single point of failure

### Option C: Manual Payment Confirmation (for demo/MVP)
- Buyer initiates payment → we show Paynow reference
- Buyer pays manually (EcoCash/bank) using reference
- Seller confirms receipt in app → we poll Paynow to verify
- Works for low-volume MVP without API access

### Option D: Browser-based relay (creative hack)
- Since browsers CAN reach Paynow (pass Cloudflare challenge)
- Build a thin client-side Paynow SDK that initiates from the browser
- Webhook still needs server → use Option B for inbound only
- Risk: exposes integration key to client (INSECURE for production)

**Recommended path:**
1. **Now:** Build all the UX for every payment method (InnBucks QR, O'mari OTP, BuySafe flow, tokenization UI)
2. **Now:** Use Option C (manual confirmation) for the first real transaction
3. **Week 3:** Try Option B (VPS relay) to unlock full API access
4. **Ongoing:** Document everything for the DX report — "here's what we had to do because the API is behind Cloudflare"

---

## Open Questions for Paynow

1. **BuySafe delivery confirmation** — Is there an API endpoint to confirm delivery programmatically, or must it be done via the Paynow dashboard?
2. **Passenger ticket API for non-airline use** — Can we use `initiatetickettransaction` for livestock transport bookings?
3. **Tokenization access** — Do we need special permission? (Docs say "contact support@paynow.co.zw")
4. **Express checkout for Telecash** — The docs list EcoCash, OneMoney, InnBucks, O'mari, Zimswitch, VMC but not Telecash. Is Telecash express checkout supported?
5. **Cloudflare timeline** — Is there a plan to move the API to a separate subdomain?

---

*Created: 23 March 2026*
*Purpose: Map every Paynow capability to ZimLivestock features for full ecosystem integration*

Sources:
- [Paynow Developer Hub](https://developers.paynow.co.zw/)
- [Express Checkout Transactions](https://developers.paynow.co.zw/docs/express_checkout_transactions.html)
- [Status Update / Webhook](https://developers.paynow.co.zw/docs/status_update.html)
- [Initiate Transaction](https://developers.paynow.co.zw/docs/initiate_transaction.html)
- [Passenger Ticket Transaction](https://developers.paynow.co.zw/docs/initiate_ticket_transaction.html)
- [Polling for Status](https://developers.paynow.co.zw/docs/polling_status.html)
- [Paynow Business Home](https://www.paynow.co.zw/home/businesshome)
- [Merchant FAQ](https://www.paynow.co.zw/home/merchanttutorial)
- [Paynow GitHub](https://github.com/paynow)
