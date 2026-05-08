-- ============================================================================
-- BillPay biller-inbound — schema for ZimLivestock acting AS a biller
-- ============================================================================
-- Paynow's BillPay needs to call our API to validate auction references and
-- post payments. This migration adds:
--
--   1. 'BillPay' to payments.method check constraint (so a BillPay-settled
--      auction can record method='BillPay').
--   2. billpay_inbound_log audit table — every inbound call from Paynow
--      lands here with full request/response for reconciliation.
--   3. Partial unique index on payments.paynow_reference for BillPay rows,
--      so duplicate POST /pay retries are caught at the DB layer.
-- ============================================================================

-- 1. Allow BillPay as a payment method
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_method_check
  CHECK (method IN ('EcoCash', 'OneMoney', 'Card', 'BillPay'));

-- 2. Audit log
CREATE TABLE IF NOT EXISTS public.billpay_inbound_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('member', 'pay', 'status', 'auth', 'unknown')),
  member text,
  paynow_reference text,
  request_payload jsonb,
  response_payload jsonb,
  status_code int,
  remote_ip text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billpay_inbound_log_member
  ON public.billpay_inbound_log (member, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billpay_inbound_log_paynow_ref
  ON public.billpay_inbound_log (paynow_reference)
  WHERE paynow_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billpay_inbound_log_created
  ON public.billpay_inbound_log (created_at DESC);

ALTER TABLE public.billpay_inbound_log ENABLE ROW LEVEL SECURITY;
-- No SELECT policy → only service-role bypass can read audit log

COMMENT ON TABLE public.billpay_inbound_log IS
  'Audit log for inbound BillPay biller API calls. Every Paynow → ZimLivestock biller call lands here.';

-- 3. Idempotency anchor for BillPay POST /pay retries
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_billpay_paynow_ref
  ON public.payments (paynow_reference)
  WHERE method = 'BillPay' AND paynow_reference IS NOT NULL;
