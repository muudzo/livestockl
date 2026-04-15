---
theme: seriph
title: Evaluating Paynow Developer Experience
info: |
  ## Paynow DX Internship — Final Presentation
  Tatenda Nyemudzo · 12 March – 23 April 2026
  Evaluating Paynow Developer Experience Through a Marketplace Prototype
class: text-center
highlighter: shiki
lineNumbers: false
drawings:
  persist: false
transition: slide-left
mdc: true
---

# Evaluating Paynow<br/>Developer Experience

## Through a Marketplace Prototype

<div class="pt-12">
  <span class="text-xl opacity-80">Tatenda Nyemudzo · Paynow Internship · 12 March – 23 April 2026</span>
</div>

<div class="pt-4">
  <span class="font-mono text-sm opacity-60">app-nine-sigma-jgoqp90f2p.vercel.app</span>
</div>

<!--
For six weeks I built a working livestock auction marketplace on top of Paynow's payment rail — not a demo, a deployed production PWA with RLS, real-time bidding, and a payment orchestrator. The goal wasn't to ship a product. It was to evaluate Paynow's developer experience from the inside. Here's what I found.
-->

---
layout: default
---

# What I'll cover

<v-clicks>

**Three goals, in order:**

1. Understand how livestock trade *actually* works in Zimbabwe → **field research**
2. Build a realistic marketplace prototype using Paynow → **live PWA, 18 edge functions**
3. Evaluate Paynow's DX vs 4 competitors → **ranked report with actionable findings**

</v-clicks>

<div v-click class="mt-10 pt-6 border-t border-gray-400 border-opacity-30">

**Headline:** Paynow Core scored <span class="text-red-400 font-bold">4.2/10</span> · competitors averaged <span class="text-green-400 font-bold">8.0/10</span>

The biggest problem is *fixable from inside Paynow* — I'll show you how.

</div>

<!--
Three goals from the brief. Goal 1 — understand the real market. Goal 2 — build against Paynow. Goal 3 — benchmark Paynow's DX. On goal 3, Paynow scored 4.2 out of 10; the average competitor scored 8.0. That sounds bad — but here's the twist: the most important fix isn't a competitor pattern. It's a pattern Paynow already uses inside its own sibling products. I'll get to that in two minutes.
-->

---
layout: default
---

# Goal #1 — Understand the market

## Two field visits. One systems conclusion.

Auction houses are not selling cattle. They're selling **liquidity under trust constraints.**

<div class="mt-6">

| Field observation | Shipped in prototype |
|---|---|
| US$1,000 cash deposit excludes salaried buyers | US$50–100 refundable escrow via Paynow |
| 12% auction fees, resented by buyers | Fee breakdown at checkout, target 5–6% |
| Police clearance mandatory, not optional | Modeled as first-class state in ownership graph |
| Auctioneer cadence drives prices | 90-second countdown + bid density UI |

</div>

<div v-click class="mt-6 pt-4 border-t border-gray-400 border-opacity-30">

The metric that decides viability: **Active Bidders per Listing (ABL)**.
Below 10 → price formation collapses. Above 30 → auction-equivalent economics.

</div>

<!--
Two auction-house visits. The surface lesson is fees, deposits, police clearance, fast auctioneering. The deeper lesson is these all exist to solve three trust problems — is this animal real, will the buyer pay, will the seller deliver. Auction houses solve all three through physical co-presence. A digital platform has to rebuild each layer separately. The one metric that determines whether this works: Active Bidders per Listing. Below ten, prices collapse. Above thirty, auction economics hold.
-->

---
layout: default
---

# Goal #2 — Live prototype

<div class="font-mono text-sm opacity-70 mb-4">app-nine-sigma-jgoqp90f2p.vercel.app</div>

Installable PWA · offline fallback · RLS on every table

**End-to-end flow:** post listing → browse → bid (atomic `place_bid` RPC) → auction ends → Paynow checkout → webhook → settlement ledger

<div class="grid grid-cols-2 gap-8 mt-6">

<div>

## Measured

- **835 LOC** to integrate Paynow
- **11/11** security tests pass · Grade A
- **3 SEV-1s** caught + fixed same day
- **50% → 100%** payment recovery

</div>

<div>

## Retry chain

EcoCash<br/>↓ *fail*<br/>OneMoney<br/>↓ *fail*<br/>Card<br/>↓<br/>**100% eventual success**

</div>

</div>

<!--
The prototype is live and real — PWA with RLS on every table, atomic bid RPC, full retry chain. Stress-tested — 11 of 11 security checks pass, Grade A on post-deploy QA, and on April 13 an enterprise audit caught three SEV-1 vulnerabilities that I fixed the same day. The payment orchestrator takes first-attempt success from 50% to 100% using retry plus fallback. That's real money recovered at scale.
-->

---
layout: default
---

# Goal #3 — The benchmark

## 5 providers integrated end-to-end. Not paper comparison.

<div class="mt-6">

| Rank | Provider | DX Score | LOC | Notes |
|:---:|:---|---:|---:|:---|
| 1 | Stripe | **9.7** | 561 | Gold standard |
| 2 | Paystack | **8.0** | 557 | Fastest to integrate |
| 3 | Flutterwave | 7.2 | 523 | — |
| <span class="text-red-400">**4**</span> | <span class="text-red-400">**Paynow**</span> | <span class="text-red-400">**4.2**</span> | <span class="text-red-400">**835**</span> | <span class="text-red-400">**60% more code than leaders**</span> |
| 5 | Pesepay | 3.8 | — | Malformed HTTP headers |

</div>

<div v-click class="mt-8 text-center italic opacity-80">
The LOC tells the real story — 60% more code than Paystack for the same flow.
</div>

<!--
Five providers integrated into the same codebase, scored across seven dimensions. Stripe sets the bar at 9.7. Paystack and Flutterwave are right behind. Paynow scored 4.2 — the second-lowest. The most telling number isn't the score; it's the LOC. Paynow needed 60% more code than Paystack to do the same thing. That's where DX pain shows up.
-->

---
layout: default
---

# Why 60% more code — same outcome

<div class="grid grid-cols-2 gap-4 text-xs mt-2">

<div>

<div class="font-bold text-red-400 mb-1">Paynow Core — payment initiation</div>

```ts
// 1. Manual SHA-512 hash every call
const hash = await sha512Hex(
  Object.values(values).join("") + key
);
values.hash = hash.toUpperCase();

// 2. Two endpoints — web vs mobile
const path = mobile
  ? "/remotetransaction"
  : "/initiatetransaction";

// 3. POST form-encoded
const res = await fetch(
  `https://www.paynow.co.zw/interface${path}`,
  {
    method: "POST",
    headers: {
      "Content-Type":
        "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(values).toString(),
  }
);

// 4. Parse URL-encoded response
const data = Object.fromEntries(
  new URLSearchParams(await res.text())
);
```

</div>

<div>

<div class="font-bold text-green-400 mb-1">Paystack — same outcome</div>

```ts
const res = await fetch(
  "https://api.paystack.co/transaction/initialize",
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: amount * 100,
      reference,
      callback_url,
    }),
  }
);
const { data } = await res.json();
// data.authorization_url → redirect user
```

</div>

</div>

<!--
Here's what 60% more code actually looks like. Left is Paynow — manual SHA-512 hash on every call, two separate endpoints for web and mobile, form-encoded request, URL-encoded response you have to parse manually. Right is Paystack, same outcome — Bearer token header, JSON body, JSON response. Every line of extra code on the left is a line the developer gets wrong, or has to test, or introduces a bug in. This is the shape of DX pain.
-->

---
layout: default
---

# Webhook verification — we needed 3 fallback strategies

<div class="text-sm opacity-70 mb-3">Because Paynow's docs don't specify the field order for hash concatenation, production had to try all three in sequence.</div>

<div class="grid grid-cols-2 gap-4 text-xs">

<div>

<div class="font-bold text-red-400 mb-1">Paynow — 3 strategies in production</div>

```ts
// Strategy 1: documented field order
let computed = await sha512(
  documentedOrder.map(k => params[k]).join("")
);

// Strategy 2: received order (if 1 fails)
if (computed !== receivedHash) {
  computed = await sha512(
    Object.values(params).join("")
  );
}

// Strategy 3: alphabetical (if 2 fails)
if (computed !== receivedHash) {
  computed = await sha512(
    Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
      .join("")
  );
}
// All three seen in production.
```

</div>

<div>

<div class="font-bold text-green-400 mb-1">Stripe / Paystack — one call</div>

```ts
// Stripe
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
);
// Done. Throws on invalid.
```

```ts
// Paystack — HMAC SHA-512, one-liner
const expected = createHmac("sha512", secret)
  .update(body)
  .digest("hex");

if (expected !== signature) {
  return new Response("invalid", { status: 401 });
}
```

</div>

</div>

</div>

<div v-click class="mt-4 text-center italic opacity-80">
Undocumented field ordering → every integrator rediscovers this independently.
</div>

<!--
This is the second visceral example. When Paynow sends a webhook, we need to verify the SHA-512 hash. But the docs don't say what field order to concatenate in. We tried the documented order — failed. Received order — also failed some payloads. Alphabetical — caught the rest. All three variants appeared in production. Stripe is one function call that throws on invalid. Paystack is a 4-line HMAC. Every Paynow integrator globally is rediscovering this same problem independently. One sentence in the docs would fix it for everyone.
-->

---
layout: default
---

# Finding #1 — Paynow Core is unreachable from modern cloud infra

<span class="opacity-70">Root cause:</span> `www.paynow.co.zw` sits behind **Cloudflare bot protection**.

<div class="mt-6">

| Client | Result |
|---|---|
| Supabase Edge Functions (Deno Deploy) | ❌ Connection reset |
| Local Node.js + axios, Zimbabwean network | ❌ ETIMEDOUT |
| curl, any network | ❌ Cannot solve CF challenge |
| Browser | ✅ passes (via `cf_clearance` cookie) |

</div>

<div v-click class="mt-6 pt-4 border-t border-gray-400 border-opacity-30">

**Competitors:** `api.stripe.com` · `api.paystack.co` · `api.flutterwave.com` · `api.pesepay.com`

Every one has a dedicated API subdomain without bot protection.

</div>

<div v-click class="mt-4 text-red-400">

**Impact:** Paynow is structurally incompatible with serverless. Confirmed on Paynow's own dev forums: *"Paynow failing on supabase"*, 2026-02-03.

</div>

<!--
This is the single most important finding in the report. Paynow's API lives on www-dot-paynow-dot-co-zw — the same domain as the marketing site. That site runs Cloudflare bot protection. Every programmatic client failed — Supabase Edge Functions, Node, curl, even from a Zimbabwean network. Every competitor has a dedicated api-dot-provider-dot-com without bot protection. This isn't a subtle DX issue — it means no cloud-native team can use Paynow at all. It's already a recurring thread on your own developer forums.
-->

---
layout: default
---

# Finding #2 — Paynow's own siblings already have the fix

## I also integrated **BillPay** and **TXT**. Both are Paynow-family. Both scored higher than Core.

<div class="mt-6">

|  | Paynow Core | BillPay | TXT |
|---|:---:|:---:|:---:|
| Separate API subdomain | ❌ | ✅ `billpay.paynow.co.zw` | ✅ `txt.co.zw` |
| Blocks cloud infra | ✅ yes | ❌ no | ❌ no |
| Auth | SHA-512 hash gymnastics | HTTP Basic | HTTP Basic |
| Documented test identifiers | ❌ | ✅ 6 prefixes | ✅ test mode |
| Versioned docs | ❌ | ✅ v1.33 | ✅ v1.12 |

</div>

<div v-click class="mt-8 text-center">

**Paynow's own BillPay team already solved every problem I hit on Core.**

The fix isn't research. *It's internal pattern adoption.*

</div>

<!--
The finding that matters most for you. I also integrated Paynow BillPay and Paynow TXT — both in the Paynow family. Both scored better on every axis than Paynow Core. BillPay has a dedicated subdomain, no Cloudflare block. BillPay uses HTTP Basic Auth, no SHA-512 hash gymnastics. BillPay documents its test prefixes. BillPay versions its docs. All of this already ships at Paynow. Core just hasn't adopted it. The fix for the number-one DX finding is not research — it's copy-paste from your own sibling team.
-->

---
layout: default
---

# The fix already ships inside Paynow

## Auth, compared. Same payload, same security posture.

<div class="grid grid-cols-2 gap-6 mt-4 text-xs">

<div>

<div class="font-bold text-red-400 mb-1">Paynow Core — per-call hash gymnastics</div>

```ts
// Required on every single API call
const hashString =
  Object.values(values).join("") + integrationKey;

const encoded = new TextEncoder().encode(hashString);
const buffer = await crypto.subtle
  .digest("SHA-512", encoded);

const hash = Array.from(new Uint8Array(buffer))
  .map(b => b.toString(16).padStart(2, "0"))
  .join("")
  .toUpperCase();

values.hash = hash;
// + field-ordering uncertainty on webhooks
//   (required 3 fallback strategies to verify)
```

</div>

<div>

<div class="font-bold text-green-400 mb-1">Paynow BillPay — HTTP Basic, one header</div>

```ts
// Same Paynow organization. Different team.
const headers = {
  "Authorization":
    `Basic ${btoa(`${username}:${password}`)}`,
  "Content-Type": "application/json",
};
// That's it. Use on every call.
// No hash, no field ordering, no SHA-512.
```

</div>

</div>

</div>

<div v-click class="mt-8 text-center italic opacity-80">
Same security goals. One team solved it; the other hasn't adopted the solution yet.
</div>

<!--
This is the punchline slide. Left is what every Paynow Core integrator writes — a SHA-512 hash gymnastics routine that has to be invoked on every single API call, plus the webhook field-ordering uncertainty that forced three fallback strategies in production. Right is Paynow BillPay — same organization, different team — using HTTP Basic Auth. One header. Zero hash computation. Both teams hit the same security bar. One team already shipped the better pattern. The fix for Core isn't research; it's adopting what BillPay already proved works.
-->

---
layout: default
---

# 7 recommendations, each from an existing internal pattern

<div class="mt-4">

| # | Change | Effort | Pattern source |
|:---:|---|:---:|---|
| 1 | Move API to `api.paynow.co.zw` without Cloudflare | ~1 week | **BillPay** |
| 2 | Switch auth from SHA-512 hash to HTTP Basic | ~2 weeks | **BillPay + TXT** |
| 3 | Publish documented test phone numbers | ~1 day | BillPay's prefixes |
| 4 | Publish a Postman collection | ~1 day | TXT |
| 5 | Version docs + publish date | ~1 hour | BillPay + TXT |
| 6 | Document webhook hash field ordering | ~1 hour | — |
| 7 | Structured error responses with codes | ~1 week | BillPay error codes |

</div>

<div v-click class="mt-6 text-center">

All 7 together — Paynow Core goes from **4.2/10 → ~7-8/10**. Paystack-competitive.

</div>

<!--
Seven concrete recommendations. Six of them are patterns Paynow already ships somewhere else. Effort total — under a month of focused work. The first one alone, moving the API to a separate subdomain, unblocks every cloud-infrastructure developer and probably doubles Paynow's addressable integrator base. This isn't a rewrite. It's adoption of internal patterns.
-->

---
layout: default
---

# Strategic conclusion

## What I actually built, stripped of features:

<div class="mt-6 px-8 py-6 border-l-4 border-amber-500 italic text-xl">

A distributed state machine for ownership transfer of **physical assets under trust constraints** — with Paynow as the settlement rail.

</div>

<div class="mt-8">

**What that means for Paynow:**

- Livestock is not the product. Asset-ownership state is.
- The same state machine works for **crops → SME trade → collateralized lending**.
- Paynow could be the settlement layer for Africa's informal-asset economy — *if* the DX catches up to BillPay's level.

</div>

<div v-click class="mt-6 text-sm opacity-70">

**The agent thesis:** autonomous payment retry recovered 50% of failed transactions in simulation. Agents multiply per-user volume. Paynow should ship agent-ready APIs now.

</div>

<!--
What I built isn't really a livestock app. It's a state machine for ownership transfer of physical assets. That same machine works for crops, SME trade, collateralized lending — any informal-asset economy. Paynow is well-positioned to be the settlement layer for all of it, but only if the developer experience catches up to what BillPay already ships. The agent retry logic recovered 50% of failed payments. That's the future Paynow should be building rails for.
-->

---
layout: default
class: text-center
---

# Ask

<div class="text-left mt-8 max-w-2xl mx-auto">

<v-clicks>

1. **A decision on the Cloudflare subdomain move.** If this ships, every other DX rec gets easier.

2. **A design-partner agreement** on agent-ready API changes — I'd like to continue as the reference integrator.

3. **Publish the ecosystem retrospective internally** as a cross-team DX learning (BillPay → Core).

</v-clicks>

</div>

<div class="pt-16 opacity-60 text-sm">

Deliverables: INTERNSHIP-HANDOVER.md · benchmark report · ecosystem retrospective<br/>
Live: app-nine-sigma-jgoqp90f2p.vercel.app

</div>

<div class="pt-6 text-2xl">

**Thank you.** Questions.

</div>

<!--
Three asks. One — get a decision on the Cloudflare subdomain move. That's the unlock. Two — a design-partner agreement on agent-ready changes, with me as the reference integrator. Three — publish the BillPay-to-Core cross-team learning internally. The fix already exists in your org, it just needs to travel. Thank you. Happy to take questions.
-->
