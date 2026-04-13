-- ============================================================================
-- DEMO AUCTION SEED — executed against production 2026-04-13
-- ============================================================================
-- Seeds 3 won + 6 active auctions for supervisor demo, e2e payment testing,
-- and agent testing. Real seller profiles (seller-a through seller-e) are
-- used as sellers, with the demo buyer winning 3 ended auctions and active
-- listings ending at 10/20/30/45/60/90 minute intervals.
--
-- RUNNING THIS SCRIPT
--   Option A — Supabase SQL Editor (easiest):
--     1. Paste this file into https://supabase.com/dashboard/project/hmeieslclzycyjjjflfh/sql
--     2. Replace `buyer_id` below with your own auth UID if not tatendawalter62@gmail.com
--     3. Run
--
--   Option B — Management API (what this session used):
--     curl -X POST "https://api.supabase.com/v1/projects/hmeieslclzycyjjjflfh/database/query" \
--       -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
--       -H "Content-Type: application/json" \
--       -d "$(python3 -c "import json; print(json.dumps({'query': open('supabase/seeds/demo-auctions.sql').read()}))")"
--
-- IDEMPOTENT: re-running deletes any DEMO · %-prefixed rows first.
--
-- ROLLBACK:
--   DELETE FROM bids WHERE livestock_id IN (SELECT id FROM livestock_items WHERE title LIKE 'DEMO · %');
--   DELETE FROM notifications WHERE title LIKE 'DEMO · %';
--   DELETE FROM livestock_items WHERE title LIKE 'DEMO · %';
-- ============================================================================

DO $$
DECLARE
  -- Swap this UUID if demoing from a different account:
  --   SELECT id FROM auth.users WHERE email = 'your@email';
  buyer_id  uuid := '861ee7b2-f543-4bcb-9665-cdb8e3e2a95e';  -- tatendawalter62@gmail.com

  -- Real seed sellers already in auth.users + profiles (from 2026-03-17 seed)
  seller_a  uuid := '889508c8-7206-46bd-aec2-d21fee774604';  -- seller-a@test.zl (Tendai Moyo)
  seller_b  uuid := '0cfc6ae4-3f42-4224-bc43-425fb8ae9cf0';  -- seller-b@test.zl (Chiedza Ncube)
  seller_c  uuid := 'c9f2bdcb-1102-4af8-98d9-16dc4be6b90f';  -- seller-c@test.zl (Tapiwa Chirwa)
  seller_d  uuid := '5a4f04db-aaff-4a8b-9d1b-ac2046d45878';  -- seller-d@test.zl (Rumbidzai Dube)
  seller_e  uuid := '1e397880-49de-4279-9986-def2b22abd26';  -- seller-e@test.zl (Farai Mhaka)

  item_id   uuid;

  -- Context-correct livestock images (same verified URLs as mockData.ts — no Figma referrals)
  img_brahman  text := 'https://images.unsplash.com/photo-1762202207738-e0b4b905922d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_hereford text := 'https://images.unsplash.com/photo-1554798372-9f6d1831bd96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_angus    text := 'https://images.unsplash.com/photo-1605633561814-0f4f8e0d76cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_boergoat text := 'https://images.unsplash.com/photo-1677974515169-06644fba2b2e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_merino   text := 'https://images.unsplash.com/photo-1646375445707-cf5c2f2e78f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_dorper   text := 'https://images.unsplash.com/photo-1484557985045-edf25e08da73?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
  img_pig      text := 'https://images.unsplash.com/photo-1764943051090-991c5a82174c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80';
BEGIN
  -- ── Cleanup for idempotency ──
  DELETE FROM bids WHERE livestock_id IN (SELECT id FROM livestock_items WHERE title LIKE 'DEMO · %');
  DELETE FROM notifications WHERE user_id = buyer_id AND (title LIKE 'DEMO · %' OR message LIKE '%DEMO ·%');
  DELETE FROM livestock_items WHERE title LIKE 'DEMO · %';

  -- ============================================================================
  -- 3 WON AUCTIONS (buyer is winner, status=ended) — ready for checkout testing
  -- ============================================================================

  -- Won #1: Brahman Bull — seller_a (Tendai Moyo)
  INSERT INTO livestock_items (title, category, breed, age, weight, description, location, health, starting_price, current_bid, bid_count, image_urls, seller_id, status, duration_days, end_time, created_at)
  VALUES ('DEMO · Brahman Bull — you won!', 'Cattle', 'Brahman', '3 years', '450kg', 'Demo won auction. Pay via Paynow EcoCash/OneMoney/Card to exercise the full winner checkout flow including the pollurl fallback.', 'Harare', 'Excellent', 500, 650, 4, ARRAY[img_brahman], seller_a, 'ended', 1, NOW() - interval '10 minutes', NOW() - interval '2 days')
  RETURNING id INTO item_id;
  INSERT INTO bids (livestock_id, user_id, amount, is_winner, created_at) VALUES
    (item_id, seller_c, 550, false, NOW() - interval '1 day'),
    (item_id, seller_d, 600, false, NOW() - interval '12 hours'),
    (item_id, buyer_id, 650, true, NOW() - interval '30 minutes');
  INSERT INTO notifications (user_id, type, title, message, priority, created_at)
  VALUES (buyer_id, 'auction_won', 'DEMO · You won the Brahman Bull', 'You won DEMO · Brahman Bull for US$650. Complete payment to confirm the sale.', 'high', NOW() - interval '10 minutes');

  -- Won #2: Boer Goat Pair — seller_b (Chiedza Ncube)
  INSERT INTO livestock_items (title, category, breed, age, weight, description, location, health, starting_price, current_bid, bid_count, image_urls, seller_id, status, duration_days, end_time, created_at)
  VALUES ('DEMO · Boer Goat Pair — you won!', 'Goats', 'Boer', '2 years', '55kg each', 'Demo won auction. Test checkout with EcoCash: use test number 0771111111 for success.', 'Bulawayo', 'Excellent', 250, 340, 3, ARRAY[img_boergoat], seller_b, 'ended', 1, NOW() - interval '8 minutes', NOW() - interval '2 days')
  RETURNING id INTO item_id;
  INSERT INTO bids (livestock_id, user_id, amount, is_winner, created_at) VALUES
    (item_id, seller_e, 280, false, NOW() - interval '1 day'),
    (item_id, buyer_id, 340, true, NOW() - interval '20 minutes');
  INSERT INTO notifications (user_id, type, title, message, priority, created_at)
  VALUES (buyer_id, 'auction_won', 'DEMO · You won the Boer Goat Pair', 'You won DEMO · Boer Goat Pair for US$340. Ready for checkout.', 'high', NOW() - interval '8 minutes');

  -- Won #3: Merino Sheep — seller_c (Tapiwa Chirwa). Use 0774444444 on checkout to exercise insufficient-funds fix (f608193).
  INSERT INTO livestock_items (title, category, breed, age, weight, description, location, health, starting_price, current_bid, bid_count, image_urls, seller_id, status, duration_days, end_time, created_at)
  VALUES ('DEMO · Merino Sheep — you won!', 'Sheep', 'Merino', '1 year', '40kg', 'Demo won auction #3. Use 0774444444 on checkout to exercise the insufficient-funds fix (commit f608193).', 'Mutare', 'Good', 180, 220, 2, ARRAY[img_merino], seller_c, 'ended', 1, NOW() - interval '5 minutes', NOW() - interval '1 day')
  RETURNING id INTO item_id;
  INSERT INTO bids (livestock_id, user_id, amount, is_winner, created_at) VALUES
    (item_id, seller_a, 200, false, NOW() - interval '6 hours'),
    (item_id, buyer_id, 220, true, NOW() - interval '10 minutes');
  INSERT INTO notifications (user_id, type, title, message, priority, created_at)
  VALUES (buyer_id, 'auction_won', 'DEMO · You won the Merino Sheep', 'You won DEMO · Merino Sheep for US$220.', 'high', NOW() - interval '5 minutes');

  -- ============================================================================
  -- 6 ACTIVE AUCTIONS staggered at 10 / 20 / 30 / 45 / 60 / 90 min expiries
  -- ============================================================================

  -- Active #1: Hereford Cow — ending in 10 min (good for on-stage cron demo)
  INSERT INTO livestock_items (title, category, breed, age, weight, description, location, health, starting_price, current_bid, image_urls, seller_id, status, duration_days, end_time, created_at)
  VALUES ('DEMO · Hereford Cow — ending in 10 min', 'Cattle', 'Hereford', '4 years', '520kg', 'Auction closing in ~10 minutes. Good for demoing the end-auctions cron trigger on stage.', 'Harare', 'Excellent', 800, 850, ARRAY[img_hereford], seller_a, 'active', 1, NOW() + interval '10 minutes', NOW() - interval '23 hours');

  -- Active #2: Boer Goat Pair — 20 min (bid-war window)
  INSERT INTO livestock_items (title, category, breed, age, weight, description, location, health, starting_price, current_bid, image_urls, seller_id, status, duration_days, end_time, created_at)
  VALUES ('DEMO · Boer Goat Pair — ending in 20 min', 'Goats', 'Boer', '2 years', '45kg each', 'Active, ~20 min window. Place competing bids to exercise realtime + outbid notifications.', 'Bulawayo', 'Good', 250, 300, ARRAY[img_boergoat], seller_b, 'active', 1, NOW() + interval '20 minutes', NOW() - interval '22 hours');

  -- Active #3: Dorper Sheep — 30 min (sniper-agent window)
  INSERT INTO livestock_items (title, category, breed, age, weight, description, location, health, starting_price, current_bid, image_urls, seller_id, status, duration_days, end_time, created_at)
  VALUES ('DEMO · Dorper Sheep — ending in 30 min', 'Sheep', 'Dorper', '1 year', '35kg', 'Active, ~30 min. Ideal window for auction-sniper agent to place a last-second bid.', 'Mutare', 'Good', 180, 210, ARRAY[img_dorper], seller_c, 'active', 1, NOW() + interval '30 minutes', NOW() - interval '21 hours');

  -- Active #4: Large White Pigs (3) — 45 min (buyer-agent window)
  INSERT INTO livestock_items (title, category, breed, age, weight, description, location, health, starting_price, current_bid, image_urls, seller_id, status, duration_days, end_time, created_at)
  VALUES ('DEMO · Large White Pigs (3) — ending in 45 min', 'Pigs', 'Large White', '8 months', '75kg each', 'Active, ~45 min. Use this to test buyer-agent auto-bidding under a budget cap.', 'Gweru', 'Good', 320, 370, ARRAY[img_pig], seller_d, 'active', 1, NOW() + interval '45 minutes', NOW() - interval '20 hours');

  -- Active #5: Angus Heifer — 1 hour (market-intel window)
  INSERT INTO livestock_items (title, category, breed, age, weight, description, location, health, starting_price, current_bid, image_urls, seller_id, status, duration_days, end_time, created_at)
  VALUES ('DEMO · Angus Heifer — ending in 1 hour', 'Cattle', 'Angus', '2 years', '380kg', 'Active, 1 hour window. Longer-horizon listing so market-intel agent can build a pricing view.', 'Masvingo', 'Excellent', 650, 700, ARRAY[img_angus], seller_e, 'active', 1, NOW() + interval '60 minutes', NOW() - interval '19 hours');

  -- Active #6: Mixed Boer Goats (5) — 90 min (Q&A overrun window)
  INSERT INTO livestock_items (title, category, breed, age, weight, description, location, health, starting_price, current_bid, image_urls, seller_id, status, duration_days, end_time, created_at)
  VALUES ('DEMO · Mixed Boer Goats (5) — ending in 90 min', 'Goats', 'Boer Cross', '1-2 years', '40kg avg', 'Active, 90 min window. Keeps the feed populated through the supervisor Q&A overrun.', 'Kadoma', 'Good', 450, 480, ARRAY[img_boergoat], seller_a, 'active', 1, NOW() + interval '90 minutes', NOW() - interval '18 hours');

  -- ============================================================================
  -- Opening bids on each active item for UI realism (one competing bid @ -$25)
  -- ============================================================================
  FOR item_id IN (SELECT id FROM livestock_items WHERE title LIKE 'DEMO ·%' AND status = 'active') LOOP
    INSERT INTO bids (livestock_id, user_id, amount, is_winner, created_at)
    SELECT item_id, seller_b, current_bid - 25, false, NOW() - interval '2 hours' FROM livestock_items WHERE id = item_id;
    UPDATE livestock_items SET bid_count = 1 WHERE id = item_id;
  END LOOP;

  RAISE NOTICE 'Seed complete — 3 won + 6 active demo auctions for user %', buyer_id;
END $$;

-- Summary counts
SELECT
  (SELECT count(*) FROM livestock_items WHERE title LIKE 'DEMO · %' AND status = 'ended')   AS won_count,
  (SELECT count(*) FROM livestock_items WHERE title LIKE 'DEMO · %' AND status = 'active')  AS active_count,
  (SELECT count(*) FROM bids WHERE livestock_id IN (SELECT id FROM livestock_items WHERE title LIKE 'DEMO · %')) AS total_bids,
  (SELECT count(*) FROM notifications WHERE title LIKE 'DEMO · %') AS demo_notifs;
