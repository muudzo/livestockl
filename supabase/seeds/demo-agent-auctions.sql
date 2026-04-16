-- ============================================================================
-- AGENT TEST SEED — 10 auctions for buyer-agent end-to-end flow
-- ============================================================================
-- Seeds 10 active auctions staggered 1–10 minutes out, with an auction-sniper
-- agent pre-committed to bid 0.01–0.05 on each. Bids are placed as the buyer
-- directly (same user as agent.user_id) so the agent wins when each ends.
--
-- After seeding:
--   1. Wait for end_time (or run end-expired-auctions function manually).
--   2. end-auctions flips status → 'ended' and sets is_winner on top bid.
--   3. Call win-detector with agentId to fan out payment-orchestrator
--      requests, which logs the EcoCash Express intent for the buyer's phone.
--
-- Profile phone on the buyer is set to 0781497764 so payment-orchestrator
-- surfaces it in the activity-log message.
--
-- IDEMPOTENT: re-running clears any AGENT · %-prefixed rows first.
-- ============================================================================

-- Ensure agent_bids.status column exists (win-detector relies on it but
-- schema.sql omits it — defensive migration)
ALTER TABLE public.agent_bids ADD COLUMN IF NOT EXISTS status text DEFAULT 'placed';

DO $$
DECLARE
  buyer_id  uuid := '861ee7b2-f543-4bcb-9665-cdb8e3e2a95e';  -- tatendawalter62@gmail.com

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

  -- 10 listing tuples: (title_suffix, category, breed, age, weight, desc, location, health, starting_price, winning_bid, image, seller, minutes_to_end, state)
  -- state = 'ended' means end_time in the past and status='ended' (ready for win-detector)
  -- state = 'active' means end_time = NOW() + minutes_to_end
  -- Demo mix: 3 already ended + 7 active staggered 2-14 min out.
  specs text[][] := ARRAY[
    ARRAY['Hereford Heifer',    'Cattle',  'Hereford',       '3 years', '420kg', 'Pre-ended — ready for agent win-detector to settle via CF Worker relay + real EcoCash push.',  'Harare',    'Excellent', '0.01', '0.01', img_hereford, seller_a::text, '-2',  'ended'],
    ARRAY['Brahman Bull',       'Cattle',  'Brahman',        '4 years', '480kg', 'Pre-ended — second settlement in the batch.',                                                  'Bulawayo',  'Excellent', '0.01', '0.02', img_brahman,  seller_b::text, '-2',  'ended'],
    ARRAY['Angus Calf',         'Cattle',  'Angus',          '8 months','240kg', 'Pre-ended — shows multi-listing rollup on the Agent Dashboard.',                                'Mutare',    'Good',      '0.01', '0.03', img_angus,    seller_c::text, '-2',  'ended'],
    ARRAY['Boer Goat',          'Goats',   'Boer',           '1 year',  '45kg',  'Live — ends 2 min into the demo; watch end-auctions cron flip status.',                          'Gweru',     'Excellent', '0.01', '0.04', img_boergoat, seller_d::text, '2',   'active'],
    ARRAY['Dorper Lamb',        'Sheep',   'Dorper',         '6 months','30kg',  'Live — ends 4 min in.',                                                                          'Masvingo',  'Good',      '0.01', '0.05', img_dorper,   seller_e::text, '4',   'active'],
    ARRAY['Mixed Boer Pair',    'Goats',   'Boer Cross',     '2 years', '50kg',  'Live — ends 6 min in.',                                                                          'Chinhoyi',  'Good',      '0.01', '0.01', img_boergoat, seller_a::text, '6',   'active'],
    ARRAY['Merino Ewe',         'Sheep',   'Merino',         '1 year',  '38kg',  'Live — ends 8 min in.',                                                                          'Kadoma',    'Excellent', '0.01', '0.02', img_merino,   seller_b::text, '8',   'active'],
    ARRAY['Large White Pig',    'Pigs',    'Large White',    '9 months','80kg',  'Live — ends 10 min in.',                                                                         'Kwekwe',    'Good',      '0.01', '0.03', img_pig,      seller_c::text, '10',  'active'],
    ARRAY['Holstein Heifer',    'Cattle',  'Holstein',       '2 years', '360kg', 'Live — ends 12 min in. Carries the demo through Q&A overrun.',                                   'Harare',    'Good',      '0.01', '0.04', img_brahman,  seller_d::text, '12',  'active'],
    ARRAY['Boer Kid',           'Goats',   'Boer',           '4 months','18kg',  'Live — ends 14 min in.',                                                                         'Bulawayo',  'Excellent', '0.01', '0.05', img_boergoat, seller_e::text, '14',  'active']
  ];

  spec text[];
BEGIN
  ---------------------------------------------------------------------------
  -- 1. Idempotent cleanup
  ---------------------------------------------------------------------------
  DELETE FROM public.settlement_ledger WHERE payment_order_id IN (
    SELECT id FROM public.agent_payment_orders
     WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'AGENT · %')
  );
  DELETE FROM public.agent_payment_orders WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'AGENT · %');
  DELETE FROM public.agent_bids  WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'AGENT · %');
  DELETE FROM public.bids        WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'AGENT · %');
  DELETE FROM public.livestock_items WHERE title LIKE 'AGENT · %';

  ---------------------------------------------------------------------------
  -- 2. Ensure buyer profile has the demo phone
  ---------------------------------------------------------------------------
  UPDATE public.profiles
     SET phone = '0781497764'
   WHERE id = buyer_id;

  ---------------------------------------------------------------------------
  -- 3. Buyer agent (reuse if exists by name)
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
  END IF;

  ---------------------------------------------------------------------------
  -- 4. Seed 10 listings + pre-placed winning bids
  ---------------------------------------------------------------------------
  FOREACH spec SLICE 1 IN ARRAY specs LOOP
    INSERT INTO public.livestock_items (
      title, category, breed, age, weight, description, location, health,
      starting_price, current_bid, bid_count, image_urls,
      seller_id, status, duration_days, end_time, created_at
    )
    VALUES (
      'AGENT · ' || spec[1] || (CASE WHEN spec[14] = 'ended' THEN ' — won!' ELSE ' — ends ' || spec[13] || 'm' END),
      spec[2], spec[3], spec[4], spec[5], spec[6], spec[7], spec[8],
      spec[9]::numeric, spec[10]::numeric, 1, ARRAY[spec[11]],
      spec[12]::uuid, spec[14], 1,
      NOW() + make_interval(mins => spec[13]::int),
      NOW() - interval '6 hours'
    )
    RETURNING id INTO item_id;

    -- Buyer's winning bid. For pre-ended listings we set is_winner=true so
    -- win-detector picks it up on first fire; active listings stay false
    -- until end-auctions cron flips them.
    INSERT INTO public.bids (livestock_id, user_id, amount, is_winner, created_at)
    VALUES (item_id, buyer_id, spec[10]::numeric, spec[14] = 'ended', NOW() - interval '1 minute')
    RETURNING id INTO bid_uuid;

    -- Link it through agent_bids so win-detector can settle it
    INSERT INTO public.agent_bids (agent_id, livestock_id, bid_id, amount, strategy, status)
    VALUES (agent_uuid, item_id, bid_uuid, spec[10]::numeric, 'snipe', 'placed');
  END LOOP;

  RAISE NOTICE 'Agent seed complete — agent %, 10 listings, ending in 1–10 minutes', agent_uuid;
END $$;

-- Verification
SELECT
  (SELECT count(*) FROM public.livestock_items WHERE title LIKE 'AGENT · %')  AS listings,
  (SELECT count(*) FROM public.bids b JOIN public.livestock_items l ON l.id=b.livestock_id WHERE l.title LIKE 'AGENT · %') AS bids,
  (SELECT count(*) FROM public.agent_bids ab JOIN public.livestock_items l ON l.id=ab.livestock_id WHERE l.title LIKE 'AGENT · %') AS agent_bids,
  (SELECT phone FROM public.profiles WHERE id = '861ee7b2-f543-4bcb-9665-cdb8e3e2a95e') AS buyer_phone;
