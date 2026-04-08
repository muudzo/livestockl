# BillPay v1.33 Integration — ZimLivestock

## Overview
Full integration with Paynow BillPay Vendor API v1.33 for 15 curated farmer-relevant billers. Farmers can pay ZESA, school fees, council rates, medical aid, insurance, and airtime directly from auction earnings.

## Architecture

### Edge Functions (6 total)
| Function | Purpose | Auth |
|----------|---------|------|
| `billpay` | AUTH + PAY actions (single `/process` endpoint) | JWT |
| `billpay-status` | STATUS + RETRY for pending payments | JWT |
| `billpay-reverse` | Refund/reverse payments (error codes 0-5, 99) | JWT |
| `billpay-billers` | ListBillers proxy with DB cache (1hr TTL) + webhook | JWT / POST |
| `billpay-wallets` | Vendor wallet balance check | JWT |
| `billpay-reconcile` | Cron: poll BeingProcessed/Flagged payments | CRON_SECRET |

### Database Tables
| Table | Purpose |
|-------|---------|
| `bill_payments` | Full payment lifecycle with v1.33 response fields |
| `billers_cache` | Cached biller configs from ListBillers API |

### Frontend
| File | Purpose |
|------|---------|
| `src/hooks/useBillPay.ts` | 6 hooks: billers, auth, pay, status, wallets, history |
| `src/app/components/BillPayFlow.tsx` | 4-step wizard with dynamic billers and live polling |
| `src/app/components/TestBillPayPayment.tsx` | Test harness with same-reference and status tests |
| `src/app/components/PostSaleBillPayPrompt.tsx` | Post-sale CTA: "Pay a bill with your earnings?" |
| `src/types/billpay.ts` | TypeScript types mirroring v1.33 spec |

## Critical Spec Compliance

### Same Reference (AUTH → PAY)
AUTH generates a unique reference and inserts a `bill_payments` row with `status='authorized'`. PAY looks up the authorized row by reference and sends the SAME reference to Paynow. This is a hard spec requirement.

### Status Polling (Reconcile Cron)
- First STATUS check: 120 seconds after PAY
- Subsequent checks: every 180 seconds
- Flagged payments: every 600 seconds
- Escalation: after 10 checks → mark as flagged
- Cron runs every 2 minutes via `billpay-reconcile`

### ZETDC Multi-Token SMS
When ZESA returns multiple ReceiptSmses (array), ALL must be sent to the customer individually via the `send-sms` Edge Function. The UI displays all voucher codes with copy-to-clipboard.

### TechnicalNarration
Never exposed to the frontend. Only `Narration` (user-safe) is returned to the client.

## Supported Billers (Curated Set)
| Code | Name | Type |
|------|------|------|
| ZETDC | ZESA Prepaid Electricity | Utility |
| AIRTIME | Paynow Airtime | Telecom |
| COH | City of Harare | Council |
| BCC | Bulawayo City Council | Council |
| MAS | City of Masvingo | Council |
| GWE | Gweru City Council | Council |
| UZ | University of Zimbabwe | Education |
| NUST | NUST | Education |
| MSU | Midlands State University | Education |
| GZU | Great Zimbabwe University | Education |
| CIMAS | CIMAS Medical Aid | Healthcare |
| FMH | First Mutual Health | Healthcare |
| NLAC | Nyaradzo Life Assurance | Insurance |
| DOVES | Doves Funeral | Insurance |
| DSTV | DSTV | Entertainment |

## Environment Variables
```bash
# BillPay Vendor API credentials (from Paynow)
BILLPAY_USERNAME=your-api-username
BILLPAY_PASSWORD=your-api-password

# Cron secret for scheduled functions
CRON_SECRET=your-random-cron-secret
```

## Simulation Mode
When `BILLPAY_USERNAME` / `BILLPAY_PASSWORD` are not set, all functions operate in simulation mode:
- AUTH returns realistic account data with the curated biller configs
- PAY supports test biller prefixes: PP (pending), PF (fail), PFF (flagged)
- Multi-token ZETDC responses are simulated
- Reconcile cron resolves simulated pending payments after 3 checks

## Payment Flow
```
1. User selects biller from curated grid
2. Enters account number (validated by MemberNumberFieldRegex)
3. Enters amount (validated by MinAmount/MaxAmount)
4. AUTH → Paynow verifies account, returns holder name + balance
5. User confirms → PAY with SAME reference
6. Status: Paid → show vouchers/receipt, send SMS
         BeingProcessed → start polling, cron reconciles
         Flagged → show "under review", slow-poll
         Failed → show error with Narration
```

## Cron Schedule
```sql
-- billpay-reconcile: Poll pending/flagged payments (every 2 min)
SELECT cron.schedule('billpay-reconcile', '*/2 * * * *', $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/billpay-reconcile',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret')),
    body := '{}'::jsonb
  );
$$);
```

## Requesting Credentials
Contact: developers@paynow.co.zw

Provide:
1. This integration documentation
2. Test harness results (simulation mode)
3. Webhook URL for biller config updates: `https://{project}.supabase.co/functions/v1/billpay-billers`
4. Request vendor account with USD wallet prefunding
