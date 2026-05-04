# Paynow Merchant Services × Supabase — Integration Reference

**Audience:** Paynow senior engineers / merchant integration team.
**Source repo:** ZimLivestock (live).
**What this covers:** every Paynow Merchant Services product integrated against a Supabase backend (Edge Functions + Postgres + RLS), with the exact code paths we ship today. Snippets are verbatim — file paths and line ranges are included so reviewers can audit in-tree.

---

## 1. Architecture at a glance

```
Browser (React)
    │
    │  supabase.functions.invoke('initiate-payment')
    ▼
Supabase Edge Function (Deno)            ─── POST signed form ──▶  www.paynow.co.zw
  initiate-payment / billpay / payment-poll-sync                         │
    │                                                                    │  (Cloudflare blocks
    │  service-role writes                                               │   direct egress from
    ▼                                                                    │   Supabase IPs in
Postgres (payments / bill_payments / notifications)                      │   some regions)
    ▲                                                                    ▼
    │                                                       Cloudflare Worker relay
    │  hash-verified webhook ◀──── POST resulturl ─────────  paynow-relay (fallback)
    │
payment-webhook (Edge Function)
```

Three independent failure modes are covered:

| Failure                                          | Recovery path                                  |
|--------------------------------------------------|------------------------------------------------|
| Paynow webhook never arrives                     | `payment-poll-sync` polls pollurl every 20s    |
| Cloudflare blocks Supabase → Paynow direct call  | Browser-relay submission OR CF Worker relay    |
| Double-click / network retry on initiate         | Unique index on `(user_id, idempotency_key)`   |

---

## 2. Schema

Two tables hold all merchant-services state. RLS is enforced; only the **service role** writes status changes.

### 2.1 `public.payments` — Web/Express Checkout

`supabase/schema.sql:79-95`

```sql
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  livestock_id uuid not null references public.livestock_items(id),
  reference text unique not null,
  amount numeric not null check (amount > 0 and amount <= 100000),
  method text not null check (method in ('EcoCash', 'OneMoney', 'Card')),
  status text default 'pending' check (status in ('pending', 'paid', 'failed')),
  paynow_reference text,         -- stores the pollurl (not the paynowreference)
  phone text,
  idempotency_key uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists idx_payments_idempotency
  on public.payments (user_id, idempotency_key)
  where idempotency_key is not null;
```

### 2.2 `public.bill_payments` — BillPay Vendor API

`supabase/schema.sql:416-463`

```sql
CREATE TABLE IF NOT EXISTS public.bill_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  reference text UNIQUE NOT NULL,
  biller_code text NOT NULL,
  biller_name text NOT NULL,
  account_number text NOT NULL,
  account_holder text,
  amount numeric NOT NULL CHECK (amount > 0 AND amount <= 100000),
  total_amount numeric,
  currency text DEFAULT 'USD',
  requires_forex boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN (
    'pending', 'authorized', 'being_processed', 'paid', 'failed', 'flagged', 'reversed'
  )),
  -- Paynow references
  billpay_reference text,
  biller_payment_reference text,
  wallet_debit_reference text,
  -- Revenue tracking
  vendor_commission numeric DEFAULT 0,
  vendor_service_fee numeric DEFAULT 0,
  vendor_service_fee_currency text,
  -- Full API response data (JSONB)
  products jsonb DEFAULT '[]',
  auth_data jsonb,
  vouchers jsonb DEFAULT '[]',
  receipt_smses jsonb DEFAULT '[]',
  receipt_html jsonb DEFAULT '[]',
  display_data jsonb DEFAULT '{}',
  -- User-facing narration ONLY (never persist TechnicalNarration)
  narration text,
  -- Reconciliation tracking
  status_check_count integer DEFAULT 0,
  last_status_check_at timestamptz,
  flagged_at timestamptz,
  linked_payment_id uuid REFERENCES public.payments(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 2.3 RLS

`supabase/rls_policies.sql:69-77`

```sql
alter table public.payments enable row level security;

create policy "Users can view own payments"
  on public.payments for select
  using (auth.uid() = user_id);

create policy "Authenticated users can create payments"
  on public.payments for insert
  with check (auth.uid() = user_id);

-- No user-facing UPDATE policy — only the service role transitions status.
```

The service-role-only update rule is the security backbone of the integration: status can only ever change via a hash-verified webhook or a verified poll response.

---

## 3. Hash signing — Paynow Core API (SHA-512)

Both Web Checkout and Express Checkout sign with the same primitive: concat all form values in insertion order, append the integration key, SHA-512, uppercase hex.

`supabase/functions/initiate-payment/index.ts:56-64`

```ts
async function computePaynowHash(values: Record<string, string>, integrationKey: string): Promise<string> {
  const hashString = Object.values(values).join("") + integrationKey;
  const data = new TextEncoder().encode(hashString);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}
```

**Verification on the webhook side** strips the `hash` field and rebuilds the string in the *received* order — Paynow's callback ordering does not match initiation, so depending on `Object.values()` of an arbitrary object would break.

`supabase/functions/payment-webhook/index.ts:95-113`

```ts
async function verifyPaynowHash(params: Record<string, string>, integrationKey: string): Promise<boolean> {
  const receivedHash = params.hash;
  if (!receivedHash) return false;

  const values = Object.entries(params)
    .filter(([key]) => key.toLowerCase() !== "hash")
    .map(([, val]) => val);
  const hashString = values.join("") + integrationKey;

  const data = new TextEncoder().encode(hashString);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  const computed = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  return computed === receivedHash.toUpperCase();
}
```

---

## 4. Express Checkout — EcoCash / OneMoney USSD push

The only Paynow Merchant Services product that prompts the user's phone directly. We POST to `interface/remotetransaction` with `phone` and `method=ecocash|onemoney`.

`supabase/functions/initiate-payment/index.ts:189-247`

```ts
// ─── EXPRESS CHECKOUT: EcoCash/OneMoney with phone (USSD prompt) ───
if (isMobile) {
  const mobileValues: Record<string, string> = {
    id: integrationId,
    reference,
    amount: amount.toFixed(2),
    additionalinfo: `${livestockTitle || "Livestock Purchase"} — ${reference}`,
    authemail: Deno.env.get("PAYNOW_MERCHANT_EMAIL") || callerUser.email || "",
    phone: phone,
    method: paymentMethod.toLowerCase() === "ecocash" ? "ecocash" : "onemoney",
    resulturl: resultUrl,
    returnurl: returnUrl,
    status: "Message",
  };

  mobileValues.hash = await computePaynowHash(mobileValues, integrationKey);

  const formBody = Object.entries(mobileValues)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const paynowRes = await fetch("https://www.paynow.co.zw/interface/remotetransaction", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody,
  });

  const paynowBody = await paynowRes.text();
  const paynowParams: Record<string, string> = {};
  for (const pair of paynowBody.split("&")) {
    const [key, ...rest] = pair.split("=");
    paynowParams[decodeURIComponent(key)] = decodeURIComponent(rest.join("="));
  }

  if (paynowParams.status?.toLowerCase() === "ok" || paynowParams.status?.toLowerCase() === "sent") {
    await supabase
      .from("payments")
      .update({
        status: "pending",
        paynow_reference: paynowParams.pollurl || "",  // store pollurl for poll-sync
      })
      .eq("reference", reference);

    return jsonResponse({
      status: "ok",
      provider: "paynow",
      paymentMethod,
      instructions: paynowParams.instructions,
      pollUrl: paynowParams.pollurl,
      reference,
    });
  }
  // ... terminal-error handling (insufficient balance, suspended wallet, etc.)
}
```

### 4.1 Terminal-error classification

A **lesson learned the expensive way:** if EcoCash returns *insufficient balance*, falling through to web checkout creates a confusing redirect loop. Classify and fail fast.

`supabase/functions/initiate-payment/index.ts:256-288`

```ts
const lowerErr = mobileError.toLowerCase();
const isUserTerminal =
  lowerErr.includes("insufficient") ||
  lowerErr.includes("balance") ||
  lowerErr.includes("not enough") ||
  lowerErr.includes("subscriber") ||
  lowerErr.includes("invalid phone") ||
  lowerErr.includes("invalid number") ||
  lowerErr.includes("suspended") ||
  lowerErr.includes("blocked");

if (isUserTerminal) {
  // Mark payment failed so the client can retry cleanly
  await supabase.from("payments")
    .update({ status: "failed" })
    .eq("reference", reference)
    .eq("status", "pending");

  return jsonResponse({
    error: userMessage,                  // human-readable, method-specific
    code: "paynow_user_terminal",
    reference,
  }, 402);
}
```

---

## 5. Web Checkout — hosted page redirect

Used for card payments (Visa/Zimswitch via Paynow's hosted page) and as the fallback when Express Checkout isn't applicable.

`supabase/functions/initiate-payment/index.ts:296-346`

```ts
const formValues: Record<string, string> = {
  id: integrationId,
  reference,
  amount: amount.toFixed(2),
  additionalinfo: `${livestockTitle || "Livestock Purchase"} — ${reference}`,
  returnurl: returnUrl,
  resulturl: resultUrl,
  authemail: Deno.env.get("PAYNOW_MERCHANT_EMAIL") || callerUser.email || "",
  status: "Message",
};

formValues.hash = await computePaynowHash(formValues, integrationKey);

const paynowRes = await fetch("https://www.paynow.co.zw/interface/initiatetransaction", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: formBody,
});

// On status=ok, browser is redirected to paynowParams.browserurl
// pollurl is persisted to payments.paynow_reference for later poll-sync
```

---

## 6. Webhook receiver (`resulturl`)

Paynow POSTs `application/x-www-form-urlencoded` to `resulturl` on terminal status changes. We verify hash, then transition state — atomically guarded by `.eq("status", "pending")` so retries are idempotent.

`supabase/functions/payment-webhook/index.ts:115-163`

```ts
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = await req.text();
  const params = parsePaynowBody(body);

  const integrationKey = Deno.env.get("PAYNOW_INTEGRATION_KEY");
  if (!integrationKey) {
    return new Response("Webhook verification not configured", { status: 500 });
  }

  const valid = await verifyPaynowHash(params, integrationKey);
  if (!valid) return new Response("Invalid hash", { status: 403 });

  const reference = params.reference;
  const paynowRef = params.paynowreference || "";
  const status = (params.status || "").toLowerCase();

  if (status === "paid" || status === "delivered") {
    await completePayment(reference, paynowRef, log);
  } else if (status === "cancelled" || status === "failed" || status === "disputed") {
    await failPayment(reference, log);
  }
  // "awaiting delivery" / "sent" / "created" → still pending, no-op

  return new Response("OK", { status: 200 });
});
```

### 6.1 Idempotent state transition

`supabase/functions/payment-webhook/index.ts:13-65`

```ts
async function completePayment(reference: string, providerRef: string, log: Logger) {
  const { data: updated } = await supabase
    .from("payments")
    .update({
      status: "paid",
      paynow_reference: providerRef,
      updated_at: new Date().toISOString(),
    })
    .eq("reference", reference)
    .eq("status", "pending")        // ← guard: only transitions pending → paid
    .select("livestock_id, user_id, amount")
    .maybeSingle();

  if (!updated) {
    log.info("Payment already processed (idempotent skip)", { reference });
    return;
  }

  // Fan out: mark item sold, notify buyer, fetch + notify seller — in parallel
  const [, , sellerResult] = await Promise.all([
    supabase.from("livestock_items").update({ status: "sold" }).eq("id", updated.livestock_id),
    supabase.from("notifications").insert({
      user_id: updated.user_id,
      type: "payment",
      title: "Payment Confirmed",
      message: `Your payment of US$${updated.amount} has been confirmed.`,
      priority: "high",
    }),
    supabase.from("livestock_items").select("seller_id, title").eq("id", updated.livestock_id).single(),
  ]);

  if (sellerResult?.data) {
    await supabase.from("notifications").insert({
      user_id: sellerResult.data.seller_id,
      type: "payment",
      title: "Payment Received",
      message: `Payment of US$${updated.amount} received for ${sellerResult.data.title}.`,
      priority: "high",
    });
  }
}
```

---

## 7. Poll-sync fallback for missed webhooks

If the webhook is delayed, blocked, or dropped, the client invokes `payment-poll-sync` every 20s while still pending. The function fetches the stored `pollurl` server-side, **re-verifies the hash**, and applies the same transition logic.

`supabase/functions/payment-poll-sync/index.ts:191-225`

```ts
let paynowParams: Record<string, string>;
try {
  const paynowRes = await fetch(pollUrl, { method: "POST" });
  const paynowBody = await paynowRes.text();
  paynowParams = parsePaynowBody(paynowBody);
} catch (fetchErr) {
  return jsonResponse({ status: "pending", source: "poll_unreachable" });
}

// ─── Verify hash before trusting the body ───
const valid = await verifyPaynowHash(paynowParams, integrationKey);
if (!valid) {
  return jsonResponse({ error: "Invalid response signature" }, 502);
}

const paynowStatus = (paynowParams.status || "").toLowerCase();
if (paynowStatus === "paid" || paynowStatus === "delivered") {
  await completePayment(reference, paynowParams.paynowreference || "", log);
  return jsonResponse({ status: "paid", source: "poll" });
}
if (paynowStatus === "cancelled" || paynowStatus === "failed" || paynowStatus === "disputed") {
  await failPayment(reference, log);
  return jsonResponse({ status: "failed", source: "poll" });
}
return jsonResponse({ status: "pending", source: "poll", paynowStatus });
```

Client wiring (`src/hooks/usePayments.ts:67-94`):

```ts
export function usePaynowPoll(reference: string | undefined, currentStatus: string | undefined) {
  const queryClient = useQueryClient();
  const shouldPoll = isSupabaseConfigured && !!reference && currentStatus === 'pending';

  return useQuery({
    queryKey: ['paynow-poll-sync', reference],
    enabled: shouldPoll,
    refetchInterval: shouldPoll ? 20_000 : false,
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('payment-poll-sync', {
        body: { reference },
      });
      if (data?.status === 'paid' || data?.status === 'failed') {
        queryClient.invalidateQueries({ queryKey: ['payment-status', reference] });
      }
      return data;
    },
  });
}
```

---

## 8. Cloudflare egress workaround (relay pattern)

Some Supabase Edge Function regions egress through IP ranges that `www.paynow.co.zw` (Cloudflare-fronted) rate-limits or blocks. Our two-tier mitigation:

1. **Browser-relay fallback** — if the Edge Function's direct `fetch` to Paynow fails, we return the signed form fields to the browser, which submits them itself (the browser is on a residential ISP, not a datacenter).
2. **Dedicated Cloudflare Worker** — `paynow-relay` proxies the call from CF's own edge, which Paynow trusts.

Worker code (`paynow-relay/src/index.js`) — minimal, auth'd via `x-relay-secret`, target whitelisted to `paynow.co.zw`:

```js
const TARGETS = {
  remotetransaction: "interface/remotetransaction",
  initiatetransaction: "interface/initiatetransaction",
  poll: null, // pollurl is dynamic — set via ?url= query param
};

export default {
  async fetch(req, env) {
    if (req.headers.get("x-relay-secret") !== env.RELAY_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    // Open-redirect guard: only allow paynow.co.zw hostnames.
    let targetUrl;
    if (target === "poll" && explicitUrl) {
      const parsed = new URL(explicitUrl);
      if (!parsed.hostname.endsWith("paynow.co.zw")) {
        return new Response(JSON.stringify({ error: "poll url host not allowed" }), { status: 400 });
      }
      targetUrl = parsed.toString();
    } else if (TARGETS[target]) {
      targetUrl = `https://www.paynow.co.zw/${TARGETS[target]}`;
    }

    const body = await req.text();
    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
};
```

Browser-relay branch in the frontend (`src/hooks/usePayments.ts:191-235`):

```ts
// Paynow fallback: browser calls Paynow directly (Edge Function couldn't reach it)
if (result?.provider === 'paynow' && result?.formFields) {
  const isMobileExpress = result.formFields.method && result.formFields.phone;
  const endpoint = isMobileExpress
    ? 'https://www.paynow.co.zw/interface/remotetransaction'
    : 'https://www.paynow.co.zw/interface/initiatetransaction';

  const formBody = Object.entries(result.formFields as Record<string, string>)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const paynowRes = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody,
  });
  // ... parse params, persist pollurl, redirect to browserurl
}
```

---

## 9. BillPay Vendor API — AUTH then PAY

BillPay is a different transport (HTTPS JSON, Basic Auth) but the same merchant identity. The cardinal rule from spec v1.33: **AUTH and PAY must use the same `Reference`.** We enforce this with a DB lookup keyed on the AUTH-generated reference.

### 9.1 AUTH — generate reference, store authorized row

`supabase/functions/billpay/index.ts:320-408`

```ts
const basicAuth = btoa(`${billpayUser}:${billpayPass}`);
const apiProducts = products || [
  { Code: "USD", Quantity: 1, Price: amount || 0, RequiresForexPayment: requiresForexPayment || false },
];
const apiRequest = {
  Action: "AUTH",
  BillerCode: billerCode,
  MemberNumber: accountNumber,
  Reference: ref,                                // generated once, reused for PAY
  TotalAmount: totalAmount || amount || "",
  Products: apiProducts,
};

const apiRes = await fetch(BILLPAY_API, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Basic ${basicAuth}`,
  },
  body: JSON.stringify(apiRequest),
  signal: controller.signal,                     // 60s spec-recommended timeout
});

const apiData = await apiRes.json();
if (apiData.Status !== "Authorized") {
  return json({
    status: "error",
    action: "auth",
    error: apiData.Narration,                    // user-safe narration only
    technicalNarration: apiData.TechnicalNarration,  // logged, not exposed in prod responses
  });
}

await svc.from("bill_payments").insert({
  user_id: user.id,
  reference: ref,
  biller_code: billerCode,
  account_number: accountNumber,
  account_holder: apiData.MemberName || apiData.AuthData?.MemberName,
  amount: amount || apiData.TotalAmount || 0,
  total_amount: apiData.TotalAmount,
  status: "authorized",
  billpay_reference: apiData.BillPayReference,
  products: apiData.Products || [],
  auth_data: apiData.AuthData || null,
  requires_forex: apiData.Products?.some(p => p.RequiresForexPayment) || false,
});
```

### 9.2 PAY — look up authorized row, reuse reference

`supabase/functions/billpay/index.ts:415-431, 582-597`

```ts
// Look up the authorized payment by reference — SAME reference as AUTH
const { data: authRow } = await svc
  .from("bill_payments")
  .select("*")
  .eq("reference", reference)
  .eq("user_id", user.id)
  .single();

if (!authRow) {
  return json({ error: "No authorized payment found for this reference. Run AUTH first." }, 400);
}
if (authRow.status !== "authorized") {
  return json({ error: `Payment in '${authRow.status}' state, not 'authorized'. Cannot pay.` }, 400);
}

const apiRequest = {
  Action: "PAY",
  BillerCode: billerCode,
  MemberNumber: accountNumber,
  Reference: reference,                          // ← same reference as AUTH (spec-mandated)
  TotalAmount: totalAmount || amount,
  Products: payProducts,
  ...(payerDetails ? { PayerDetails: payerDetails } : {}),
};
```

### 9.3 PAY status fan-out

The PAY response can be **Paid / BeingProcessed / Flagged / Failed** — each maps to a distinct DB state and downstream action. Most importantly: **all `ReceiptSmses` returned by voucher billers MUST be delivered to the customer** (BillPay v1.33 spec requirement).

`supabase/functions/billpay/index.ts:668-725`

```ts
if (apiData.Status === "Paid") {
  await svc.from("bill_payments").update({
    status: "paid",
    amount,
    total_amount: apiData.TotalAmount || amount,
    currency: apiData.Currency || "USD",
    account_holder: apiData.MemberName,
    billpay_reference: apiData.BillPayReference,
    biller_payment_reference: apiData.BillerPaymentReference,
    wallet_debit_reference: apiData.WalletDebitReference,
    vendor_commission: vendorCommission,
    vouchers: allVouchers,
    receipt_smses: receiptSmses,
    receipt_html: receiptHtml,
    display_data: displayData,
    products: apiData.Products || [],
  }).eq("reference", reference);

  // ZETDC/voucher billers: MUST send all ReceiptSmses to customer (spec requirement)
  if (receiptSmses.length > 0) {
    const { data: profile } = await svc.from("profiles").select("phone").eq("id", user.id).single();
    if (profile?.phone) {
      for (const sms of receiptSmses) {
        sendReceiptSms(supabaseUrl, serviceRoleKey, profile.phone, sms, user.id);
      }
    }
  }
}
```

Network-error handling on PAY is deliberately conservative — we mark `being_processed` rather than `failed`, because the biller may have committed even if we didn't see the response. A reconciliation worker (`billpay-reconcile`) calls Paynow's status endpoint to resolve.

`supabase/functions/billpay/index.ts:613-631`

```ts
} catch (fetchErr) {
  // Network failure during PAY — mark for RETRY reconciliation
  await svc.from("bill_payments").update({
    status: "being_processed",
    amount,
    total_amount: totalAmount || amount,
    narration: "Network error during payment — will retry automatically",
  }).eq("reference", reference);

  return json({
    status: "processing",
    action: "pay",
    reference,
    message: "Payment request sent but response not received. We will check the status automatically.",
  });
}
```

---

## 10. Frontend integration — `useInitiatePayment`

The single hook that drives both Web and Express Checkout, with idempotency and stale-pending cleanup.

`src/hooks/usePayments.ts:96-238` (key segments)

```ts
const reference = `ZL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`.toUpperCase();
const idempotencyKey = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

// Block true duplicates
const { data: existingPaid } = await supabase
  .from('payments')
  .select('reference, status')
  .eq('livestock_id', livestockId)
  .eq('user_id', user!.id)
  .eq('status', 'paid')
  .maybeSingle();
if (existingPaid) throw new Error('Already paid for this item');

// Sweep stale pending payments so the user can retry cleanly
await supabase.from('payments').delete()
  .eq('livestock_id', livestockId)
  .eq('user_id', user!.id)
  .eq('status', 'pending');

// Create the payment row (idempotency_key has a unique index)
const { data: payment } = await supabase
  .from('payments')
  .insert({
    user_id: user!.id,
    livestock_id: livestockId,
    reference,
    amount,
    method,
    phone: phone || null,
    idempotency_key: idempotencyKey,
  })
  .select()
  .single();

// Hand off to the Edge Function
const { data: result } = await supabase.functions.invoke('initiate-payment', {
  body: { reference, amount, livestockTitle, method, phone },
});

// Three terminal branches: redirect (web), instructions (express), or browser-relay
if (result?.redirectUrl) { window.location.href = result.redirectUrl; }
else if (result?.provider === 'paynow' && result?.pollUrl) { /* go to status page */ }
else if (result?.provider === 'paynow' && result?.formFields) { /* browser-submit fallback */ }
```

---

## 11. Gotchas worth knowing

| Pitfall                                        | Where it bit us                | Fix in code                                             |
|------------------------------------------------|--------------------------------|---------------------------------------------------------|
| Penny amounts collapsing to `$0`               | `amount.toFixed(2)` on `0.005` | `_shared/money.ts` (`amountMatches`, `platformTotal`)   |
| Webhook hash uses *received* order, not init   | `verifyPaynowHash`             | Strip `hash`, hash remaining values in iteration order  |
| `TechnicalNarration` leaking to UI             | BillPay error responses        | Only `Narration` is returned to client; Tech is logged  |
| Double-submit creating duplicate payments      | `useInitiatePayment`           | Unique index on `(user_id, idempotency_key)`            |
| EcoCash insufficient balance → web fallback    | Express → web fallthrough      | Terminal-error classifier + `402` short-circuit         |
| Cloudflare blocks Supabase → Paynow            | Some Supabase regions          | Browser-relay fallback + CF Worker relay                |
| Webhook wildcard CORS (SEV-1)                  | Initial deploy                 | `ALLOWED_ORIGIN` env, no `*` fallback                   |
| 500s on malformed JSON leaking stack traces    | Public Edge Functions          | JSON parse guard returns `400`, no `stack` in response  |
| AUTH/PAY reference mismatch                    | BillPay early integration      | DB-keyed lookup of authorized row; same reference reused |
| Paid status reverting on retried webhook       | `completePayment`              | `.eq("status", "pending")` guard makes it idempotent    |

---

## 12. Environment variables

```bash
# Paynow Web/Mobile (Express Checkout + Web Checkout)
PAYNOW_INTEGRATION_ID=23997
PAYNOW_INTEGRATION_KEY=<secret>
PAYNOW_MERCHANT_EMAIL=tatendawalter62@gmail.com
PAYNOW_RESULT_URL=https://<project>.functions.supabase.co/payment-webhook  # optional, defaults to webhook function

# Paynow BillPay Vendor API
BILLPAY_USERNAME=<vendor>
BILLPAY_PASSWORD=<vendor-pass>
BILLPAY_API_BASE_URL=https://billpay.paynow.co.zw  # or billpay-staging.paynow.co.zw

# CORS (no wildcard fallback — must be set)
ALLOWED_ORIGIN=https://zimlivestock.co.zw,https://www.zimlivestock.co.zw

# Stripe (card fallback for diaspora — orthogonal to Paynow)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Cloudflare relay (optional, only when CF blocks direct egress)
RELAY_SECRET=<shared-secret>  # set on the Worker, sent as x-relay-secret
```

All values live in Supabase Function secrets (`supabase secrets set`) — never in the repo.

---

## 13. File index for senior engineers

| File                                                  | What it is                                       |
|-------------------------------------------------------|--------------------------------------------------|
| `supabase/functions/initiate-payment/index.ts`        | Web + Express Checkout entry, signing, redirect  |
| `supabase/functions/payment-webhook/index.ts`         | `resulturl` receiver, hash verify, state machine |
| `supabase/functions/payment-poll-sync/index.ts`       | Client-triggered pollurl fallback                |
| `supabase/functions/billpay/index.ts`                 | BillPay AUTH + PAY end-to-end                    |
| `supabase/functions/billpay-status/index.ts`          | Status check for BeingProcessed payments         |
| `supabase/functions/billpay-reverse/index.ts`         | Reversal (refund) flow                           |
| `supabase/functions/billpay-reconcile/index.ts`       | Cron worker for stuck `being_processed` rows     |
| `supabase/functions/_shared/money.ts`                 | Penny-safe amount comparison + platform total    |
| `supabase/functions/_shared/cors.ts`                  | Origin-allowlist CORS helper                     |
| `paynow-relay/src/index.js`                           | Cloudflare Worker proxy                          |
| `src/hooks/usePayments.ts`                            | React Query hook — `useInitiatePayment` + poll   |
| `src/hooks/useBillPay.ts`                             | React Query hook — `useBillPayAuth` + `Pay`      |
| `supabase/schema.sql`                                 | `payments` + `bill_payments` tables              |
| `supabase/rls_policies.sql`                           | Service-role-only update policy                  |
| `docs/paynow-integration-pitfalls.md`                 | Long-form gotchas, narrative version             |
| `docs/paynow-billpay-vendor-api.md`                   | BillPay v1.33 spec annotations                   |
| `docs/paynow-billpay.postman_collection.json`         | Postman collection for BillPay endpoints         |
