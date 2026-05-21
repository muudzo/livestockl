-- ============================================================================
-- TRANSPORT DEMO SEED
-- ============================================================================
-- Seeds one ended auction with transport_available = true and a winning bid
-- for EVERY profile in the database, so any account can test the full
-- checkout → delivery quote → pay journey immediately.
--
-- RUNNING THIS SCRIPT
--   Option A — Supabase SQL Editor:
--     Paste into https://supabase.com/dashboard/project/hmeieslclzycyjjjflfh/sql and run.
--
--   Option B — Management API:
--     curl -X POST "https://api.supabase.com/v1/projects/hmeieslclzycyjjjflfh/database/query" \
--       -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
--       -H "Content-Type: application/json" \
--       -d "$(python3 -c "import json; print(json.dumps({'query': open('supabase/seeds/demo-transport.sql').read()}))")"
--
-- ROLLBACK:
--   DELETE FROM bids         WHERE livestock_id IN (SELECT id FROM livestock_items WHERE title = 'DEMO · Transport Test Bull');
--   DELETE FROM livestock_items WHERE title = 'DEMO · Transport Test Bull';
-- ============================================================================

DO $$
DECLARE
  seller_id  uuid := '889508c8-7206-46bd-aec2-d21fee774604';  -- seller-a@test.zl (Tendai Moyo)
  item_id    uuid := gen_random_uuid();
  tenant_id  uuid;
  r          record;
BEGIN
  SELECT id INTO tenant_id FROM public.tenants WHERE slug = 'zimlivestock-demo' LIMIT 1;
  -- ── 1. Schema migration (idempotent) ──────────────────────────────────────
  ALTER TABLE public.livestock_items
    ADD COLUMN IF NOT EXISTS transport_available boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS pickup_lat numeric(9,6),
    ADD COLUMN IF NOT EXISTS pickup_lng numeric(9,6);

  CREATE TABLE IF NOT EXISTS public.transport_requests (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id       uuid NOT NULL REFERENCES public.livestock_items(id) ON DELETE CASCADE,
    buyer_id      uuid NOT NULL REFERENCES public.profiles(id),
    pickup_lat    numeric(9,6) NOT NULL,
    pickup_lng    numeric(9,6) NOT NULL,
    dropoff_lat   numeric(9,6) NOT NULL,
    dropoff_lng   numeric(9,6) NOT NULL,
    dropoff_label text NOT NULL,
    distance_km   numeric(8,2) NOT NULL,
    quote_usd     numeric(10,2) NOT NULL,
    status        text NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'accepted', 'rejected', 'fulfilled')),
    created_at    timestamptz DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_transport_requests_item  ON public.transport_requests(item_id);
  CREATE INDEX IF NOT EXISTS idx_transport_requests_buyer ON public.transport_requests(buyer_id);

  ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;

  ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS transport_request_id uuid REFERENCES public.transport_requests(id),
    ADD COLUMN IF NOT EXISTS transport_fee numeric(10,2);

  -- ── 2. Clean up any prior run ─────────────────────────────────────────────
  DELETE FROM public.bids
    WHERE livestock_id IN (
      SELECT id FROM public.livestock_items WHERE title = 'DEMO · Transport Test Bull'
    );
  DELETE FROM public.livestock_items WHERE title = 'DEMO · Transport Test Bull';

  -- ── 3. Ended listing with transport enabled (pickup = Harare) ─────────────
  INSERT INTO public.livestock_items (
    id, seller_id, title, category, breed, age, weight, description,
    location, health, starting_price, current_bid, bid_count,
    status, end_time, auction_format,
    transport_available, pickup_lat, pickup_lng,
    image_urls, duration_days, created_at, tenant_id
  ) VALUES (
    item_id,
    seller_id,
    'DEMO · Transport Test Bull',
    'Cattle',
    'Brahman',
    '4 years',
    '480 kg',
    'Healthy Brahman bull, suitable for breeding. Transport available from Harare.',
    'Harare',
    'Excellent',
    450.00,
    620.00,
    0,        -- bid_count updated below after inserting bids
    'ended',
    now() - interval '2 hours',
    'timed',
    true,
    -17.8292,  -- Harare lat
    31.0522,   -- Harare lng
    ARRAY['https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800']::text[],
    7,
    now() - interval '9 days',
    tenant_id
  );

  -- ── 4. Winning bid for every profile ──────────────────────────────────────
  FOR r IN SELECT id FROM public.profiles LOOP
    INSERT INTO public.bids (
      id, livestock_id, user_id, amount, is_winner, created_at, tenant_id
    ) VALUES (
      gen_random_uuid(),
      item_id,
      r.id,
      620.00,
      true,
      now() - interval '2 hours 5 minutes',
      tenant_id
    );
  END LOOP;

  -- Update bid_count to match actual inserts
  UPDATE public.livestock_items
    SET bid_count = (SELECT count(*) FROM public.bids WHERE livestock_id = item_id)
    WHERE id = item_id;

END $$;
