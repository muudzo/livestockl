-- Demo prep: clear stuck active-past-end_time auctions, schedule end-auctions cron.
--
-- PREREQUISITE: The cron job authenticates against end-auctions via Bearer
-- token. Store the value in Supabase Vault before applying:
--
--   SELECT vault.create_secret('<CRON_SECRET value>', 'cron_secret');
--
-- (Run once via Supabase SQL editor; idempotent — fails harmless on duplicate.)

-- 1) Delete stuck demo auctions: active, past end_time, created today.
--    payments.livestock_id has no ON DELETE CASCADE, so clear payments first.
--    bids/agent_bids cascade automatically.
DELETE FROM public.payments
WHERE livestock_id IN (
  SELECT id FROM public.livestock_items
  WHERE status = 'active'
    AND end_time < now()
    AND created_at::date = current_date
);

DELETE FROM public.livestock_items
WHERE status = 'active'
  AND end_time < now()
  AND created_at::date = current_date;

-- 2) Schedule end-auctions to fire every minute via pg_cron + pg_net.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Idempotent: unschedule existing job before re-creating.
DO $$
BEGIN
  PERFORM cron.unschedule('end-expired-auctions');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'end-expired-auctions',
  '* * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/end-auctions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'cron_secret' LIMIT 1
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $job$
);
