-- ============================================================================
-- FINAL DEMO SEED — auctions ending across the next 60 minutes (2 agents)
-- ============================================================================
-- Replaces demo-agent-auctions.sql (April 16 demo). This seed creates a
-- DEMO-prefixed batch where two distinct buyer agents — each with its own
-- strategy and category focus — accumulate multiple wins each.
--
--   Agent 1: Penny Sniper       (sniper, cattle/sheep focus)
--   Agent 2: Boer Bargainer     (sniper, goats/pigs focus)
--
-- Mix: 4 already ended (2 per agent — ready for win-detector to settle),
--      8 active staggered every 5–8 min across the next hour
--      (4 active per agent, distinct categories so they don't compete
--      head-to-head; the demo focuses on parallel autonomous flows).
--
-- All bids ≤ US$0.05 — penny-range so we can demo real EcoCash Express
-- pushes without burning real money. Both agents have max_bid_usd = 0.05.
--
-- Buyer profile: tatendawalter62@gmail.com (id 861ee7b2-...).
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

  penny_uuid uuid;
  boer_uuid  uuid;
  active_agent_uuid uuid;
  item_id    uuid;
  bid_uuid   uuid;

  -- Multi-tenant pivot (2026-05-11) made tenant_id NOT NULL. All demo
  -- buyer/sellers belong to zimlivestock-demo (verified 2026-05-28).
  demo_tenant_id uuid := '9d227a90-5958-4de3-93a9-82d410faedd0';

  img_brahman  text := 'https://images.unsplash.com/photo-1762202207738-e0b4b905922d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_hereford text := 'https://images.unsplash.com/photo-1554798372-9f6d1831bd96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_angus    text := 'https://images.unsplash.com/photo-1605633561814-0f4f8e0d76cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_boergoat text := 'https://images.unsplash.com/photo-1677974515169-06644fba2b2e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_merino   text := 'https://images.unsplash.com/photo-1646375445707-cf5c2f2e78f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_dorper   text := 'https://images.unsplash.com/photo-1484557985045-edf25e08da73?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_pig      text := 'https://images.unsplash.com/photo-1764943051090-991c5a82174c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';

  -- (title_suffix, category, breed, age, weight, desc, location, health, starting_price, current_bid, image, seller, minutes_to_end, state, agent_label)
  -- agent_label is 'penny' or 'boer' — routes the agent_bid to the right agent.
  -- Penny Sniper: cattle + sheep (5 listings — 2 ended + 3 active)
  -- Boer Bargainer: goats + pigs (5 listings — 2 ended + 3 active)
  specs text[][] := ARRAY[
    ARRAY['Hereford Heifer',  'Cattle', 'Hereford',    '3 years', '420kg', 'Pre-ended — Penny Sniper #1 settles via CF Worker relay + EcoCash push.', 'Harare',   'Excellent', '0.01', '0.01', img_hereford, seller_a::text, '-3',  'ended',  'penny'],
    ARRAY['Brahman Bull',     'Cattle', 'Brahman',     '4 years', '480kg', 'Pre-ended — Penny Sniper #2.',                                            'Bulawayo', 'Excellent', '0.01', '0.02', img_brahman,  seller_b::text, '-3',  'ended',  'penny'],
    ARRAY['Boer Goat',        'Goats',  'Boer',        '1 year',  '45kg',  'Pre-ended — Boer Bargainer #1 settles in parallel.',                       'Gweru',    'Excellent', '0.01', '0.01', img_boergoat, seller_d::text, '-3',  'ended',  'boer'],
    ARRAY['Large White Pig',  'Pigs',   'Large White', '9 months','80kg',  'Pre-ended — Boer Bargainer #2.',                                          'Kwekwe',   'Good',      '0.01', '0.02', img_pig,      seller_c::text, '-3',  'ended',  'boer'],
    ARRAY['Dorper Lamb',      'Sheep',  'Dorper',      '6 months','30kg',  'Live — ends right at demo start (~15:00 Harare).',                         'Masvingo', 'Good',      '0.01', '0.02', img_dorper,   seller_e::text, '159', 'active', 'penny'],
    ARRAY['Mixed Boer Pair',  'Goats',  'Boer Cross',  '2 years', '50kg',  'Live — ends ~8 min into demo. Boer Bargainer.',                            'Chinhoyi', 'Good',      '0.01', '0.03', img_boergoat, seller_a::text, '167', 'active', 'boer'],
    ARRAY['Angus Calf',       'Cattle', 'Angus',       '8 months','240kg', 'Live — ends ~16 min in. Penny Sniper, mid-demo settlement.',               'Mutare',   'Good',      '0.01', '0.04', img_angus,    seller_c::text, '175', 'active', 'penny'],
    ARRAY['Boer Kid',         'Goats',  'Boer',        '4 months','18kg',  'Live — ends ~24 min in. Boer Bargainer.',                                  'Bulawayo', 'Excellent', '0.01', '0.04', img_boergoat, seller_e::text, '183', 'active', 'boer'],
    ARRAY['Merino Ewe',       'Sheep',  'Merino',      '1 year',  '38kg',  'Live — ends ~32 min in. Penny Sniper.',                                    'Kadoma',   'Excellent', '0.01', '0.05', img_merino,   seller_b::text, '191', 'active', 'penny'],
    ARRAY['Holstein Heifer',  'Cattle', 'Holstein',    '2 years', '360kg', 'Live — ends ~40 min in. Carries through Q&A buffer.',                      'Harare',   'Good',      '0.01', '0.03', img_brahman,  seller_d::text, '199', 'active', 'penny'],
    ARRAY['Sow & Piglets',    'Pigs',   'Hampshire',   '3 years', '180kg', 'Live — ends ~56 min in. Boer Bargainer, end of demo.',                     'Bulawayo', 'Excellent', '0.01', '0.04', img_pig,      seller_a::text, '215', 'active', 'boer'],
    ARRAY['Damara Ewe',       'Sheep',  'Damara',      '2 years', '42kg',  'Live — ends ~80 min in. Last to settle, post Q&A.',                        'Mutare',   'Good',      '0.01', '0.05', img_merino,   seller_c::text, '240', 'active', 'penny']
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
  -- payments must clear BEFORE livestock_items (FK from payments.livestock_id)
  DELETE FROM public.payments WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO · %');
  DELETE FROM public.notifications WHERE link LIKE '/item/%' AND link IN (
    SELECT '/item/' || id::text FROM public.livestock_items WHERE title LIKE 'DEMO · %'
  );
  DELETE FROM public.bids        WHERE livestock_id IN (SELECT id FROM public.livestock_items WHERE title LIKE 'DEMO · %');
  -- conversations.livestock_id FKs livestock_items with NO ACTION in prod
  -- and isn't declared in schema.sql; clean explicitly so the next DELETE
  -- doesn't trip. (transport_requests now cascades — see migration
  -- 20260528010000_align_transport_fk_cascade.sql.)
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
  -- 4. Seed listings + pre-placed bids, routed to the right agent
  ---------------------------------------------------------------------------
  FOREACH spec SLICE 1 IN ARRAY specs LOOP
    -- Resolve agent for this listing
    active_agent_uuid := CASE spec[15] WHEN 'penny' THEN penny_uuid ELSE boer_uuid END;

    INSERT INTO public.livestock_items (
      title, category, breed, age, weight, description, location, health,
      starting_price, current_bid, bid_count, image_urls,
      seller_id, status, duration_days, end_time, created_at, tenant_id
    )
    VALUES (
      'DEMO · ' || spec[1] || (CASE WHEN spec[14] = 'ended' THEN ' — won!' ELSE ' — ends ' || spec[13] || 'm' END),
      spec[2], spec[3], spec[4], spec[5], spec[6], spec[7], spec[8],
      spec[9]::numeric, spec[10]::numeric, 1, ARRAY[spec[11]],
      spec[12]::uuid, spec[14], 1,
      NOW() + make_interval(mins => spec[13]::int),
      NOW() - interval '6 hours',
      demo_tenant_id
    )
    RETURNING id INTO item_id;

    -- Buyer's bid. Pre-ended listings are already winners; active ones flip
    -- when end-auctions / place_bid fires.
    INSERT INTO public.bids (livestock_id, user_id, amount, is_winner, created_at, tenant_id)
    VALUES (item_id, buyer_id, spec[10]::numeric, spec[14] = 'ended', NOW() - interval '1 minute', demo_tenant_id)
    RETURNING id INTO bid_uuid;

    INSERT INTO public.agent_bids (agent_id, livestock_id, bid_id, amount, strategy, status)
    VALUES (active_agent_uuid, item_id, bid_uuid, spec[10]::numeric, 'snipe', 'placed');
  END LOOP;

  RAISE NOTICE 'Final-demo seed complete — Penny %, Boer %, 12 listings (4 ended + 8 active across 60 min)', penny_uuid, boer_uuid;
END $$;

-- Verification — wins per agent + active count + end-time spread
SELECT
  a.name AS agent,
  count(*) FILTER (WHERE li.status = 'ended')  AS already_won,
  count(*) FILTER (WHERE li.status = 'active') AS active_bids,
  min(li.end_time) AS earliest_end,
  max(li.end_time) AS latest_end
FROM public.agents a
JOIN public.agent_bids ab ON ab.agent_id = a.id
JOIN public.livestock_items li ON li.id = ab.livestock_id
WHERE li.title LIKE 'DEMO · %'
GROUP BY a.name
ORDER BY a.name;
