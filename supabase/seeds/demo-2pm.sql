-- ============================================================================
-- 2 PM DEMO SEED (2026-06-05) — absolute-anchored, settlements fire from 2:05
-- ============================================================================
-- Recalibration of demo-final-auctions.sql for the internship-return demo.
--
-- KEY CHANGE vs. the older seed: end_times are anchored to an ABSOLUTE wall
-- clock (demo_start below), NOT relative to when the seed runs. So this is
-- correct whenever it is run today, and survives a re-run if the slot moves —
-- just edit the one `demo_start` line.
--
-- Per demo-day decision: NO pre-settled history. All 12 auctions are LIVE and
-- settle during the demo. The every-minute `end-expired-auctions` cron fires a
-- real EcoCash Express USSD push + winner SMS to 0781497764 as each ends.
-- First win settles ~2:05; the rest stagger through the talk + Q&A buffer.
--
--   Agent 1: Penny Sniper    (sniper, cattle/sheep focus)
--   Agent 2: Boer Bargainer  (sniper, goats/pigs focus)
--
-- All bids ≤ US$0.05 (penny-range — real EcoCash pushes, no real money burned).
-- Transport_available + pickup coords on 3 listings (Chinhoyi/Mutare/Harare)
-- so the live transport-quote flow demos off the feed.
--
-- IDEMPOTENT: re-running clears any DEMO · %-prefixed rows first.
-- ============================================================================

DO $$
DECLARE
  -- >>> THE ONLY LINE TO CHANGE IF THE SLOT MOVES <<<
  demo_start timestamptz := '2026-06-05 14:00:00+02';  -- 2:00 PM Harare

  buyer_id  uuid := '4afe19ee-8bca-483a-9f90-5351b4324344';  -- tatenda@paynow.co.zw

  seller_a  uuid := '889508c8-7206-46bd-aec2-d21fee774604';
  seller_b  uuid := '0cfc6ae4-3f42-4224-bc43-425fb8ae9cf0';
  seller_c  uuid := 'c9f2bdcb-1102-4af8-98d9-16dc4be6b90f';
  seller_d  uuid := '5a4f04db-aaff-4a8b-9d1b-ac2046d45878';
  seller_e  uuid := '1e397880-49de-4279-9986-def2b22abd26';

  penny_uuid uuid;
  boer_uuid  uuid;
  active_agent_uuid uuid;
  item_id    uuid;
  bid_uuid   uuid;
  v_end      timestamptz;

  demo_tenant_id uuid := '9d227a90-5958-4de3-93a9-82d410faedd0';

  img_brahman  text := 'https://images.unsplash.com/photo-1762202207738-e0b4b905922d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_hereford text := 'https://images.unsplash.com/photo-1554798372-9f6d1831bd96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_angus    text := 'https://images.unsplash.com/photo-1605633561814-0f4f8e0d76cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_boergoat text := 'https://images.unsplash.com/photo-1677974515169-06644fba2b2e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_merino   text := 'https://images.unsplash.com/photo-1646375445707-cf5c2f2e78f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_dorper   text := 'https://images.unsplash.com/photo-1484557985045-edf25e08da73?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_pig      text := 'https://images.unsplash.com/photo-1764943051090-991c5a82174c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';

  -- Columns:
  -- [1] title  [2] category  [3] breed  [4] age  [5] weight  [6] desc
  -- [7] location  [8] health  [9] start_price  [10] current_bid  [11] image
  -- [12] seller  [13] offset_mins_after_2pm  [14] agent('penny'|'boer')
  -- [15] transport('t'|'f')  [16] pickup_lat  [17] pickup_lng
  specs text[][] := ARRAY[
    -- Burst: first four agent wins settle 2:05–2:11 (proves autonomy fast)
    ARRAY['Hereford Heifer', 'Cattle','Hereford',  '3 years','420kg','Live — settles ~2:05 via CF Worker relay + EcoCash push (Penny Sniper).','Harare',  'Excellent','0.01','0.01',img_hereford,seller_a::text,'5', 'penny','f','',''],
    ARRAY['Brahman Bull',    'Cattle','Brahman',   '4 years','480kg','Live — settles ~2:07 (Penny Sniper).',                                    'Bulawayo','Excellent','0.01','0.01',img_brahman, seller_b::text,'7', 'penny','f','',''],
    ARRAY['Boer Goat',       'Goats', 'Boer',      '1 year', '45kg', 'Live — settles ~2:09 in parallel (Boer Bargainer).',                       'Gweru',   'Excellent','0.01','0.01',img_boergoat,seller_d::text,'9', 'boer', 'f','',''],
    ARRAY['Large White Pig', 'Pigs',  'Large White','9 months','80kg','Live — settles ~2:11 (Boer Bargainer).',                                  'Kwekwe',  'Good',     '0.01','0.01',img_pig,     seller_c::text,'11','boer', 'f','',''],
    -- Trickle through the talk
    ARRAY['Dorper Lamb',     'Sheep', 'Dorper',    '6 months','30kg','Live — settles ~2:15 (Penny Sniper).',                                     'Masvingo','Good',     '0.01','0.01',img_dorper,  seller_e::text,'15','penny','f','',''],
    ARRAY['Mixed Boer Pair', 'Goats', 'Boer Cross','2 years','50kg','Live — settles ~2:22. Transport-enabled (pickup Chinhoyi).',                'Chinhoyi','Good',     '0.01','0.01',img_boergoat,seller_a::text,'22','boer', 't','-17.3667','30.2003'],
    ARRAY['Angus Calf',      'Cattle','Angus',     '8 months','240kg','Live — settles ~2:30. Transport-enabled (pickup Mutare).',                'Mutare',  'Good',     '0.01','0.01',img_angus,   seller_c::text,'30','penny','t','-18.9707','32.6709'],
    ARRAY['Boer Kid',        'Goats', 'Boer',      '4 months','18kg','Live — settles ~2:40 (Boer Bargainer).',                                   'Bulawayo','Excellent','0.01','0.01',img_boergoat,seller_e::text,'40','boer', 'f','',''],
    ARRAY['Merino Ewe',      'Sheep', 'Merino',    '1 year', '38kg','Live — settles ~2:52 (Penny Sniper).',                                      'Kadoma',  'Excellent','0.01','0.01',img_merino,  seller_b::text,'52','penny','f','',''],
    ARRAY['Holstein Heifer', 'Cattle','Holstein',  '2 years','360kg','Live — settles ~3:05. Transport-enabled (pickup Harare). Carries Q&A.',    'Harare',  'Good',     '0.01','0.01',img_brahman, seller_d::text,'65','penny','t','-17.8292','31.0522'],
    ARRAY['Sow & Piglets',   'Pigs',  'Hampshire', '3 years','180kg','Live — settles ~3:20 (Boer Bargainer, end of demo).',                      'Bulawayo','Excellent','0.01','0.01',img_pig,     seller_a::text,'80','boer', 'f','',''],
    ARRAY['Damara Ewe',      'Sheep', 'Damara',    '2 years','42kg','Live — settles ~3:35. Last to settle, post Q&A.',                           'Mutare',  'Good',     '0.01','0.01',img_merino,  seller_c::text,'95','penny','f','','']
  ];

  spec text[];
BEGIN
  ---------------------------------------------------------------------------
  -- 1. Idempotent cleanup of prior DEMO · % rows (FK-aware order)
  ---------------------------------------------------------------------------
  DELETE FROM public.settlement_ledger WHERE payment_order_id IN (
    SELECT id FROM public.agent_payment_orders
     WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO · %')
  );
  DELETE FROM public.agent_payment_orders WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO · %');
  DELETE FROM public.agent_bids  WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO · %');
  DELETE FROM public.payments WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO · %');
  DELETE FROM public.notifications WHERE link LIKE '/item/%' AND link IN (
    SELECT '/item/' || id::text FROM public.livestock_items WHERE title LIKE 'DEMO · %'
  );
  DELETE FROM public.bids        WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO · %');
  DELETE FROM public.conversations WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO · %');
  DELETE FROM public.livestock_items WHERE title LIKE 'DEMO · %';

  ---------------------------------------------------------------------------
  -- 2. Buyer profile carries the demo phone
  ---------------------------------------------------------------------------
  UPDATE public.profiles SET phone = '0781497764' WHERE id = buyer_id;

  ---------------------------------------------------------------------------
  -- 3. Two agents — Penny Sniper (cattle/sheep) + Boer Bargainer (goats/pigs)
  ---------------------------------------------------------------------------
  SELECT id INTO penny_uuid FROM public.agents
   WHERE user_id = buyer_id AND name = 'Penny Sniper' LIMIT 1;
  IF penny_uuid IS NULL THEN
    INSERT INTO public.agents (user_id, agent_type, name, status, config, tenant_id)
    VALUES (buyer_id, 'sniper', 'Penny Sniper', 'active',
            jsonb_build_object(
              'max_bid_usd', 0.05,
              'snipe_window_seconds', 30,
              'payment_phone', '0781497764',
              'category_focus', ARRAY['Cattle', 'Sheep']),
            demo_tenant_id)
    RETURNING id INTO penny_uuid;
  ELSE
    UPDATE public.agents
       SET config = jsonb_set(jsonb_set(jsonb_set(config,
                              '{max_bid_usd}', '0.05'::jsonb),
                              '{payment_phone}', '"0781497764"'::jsonb),
                              '{category_focus}', '["Cattle","Sheep"]'::jsonb),
           status = 'active'
     WHERE id = penny_uuid;
  END IF;

  SELECT id INTO boer_uuid FROM public.agents
   WHERE user_id = buyer_id AND name = 'Boer Bargainer' LIMIT 1;
  IF boer_uuid IS NULL THEN
    INSERT INTO public.agents (user_id, agent_type, name, status, config, tenant_id)
    VALUES (buyer_id, 'sniper', 'Boer Bargainer', 'active',
            jsonb_build_object(
              'max_bid_usd', 0.05,
              'snipe_window_seconds', 30,
              'payment_phone', '0781497764',
              'category_focus', ARRAY['Goats', 'Pigs']),
            demo_tenant_id)
    RETURNING id INTO boer_uuid;
  ELSE
    UPDATE public.agents
       SET config = jsonb_set(jsonb_set(jsonb_set(config,
                              '{max_bid_usd}', '0.05'::jsonb),
                              '{payment_phone}', '"0781497764"'::jsonb),
                              '{category_focus}', '["Goats","Pigs"]'::jsonb),
           status = 'active'
     WHERE id = boer_uuid;
  END IF;

  ---------------------------------------------------------------------------
  -- 4. Seed listings (all LIVE) + pre-placed bids, routed to the right agent
  ---------------------------------------------------------------------------
  FOREACH spec SLICE 1 IN ARRAY specs LOOP
    active_agent_uuid := CASE spec[14] WHEN 'penny' THEN penny_uuid ELSE boer_uuid END;
    v_end := demo_start + make_interval(mins => spec[13]::int);

    INSERT INTO public.livestock_items (
      title, category, breed, age, weight, description, location, health,
      starting_price, current_bid, bid_count, image_urls,
      seller_id, status, duration_days, end_time, created_at, tenant_id,
      auction_format, transport_available, pickup_lat, pickup_lng
    )
    VALUES (
      'DEMO · ' || spec[1] || ' — ends ' || to_char(v_end AT TIME ZONE 'Africa/Harare', 'FMHH12:MIam'),
      spec[2], spec[3], spec[4], spec[5], spec[6], spec[7], spec[8],
      spec[9]::numeric, spec[10]::numeric, 1, ARRAY[spec[11]],
      spec[12]::uuid, 'active', 1,
      v_end,
      NOW() - interval '6 hours',
      demo_tenant_id,
      'timed',
      spec[15] = 't',
      nullif(spec[16], '')::numeric,
      nullif(spec[17], '')::numeric
    )
    RETURNING id INTO item_id;

    -- Buyer's pre-placed bid (via the agent). Flips to winner when the
    -- end-auctions cron settles each listing during the demo.
    INSERT INTO public.bids (livestock_id, user_id, amount, is_winner, created_at, tenant_id)
    VALUES (item_id, buyer_id, spec[10]::numeric, false, NOW() - interval '1 minute', demo_tenant_id)
    RETURNING id INTO bid_uuid;

    INSERT INTO public.agent_bids (agent_id, livestock_id, bid_id, amount, strategy, status)
    VALUES (active_agent_uuid, item_id, bid_uuid, spec[10]::numeric, 'snipe', 'placed');
  END LOOP;

  RAISE NOTICE '2 PM demo seed complete — Penny %, Boer %, 12 live listings settling 2:05–3:35', penny_uuid, boer_uuid;
END $$;

-- Verification — per-listing schedule (Harare clock), agent, transport flag
SELECT
  to_char(li.end_time AT TIME ZONE 'Africa/Harare', 'FMHH12:MIam') AS settles_at,
  a.name AS agent,
  li.title,
  li.status,
  li.current_bid,
  li.transport_available AS transport
FROM public.livestock_items li
JOIN public.agent_bids ab ON ab.livestock_id = li.id
JOIN public.agents a ON a.id = ab.agent_id
WHERE li.title LIKE 'DEMO · %'
ORDER BY li.end_time;
