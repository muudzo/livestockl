-- ============================================================================
-- LIVE TRANSPORT DEMO — auction ending in 2 minutes
-- ============================================================================
-- Seeds one ACTIVE auction with transport_available = true and end_time
-- set 2 minutes from now. Place a bid from any account, wait for it to
-- end, and the full bid → win → checkout → delivery quote → pay journey
-- will be testable end-to-end.
--
-- Pickup is Harare so quotes will be cheap from nearby cities and
-- meaningful from further away (Bulawayo ≈ 440km, etc).
--
-- Re-running this script resets the auction back to "ends in 2 min" so
-- you can rerun the test as many times as you like.
-- ============================================================================

DO $$
DECLARE
  seller_id  uuid := '889508c8-7206-46bd-aec2-d21fee774604';  -- seller-a@test.zl
  v_tenant   uuid;
  existing   uuid;
BEGIN
  SELECT id INTO v_tenant FROM public.tenants WHERE slug = 'zimlivestock-demo' LIMIT 1;

  SELECT id INTO existing
    FROM public.livestock_items
    WHERE title = 'DEMO · Transport Live Auction'
    LIMIT 1;

  IF existing IS NOT NULL THEN
    -- Reset to a fresh 2-minute window so you can re-test without rerunning.
    DELETE FROM public.bids WHERE livestock_id = existing;
    UPDATE public.livestock_items
       SET status = 'active',
           end_time = now() + interval '2 minutes',
           current_bid = 0,
           bid_count = 0
     WHERE id = existing;
  ELSE
    INSERT INTO public.livestock_items (
      id, seller_id, title, category, breed, age, weight, description,
      location, health, starting_price, current_bid, bid_count,
      status, end_time, auction_format,
      transport_available, pickup_lat, pickup_lng,
      image_urls, duration_days, created_at, tenant_id
    ) VALUES (
      gen_random_uuid(),
      seller_id,
      'DEMO · Transport Live Auction',
      'Cattle',
      'Brahman',
      '3 years',
      '420 kg',
      'Live demo auction — ends in 2 minutes. Bid to test the transport flow.',
      'Harare',
      'Excellent',
      100.00,    -- low starting price so any bid wins
      0,
      0,
      'active',
      now() + interval '2 minutes',
      'timed',
      true,
      -17.8292,  -- Harare
      31.0522,
      ARRAY['https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800']::text[],
      1,
      now() - interval '1 hour',
      v_tenant
    );
  END IF;
END $$;

-- Return the row so the API response shows the live state.
SELECT id, title, status, end_time, transport_available, pickup_lat, pickup_lng,
       (end_time - now()) AS time_remaining
  FROM public.livestock_items
  WHERE title = 'DEMO · Transport Live Auction';
