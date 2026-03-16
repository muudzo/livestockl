# Stripe DX Benchmarking Notes

## Integration Summary
- **Provider**: Stripe
- **Integration method**: Stripe Checkout (hosted payment page)
- **Date started**: ___
- **Time to first successful test payment**: ___ minutes

## Signup & Onboarding
- [ ] Account creation time: ___ minutes
- [ ] Required verification steps: ___
- [ ] Sandbox/test mode available immediately? Yes / No
- [ ] Test API keys accessible from dashboard? Yes / No
- Notes: ___

## Documentation Quality (1-5): ___
- Quickstart guide available: Yes
- Code examples in multiple languages: Yes (Node, Python, Ruby, PHP, Go, Java)
- API reference completeness: ___
- Search functionality: ___
- Notes: ___

## SDK Usability (1-5): ___
- Package: `stripe` (npm) / ESM import for Deno
- Type safety: Full TypeScript types included
- Lines of code for basic integration: ~30 (server) + ~10 (client redirect)
- Stripe handles the entire checkout UI (hosted page)
- Notes: ___

## Sandbox/Testing (1-5): ___
- Test card numbers provided:
  - Success: 4242 4242 4242 4242
  - 3DS required: 4000 0025 0000 3155
  - Declined: 4000 0000 0000 9995
- Webhook testing via CLI: `stripe listen --forward-to localhost:PORT`
- Dashboard shows test transactions: Yes / No
- Notes: ___

## Error Messages (1-5): ___
- Are errors actionable? ___
- Example error messages encountered:
  - ___
- Notes: ___

## Key Observations

### Positives
- Stripe Checkout handles PCI compliance — no card data touches our server
- Webhook signature verification is built into the SDK (`stripe.webhooks.constructEvent`)
- Metadata on Checkout Sessions makes linking back to our DB straightforward
- Supports Google Pay, Apple Pay, and cards automatically on the hosted page
- Comprehensive test card numbers for different scenarios

### Challenges
- Amount is in cents (need to multiply by 100) — easy to miss
- Webhook requires raw body (not parsed JSON) for signature verification
- Stripe is not available in Zimbabwe — would need a registered entity elsewhere
- No mobile money support (EcoCash, OneMoney) — Zim market gap

### Comparison Points vs Paynow
| Aspect | Stripe | Paynow |
|--------|--------|--------|
| Hosted checkout page | Yes (full UI) | Yes (basic) |
| Mobile money support | No | Yes (EcoCash, OneMoney) |
| Webhook verification | SDK method | Manual SHA-512 hash |
| Test environment | Excellent | Limited |
| Documentation | Comprehensive | Basic |
| TypeScript SDK | Full types | No official SDK |
| PCI compliance | Handled by Stripe | Handled by Paynow |
| Zim availability | Not directly | Yes |

## Environment Variables Required
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Files Changed
- `supabase/functions/initiate-payment/index.ts` — Stripe Checkout Session creation
- `supabase/functions/payment-webhook/index.ts` — Stripe webhook handler
- `src/hooks/usePayments.ts` — Simplified for Stripe redirect flow
- `src/app/components/CheckoutScreen.tsx` — Single "Pay with Stripe" button
- `src/app/components/PaymentStatus.tsx` — Handles Stripe success/cancel redirects
