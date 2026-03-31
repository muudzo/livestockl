# Paynow BillPay Vendor API — Reference

> Source: Paynow BillPay API Documentation v1.33 (23 Jan 2024)
> Saved: 30 March 2026 for future integration

## Key Details

- **Base URL**: `https://billpay.paynow.co.zw/api/`
- **Auth**: HTTP Basic Authentication (username:password → Base64)
- **Contact**: Paynow support to get API credentials created
- **Currency**: Supports dual currency (ZWL and USD)

## Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/payment/ListBillers` | GET | List all billers and their products |
| `/api/payment/process` | POST | Auth, Pay, Retry, Status actions |
| `/api/payment/member` | GET/POST | Get member information |
| `/api/payment/reverse` | POST | Reverse/refund a payment |
| `/api/payment/list` | GET | List payments (last 90 days) |
| `/api/wallets` | GET | Check vendor wallet balances |
| `/api/payment/TargetStats` | GET | Biller target statistics |
| `/api/payment/feed` | GET | Recent payment feed |

## Payment Flow

1. **AUTH** → Validate member, check wallet, check biller availability
2. **PAY** → Debit vendor wallet, provision product/service
3. **STATUS** → Check payment status (poll at 120s first, then 180s intervals)

## Statuses

| Status | Description |
|---|---|
| Authorized | Ready to pay |
| BeingProcessed | Still processing (poll at 180s) |
| Paid | Success |
| Reversed | Refunded |
| Failed | Permanent failure |
| Flagged | Needs BillPay support attention (poll at 600s) |

## Test Biller

- **Test biller code**: Use "Test" biller for simulation
- **Member prefixes**: AT (auth timeout), AF (auth fail), PT (pay timeout), PF (pay fail), PP (pay pending), PFF (pay flagged)
- **Test products**: AI (variable price), AM (mandated price), AA (free price), RV (vouchers), FP (forex)

## For ZimLivestock Integration (Future)

This API would power:
- Pay ZESA from auction earnings
- Pay school fees after cattle sale
- Buy airtime as rewards
- Pay vet bills in-app

Requires: Vendor account with Paynow, prefunded USD wallet, API credentials.
