-- sms_log: durable record of every SMS dispatch (live, simulated, or failed).
-- Used by send-sms for rate limiting (10/user/hour), idempotency checks,
-- and cost reconciliation against txt.co.zw monthly statement.

CREATE TABLE IF NOT EXISTS public.sms_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  phone text NOT NULL,
  message text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'simulated', 'failed', 'delivered', 'rejected')),
  provider_reference text,
  cost_usd numeric(6,4) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_log_user ON public.sms_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_log_created ON public.sms_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_log_user_recent
  ON public.sms_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_log_event_type
  ON public.sms_log(event_type, created_at DESC);

ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sms_log_owner_read ON public.sms_log;
CREATE POLICY sms_log_owner_read ON public.sms_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS sms_log_service_write ON public.sms_log;
CREATE POLICY sms_log_service_write ON public.sms_log
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
