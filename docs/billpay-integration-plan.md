# BillPay Integration Plan — ZimLivestock

## Overview
Integrate Paynow BillPay Vendor API to let farmers pay bills (ZESA, school fees, airtime) directly from auction earnings. "Sell cattle, pay school fees" in one app.

## Where It Fits

### Modified Components
| File | Change |
|---|---|
| `src/app/routes.tsx` | Add `/pay-bill`, `/pay-bill/:billerCode`, `/bill-status/:ref` |
| `src/app/components/PaymentHistory.tsx` | Add "Pay a Bill" button at top |
| `src/app/components/PaymentStatus.tsx` | Add `PostSaleBillPayPrompt` after successful livestock payment |

### New Components
| File | Purpose |
|---|---|
| `src/app/components/BillPayFlow.tsx` | Multi-step wizard: account → AUTH → confirm → PAY → receipt |
| `src/app/components/BillPayHub.tsx` | Grid of billers (ZESA, Schools, Airtime) + search (Phase 2) |
| `src/app/components/PostSaleBillPayPrompt.tsx` | "Pay a bill with your earnings?" CTA after livestock payment |
| `src/hooks/useBillPay.ts` | `useBillPayAuth`, `useBillPayPay`, `useBillPayHistory` hooks |

### New Edge Function
| File | Purpose |
|---|---|
| `supabase/functions/billpay/index.ts` | AUTH + PAY dispatch to BillPay Vendor API |

### New DB Table
```sql
create table if not exists public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  reference text unique not null,
  biller_code text not null,
  biller_name text not null,
  account_number text not null,
  account_holder text,
  amount numeric not null check (amount > 0),
  status text default 'pending' check (status in ('pending', 'paid', 'failed')),
  billpay_reference text,
  linked_payment_id uuid references public.payments(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_bill_payments_user on public.bill_payments(user_id);
create index if not exists idx_bill_payments_reference on public.bill_payments(reference);
```

## Integration Points

### 1. Post-Sale Bill Payment (Trigger)
- **Where:** `PaymentStatus.tsx` when `status === 'success'`
- **What:** Show card with icons for ZESA, School Fees, Airtime
- **Why:** Capture the "moment of liquidity" — farmer just got paid

### 2. ZESA Prepaid (Biller: ZETDC)
```
User taps "Buy ZESA"
  → Enter meter number
  → Edge Function calls BillPay AUTH
  ← Returns meter holder name + balance
  → User confirms amount
  → Edge Function calls BillPay PAY
  ← Returns ZESA token
  → Show token + receipt
```

### 3. School Fees (Biller: UZ, NUST, MSU, etc.)
Same flow — student ID instead of meter number, balance instead of token.

### 4. Airtime (Biller: AIRTIME)
Same flow — phone number, user-specified amount, no token returned.

## Data Flow
```
BillPayFlow → useBillPayAuth → Edge Function → BillPay API AUTH
                                              ← Account details
           → useBillPayPay  → Edge Function → BillPay API PAY
                                              ← Success + receipt
                             → Insert bill_payments record
                             ← Navigate to BillPayStatus
```

## Minimal Viable Integration (MVP)

**One biller:** ZESA (`ZETDC`) — most universal need
**One Edge Function:** `billpay/index.ts` with `action: "auth"` and `action: "pay"`
**One Component:** `BillPayFlow.tsx` hardcoded to ZESA
**One Hook:** `useBillPay.ts`
**One Table:** `bill_payments`
**Entry point:** "Buy ZESA" button on PaymentHistory page

## BillPay API Reference

- **Base URL:** `https://billpay.paynow.co.zw/api/`
- **Auth:** HTTP Basic (username:password → Base64)
- **Endpoints:** `POST /api/payment/process` with `Action: "AUTH"` or `Action: "PAY"`
- **Credentials:** Contact Paynow support for vendor API user
- **Test biller:** Code `Test`, member prefixes: AT (timeout), AF (fail), PF (pay fail)

## Risks
- BillPay vendor API access not yet granted — build simulation mode first
- Cloudflare blocking possible — use browser fallback pattern
- ZESA token delivery may vary — handle both API response and SMS delivery

## Implementation Order
1. Schema migration (add `bill_payments` table)
2. Edge Function with simulation mode
3. `useBillPay.ts` hook
4. `BillPayFlow.tsx` component (ZESA only)
5. Routes + entry point on PaymentHistory
6. PostSaleBillPayPrompt on PaymentStatus
