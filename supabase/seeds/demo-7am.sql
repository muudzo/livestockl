-- ============================================================================
-- 7:30 AM DEMO SEED — 3 manual + 3 agent listings
-- ============================================================================
-- 3 plain auctions for live manual bidding (end +1h, survive demo).
-- 3 DEMO-prefixed auctions for agent wins, staggered 7:34/7:37/7:40 CAT.
--   - Title 'DEMO · …' triggers tryAutoPayWinner in end-auctions → USSD push.
--   - TATENDA pre-bids via Penny Sniper so the agent_bids row resolves to a win.
--   - All amounts ≤ $0.05 (penny-range, no real EcoCash burn).
--
-- IDEMPOTENT — clears rows where title LIKE 'DEMO 7AM · %' or 'DEMO MANUAL · %'.
-- ============================================================================

DO $$
DECLARE
  buyer_id  uuid := '861ee7b2-f543-4bcb-9665-cdb8e3e2a95e';

  seller_a  uuid := '889508c8-7206-46bd-aec2-d21fee774604';
  seller_b  uuid := '0cfc6ae4-3f42-4224-bc43-425fb8ae9cf0';
  seller_c  uuid := 'c9f2bdcb-1102-4af8-98d9-16dc4be6b90f';
  seller_d  uuid := '5a4f04db-aaff-4a8b-9d1b-ac2046d45878';
  seller_e  uuid := '1e397880-49de-4279-9986-def2b22abd26';

  penny_uuid uuid;
  item_id    uuid;
  bid_uuid   uuid;

  img_brahman  text := 'https://placehold.co/800x600/8b5a2b/ffffff.png?text=Brahman+Bull';
  img_hereford text := 'https://placehold.co/800x600/a0522d/ffffff.png?text=Hereford+Heifer';
  img_angus    text := 'https://placehold.co/800x600/2c2c2c/ffffff.png?text=Angus+Calf';
  img_boergoat text := 'https://placehold.co/800x600/d4a843/2c2c2c.png?text=Boer+Goat';
  img_dorper   text := 'https://placehold.co/800x600/c9b59a/2c2c2c.png?text=Dorper+Lamb';
  img_pig      text := 'https://placehold.co/800x600/f0a3a3/2c2c2c.png?text=Large+White+Pig';

  -- (title, category, breed, age, weight, desc, location, health, starting, current, image, seller, mins_to_end, prefix)
  -- prefix 'DEMO' → DEMO-prefixed agent auction (pre-bid, settles during demo)
  -- prefix 'MANUAL' → plain auction (no pre-bid, user bids live, ends +1h)
  specs text[][] := ARRAY[
    -- Agent auctions (settled during demo)
    ARRAY['Brahman Bull',     'Cattle', 'Brahman',     '4 years', '480kg', 'Penny Sniper auto-bid — settles ~7:34.', 'Bulawayo', 'Excellent', '0.01', '0.02', img_brahman,  seller_b::text, '22', 'DEMO'],
    ARRAY['Boer Goat',        'Goats',  'Boer',        '1 year',  '45kg',  'Penny Sniper auto-bid — settles ~7:37.', 'Gweru',    'Excellent', '0.01', '0.03', img_boergoat, seller_d::text, '25', 'DEMO'],
    ARRAY['Dorper Lamb',      'Sheep',  'Dorper',      '6 months','30kg',  'Penny Sniper auto-bid — settles ~7:40.', 'Masvingo', 'Good',      '0.01', '0.04', img_dorper,   seller_e::text, '28', 'DEMO'],
    -- Manual auctions (user bids live, end +1h so they outlive the demo)
    ARRAY['Hereford Heifer',  'Cattle', 'Hereford',    '3 years', '420kg', 'Live bid this on stage — full checkout flow.',  'Harare',   'Excellent', '0.01', '0.01', img_hereford, seller_a::text, '60', 'MANUAL'],
    ARRAY['Angus Calf',       'Cattle', 'Angus',       '8 months','240kg', 'Live bid this on stage.',                       'Mutare',   'Good',      '0.01', '0.02', img_angus,    seller_c::text, '60', 'MANUAL'],
    ARRAY['Large White Pig',  'Pigs',   'Large White', '9 months','80kg',  'Live bid this on stage.',                       'Kwekwe',   'Good',      '0.01', '0.02', img_pig,      seller_a::text, '60', 'MANUAL']
  ];

  spec text[];
BEGIN
  ---------------------------------------------------------------------------
  -- 1. Idempotent cleanup (FK-aware)
  ---------------------------------------------------------------------------
  DELETE FROM public.settlement_ledger WHERE payment_order_id IN (
    SELECT id FROM public.agent_payment_orders
     WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO 7AM · %' OR title LIKE 'DEMO MANUAL · %')
  );
  DELETE FROM public.agent_payment_orders WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO 7AM · %' OR title LIKE 'DEMO MANUAL · %');
  DELETE FROM public.agent_bids  WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO 7AM · %' OR title LIKE 'DEMO MANUAL · %');
  DELETE FROM public.payments    WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO 7AM · %' OR title LIKE 'DEMO MANUAL · %');
  DELETE FROM public.notifications WHERE link IN (
    SELECT '/item/' || id::text FROM public.livestock_items WHERE title LIKE 'DEMO 7AM · %' OR title LIKE 'DEMO MANUAL · %'
  );
  DELETE FROM public.bids        WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO 7AM · %' OR title LIKE 'DEMO MANUAL · %');
  DELETE FROM public.livestock_items WHERE title LIKE 'DEMO 7AM · %' OR title LIKE 'DEMO MANUAL · %';

  ---------------------------------------------------------------------------
  -- 2. Phones — buyer carries 0781497764, sellers carry 0773819300
  ---------------------------------------------------------------------------
  UPDATE public.profiles SET phone = '0781497764' WHERE id = buyer_id;
  UPDATE public.profiles SET phone = '0773819300'
   WHERE id IN (seller_a, seller_b, seller_c, seller_d, seller_e);

  ---------------------------------------------------------------------------
  -- 3. Penny Sniper agent — upsert
  ---------------------------------------------------------------------------
  SELECT id INTO penny_uuid FROM public.agents
   WHERE user_id = buyer_id AND name = 'Penny Sniper' LIMIT 1;
  IF penny_uuid IS NULL THEN
    INSERT INTO public.agents (user_id, agent_type, name, status, config)
    VALUES (buyer_id, 'sniper', 'Penny Sniper', 'active',
            jsonb_build_object(
              'max_bid_usd', 0.05,
              'snipe_window_seconds', 30,
              'payment_phone', '0781497764',
              'category_focus', ARRAY['Cattle','Goats','Sheep']))
    RETURNING id INTO penny_uuid;
  ELSE
    UPDATE public.agents
       SET config = jsonb_set(jsonb_set(jsonb_set(config,
                              '{max_bid_usd}', '0.05'::jsonb),
                              '{payment_phone}', '"0781497764"'::jsonb),
                              '{category_focus}', '["Cattle","Goats","Sheep"]'::jsonb),
           status = 'active'
     WHERE id = penny_uuid;
  END IF;

  ---------------------------------------------------------------------------
  -- 4. Listings + bids
  ---------------------------------------------------------------------------
  FOREACH spec SLICE 1 IN ARRAY specs LOOP
    INSERT INTO public.livestock_items (
      title, category, breed, age, weight, description, location, health,
      starting_price, current_bid, bid_count, image_urls,
      seller_id, status, duration_days, end_time, created_at
    )
    VALUES (
      CASE spec[14]
        WHEN 'DEMO'   THEN 'DEMO 7AM · ' || spec[1]
        WHEN 'MANUAL' THEN 'DEMO MANUAL · ' || spec[1]
      END,
      spec[2], spec[3], spec[4], spec[5], spec[6], spec[7], spec[8],
      spec[9]::numeric, spec[10]::numeric,
      CASE spec[14] WHEN 'DEMO' THEN 1 ELSE 0 END,
      ARRAY[spec[11]],
      spec[12]::uuid, 'active', 1,
      NOW() + make_interval(mins => spec[13]::int),
      NOW() - interval '6 hours'
    )
    RETURNING id INTO item_id;

    -- DEMO auctions get a pre-placed TATENDA bid + agent_bid → wins on settle.
    -- MANUAL auctions stay bid-less so user can place the live bid on stage.
    IF spec[14] = 'DEMO' THEN
      INSERT INTO public.bids (livestock_id, user_id, amount, is_winner, created_at)
      VALUES (item_id, buyer_id, spec[10]::numeric, false, NOW() - interval '1 minute')
      RETURNING id INTO bid_uuid;

      INSERT INTO public.agent_bids (agent_id, livestock_id, bid_id, amount, strategy, status)
      VALUES (penny_uuid, item_id, bid_uuid, spec[10]::numeric, 'snipe', 'placed');
    END IF;
  END LOOP;

  RAISE NOTICE 'Demo seed complete — Penny %, 3 agent + 3 manual', penny_uuid;
END $$;

-- Verification
SELECT
  CASE WHEN title LIKE 'DEMO 7AM · %' THEN 'agent' ELSE 'manual' END AS kind,
  title,
  current_bid,
  end_time AT TIME ZONE 'Africa/Harare' AS ends_cat,
  status
FROM public.livestock_items
WHERE title LIKE 'DEMO 7AM · %' OR title LIKE 'DEMO MANUAL · %'
ORDER BY end_time;
