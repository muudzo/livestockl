-- ============================================================================
-- FINAL DEMO SEED — auctions ending across the next 60 minutes
-- ============================================================================
-- Replaces demo-agent-auctions.sql (April 16 demo). This seed creates a
-- DEMO-prefixed batch with longer end-time spread (5–55 min) so:
--   - The demo presenter can bid live without racing a 2-min countdown.
--   - The agent can win at least one auction during the demo window.
--   - Different attendees can watch staggered settlements.
--
-- Mix: 2 already ended (won, ready for win-detector to settle),
--      8 active staggered every 5–10 minutes across the next hour.
--
-- Buyer profile: tatendawalter62@gmail.com (id 861ee7b2-...).
-- Phone is set to 0781497764 so payment-orchestrator surfaces it.
--
-- IDEMPOTENT: re-running clears any DEMO · %-prefixed rows first.
-- ============================================================================

DO $$
DECLARE
  buyer_id  uuid := '861ee7b2-f543-4bcb-9665-cdb8e3e2a95e';

  seller_a  uuid := '889508c8-7206-46bd-aec2-d21fee774604';
  seller_b  uuid := '0cfc6ae4-3f42-4224-bc43-425fb8ae9cf0';
  seller_c  uuid := 'c9f2bdcb-1102-4af8-98d9-16dc4be6b90f';
  seller_d  uuid := '5a4f04db-aaff-4a8b-9d1b-ac2046d45878';
  seller_e  uuid := '1e397880-49de-4279-9986-def2b22abd26';

  agent_uuid uuid;
  item_id    uuid;
  bid_uuid   uuid;

  img_brahman  text := 'https://images.unsplash.com/photo-1762202207738-e0b4b905922d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_hereford text := 'https://images.unsplash.com/photo-1554798372-9f6d1831bd96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_angus    text := 'https://images.unsplash.com/photo-1605633561814-0f4f8e0d76cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_boergoat text := 'https://images.unsplash.com/photo-1677974515169-06644fba2b2e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_merino   text := 'https://images.unsplash.com/photo-1646375445707-cf5c2f2e78f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_dorper   text := 'https://images.unsplash.com/photo-1484557985045-edf25e08da73?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_pig      text := 'https://images.unsplash.com/photo-1764943051090-991c5a82174c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';

  -- (title_suffix, category, breed, age, weight, desc, location, health, starting_price, current_bid, image, seller, minutes_to_end, state)
  -- All bids ≤ US$0.05 — penny-range so we can demo real EcoCash Express
  -- pushes without burning real money. Agent max_bid_usd is also 0.05.
  specs text[][] := ARRAY[
    ARRAY['Hereford Heifer',  'Cattle', 'Hereford',    '3 years', '420kg', 'Pre-ended for win-detector demo — settles via CF Worker relay + EcoCash push.', 'Harare',   'Excellent', '0.01', '0.01', img_hereford, seller_a::text, '-3',  'ended'],
    ARRAY['Brahman Bull',     'Cattle', 'Brahman',     '4 years', '480kg', 'Pre-ended — second settlement in the batch.',                                  'Bulawayo', 'Excellent', '0.01', '0.02', img_brahman,  seller_b::text, '-3',  'ended'],
    ARRAY['Boer Goat',        'Goats',  'Boer',        '1 year',  '45kg',  'Live — ends 5 min in. Bid live during demo Act 2.',                              'Gweru',    'Excellent', '0.01', '0.01', img_boergoat, seller_d::text, '5',   'active'],
    ARRAY['Dorper Lamb',      'Sheep',  'Dorper',      '6 months','30kg',  'Live — ends 12 min in. Mid-demo settlement window.',                             'Masvingo', 'Good',      '0.01', '0.02', img_dorper,   seller_e::text, '12',  'active'],
    ARRAY['Mixed Boer Pair',  'Goats',  'Boer Cross',  '2 years', '50kg',  'Live — ends 20 min in.',                                                         'Chinhoyi', 'Good',      '0.01', '0.03', img_boergoat, seller_a::text, '20',  'active'],
    ARRAY['Angus Calf',       'Cattle', 'Angus',       '8 months','240kg', 'Live — ends 28 min in. Carries through Q&A buffer.',                             'Mutare',   'Good',      '0.01', '0.04', img_angus,    seller_c::text, '28',  'active'],
    ARRAY['Merino Ewe',       'Sheep',  'Merino',      '1 year',  '38kg',  'Live — ends 35 min in.',                                                         'Kadoma',   'Excellent', '0.01', '0.05', img_merino,   seller_b::text, '35',  'active'],
    ARRAY['Large White Pig',  'Pigs',   'Large White', '9 months','80kg',  'Live — ends 42 min in.',                                                         'Kwekwe',   'Good',      '0.01', '0.02', img_pig,      seller_c::text, '42',  'active'],
    ARRAY['Holstein Heifer',  'Cattle', 'Holstein',    '2 years', '360kg', 'Live — ends 50 min in.',                                                         'Harare',   'Good',      '0.01', '0.03', img_brahman,  seller_d::text, '50',  'active'],
    ARRAY['Boer Kid',         'Goats',  'Boer',        '4 months','18kg',  'Live — ends 58 min in. Last to settle in this batch.',                           'Bulawayo', 'Excellent', '0.01', '0.04', img_boergoat, seller_e::text, '58',  'active']
  ];

  spec text[];
BEGIN
  ---------------------------------------------------------------------------
  -- 1. Idempotent cleanup of prior DEMO · % rows
  ---------------------------------------------------------------------------
  -- Clean up agent flow first
  DELETE FROM public.settlement_ledger WHERE payment_order_id IN (
    SELECT id FROM public.agent_payment_orders
     WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO · %')
  );
  DELETE FROM public.agent_payment_orders WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO · %');
  DELETE FROM public.agent_bids  WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO · %');
  -- Demo payments referencing prior demo listings — must clear BEFORE
  -- livestock_items so the FK from payments.livestock_id doesn't block.
  DELETE FROM public.payments WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO · %');
  DELETE FROM public.notifications WHERE link LIKE '/item/%' AND link IN (
    SELECT '/item/' || id::text FROM public.livestock_items WHERE title LIKE 'DEMO · %'
  );
  DELETE FROM public.bids        WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO · %');
  DELETE FROM public.livestock_items WHERE title LIKE 'DEMO · %';

  ---------------------------------------------------------------------------
  -- 2. Buyer profile carries the demo phone
  ---------------------------------------------------------------------------
  UPDATE public.profiles SET phone = '0781497764' WHERE id = buyer_id;

  ---------------------------------------------------------------------------
  -- 3. Reuse Penny Sniper agent if it exists (don't double up)
  ---------------------------------------------------------------------------
  SELECT id INTO agent_uuid
    FROM public.agents
   WHERE user_id = buyer_id
     AND name = 'Penny Sniper'
   LIMIT 1;

  IF agent_uuid IS NULL THEN
    INSERT INTO public.agents (user_id, agent_type, name, status, config)
    VALUES (buyer_id, 'sniper', 'Penny Sniper', 'active',
            jsonb_build_object('max_bid_usd', 0.05, 'snipe_window_seconds', 30, 'payment_phone', '0781497764'))
    RETURNING id INTO agent_uuid;
  ELSE
    -- Refresh ceiling on the existing agent so all penny-range bids stay
    -- within budget — keeps real EcoCash pushes affordable during the demo.
    UPDATE public.agents
       SET config = jsonb_set(jsonb_set(config, '{max_bid_usd}', '0.05'::jsonb),
                              '{payment_phone}', '"0781497764"'::jsonb)
     WHERE id = agent_uuid;
  END IF;

  ---------------------------------------------------------------------------
  -- 4. Seed listings + pre-placed bids
  ---------------------------------------------------------------------------
  FOREACH spec SLICE 1 IN ARRAY specs LOOP
    INSERT INTO public.livestock_items (
      title, category, breed, age, weight, description, location, health,
      starting_price, current_bid, bid_count, image_urls,
      seller_id, status, duration_days, end_time, created_at
    )
    VALUES (
      'DEMO · ' || spec[1] || (CASE WHEN spec[14] = 'ended' THEN ' — won!' ELSE ' — ends ' || spec[13] || 'm' END),
      spec[2], spec[3], spec[4], spec[5], spec[6], spec[7], spec[8],
      spec[9]::numeric, spec[10]::numeric, 1, ARRAY[spec[11]],
      spec[12]::uuid, spec[14], 1,
      NOW() + make_interval(mins => spec[13]::int),
      NOW() - interval '6 hours'
    )
    RETURNING id INTO item_id;

    -- Buyer's bid. Pre-ended listings are already winners; active ones flip
    -- via end-auctions cron / RPC.
    INSERT INTO public.bids (livestock_id, user_id, amount, is_winner, created_at)
    VALUES (item_id, buyer_id, spec[10]::numeric, spec[14] = 'ended', NOW() - interval '1 minute')
    RETURNING id INTO bid_uuid;

    -- agent_bids.status defaults to 'placed' (now in schema.sql, no longer
    -- relying on a defensive ALTER inside the seed)
    INSERT INTO public.agent_bids (agent_id, livestock_id, bid_id, amount, strategy, status)
    VALUES (agent_uuid, item_id, bid_uuid, spec[10]::numeric, 'snipe', 'placed');
  END LOOP;

  RAISE NOTICE 'Final-demo seed complete — agent %, 10 listings (2 ended + 8 active across 60 min)', agent_uuid;
END $$;

-- Verification
SELECT
  count(*) FILTER (WHERE status = 'active') AS active_listings,
  count(*) FILTER (WHERE status = 'ended')  AS ended_listings,
  min(end_time)                              AS earliest_end,
  max(end_time)                              AS latest_end
FROM public.livestock_items
WHERE title LIKE 'DEMO · %';
