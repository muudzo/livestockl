-- BillPay 401 diagnostic
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/hmeieslclzycyjjjflfh/sql
-- Service-role / SQL-editor required (table has RLS, no SELECT policy).

-- 1) What has Paynow been sending us in the last 7 days?
--    Shows: action, source IP, what status we returned, request body.
--    The remote_ip tells us if IP allowlist would be the issue.
--    The request_payload + response_payload narrow down what failed.
SELECT
  id,
  created_at,
  action,
  member,
  remote_ip,
  status_code,
  request_payload,
  response_payload
FROM billpay_inbound_log
WHERE created_at > now() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 30;

-- 2) Just the 401s — who's hitting us and from where
SELECT
  created_at,
  action,
  remote_ip,
  request_payload,
  response_payload
FROM billpay_inbound_log
WHERE status_code = 401
ORDER BY created_at DESC
LIMIT 20;

-- 3) Are there any successful auths at all? (proves the function works for SOME caller)
SELECT
  created_at,
  action,
  remote_ip,
  status_code
FROM billpay_inbound_log
WHERE status_code BETWEEN 200 AND 299
ORDER BY created_at DESC
LIMIT 10;
