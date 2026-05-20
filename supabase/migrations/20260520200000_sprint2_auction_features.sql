-- Sprint 2: demo lots, timed auction format, bidder verification gate

ALTER TABLE public.livestock_items
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auction_format text NOT NULL DEFAULT 'timed'
    CHECK (auction_format IN ('live', 'timed')),
  ADD COLUMN IF NOT EXISTS verified_bidders_only boolean NOT NULL DEFAULT false;

-- Rebuild place_bid with:
--   1. Demo lots skip the seller-self-bid guard and skip notifications
--   2. verified_bidders_only gate against profiles.verified
CREATE OR REPLACE FUNCTION public.place_bid(
  p_livestock_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_idempotency_key uuid default null
)
RETURNS uuid AS $$
DECLARE
  v_item record;
  v_bid_id uuid;
  v_prev_bidder record;
  v_existing_bid_id uuid;
  v_bidder_verified boolean;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_bid_id
    FROM public.bids
    WHERE user_id = p_user_id
      AND idempotency_key = p_idempotency_key
    LIMIT 1;
    IF v_existing_bid_id IS NOT NULL THEN
      RETURN v_existing_bid_id;
    END IF;
  END IF;

  SELECT * INTO v_item
  FROM public.livestock_items
  WHERE id = p_livestock_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  IF v_item.status != 'active' THEN
    RAISE EXCEPTION 'Auction is not active';
  END IF;

  IF v_item.end_time <= now() THEN
    UPDATE public.livestock_items SET status = 'ended' WHERE id = p_livestock_id;
    RAISE EXCEPTION 'Auction has ended';
  END IF;

  -- Demo lots allow the seller to bid (practice flow); real lots block it.
  IF v_item.seller_id = p_user_id AND NOT v_item.is_demo THEN
    RAISE EXCEPTION 'Cannot bid on your own listing';
  END IF;

  IF p_amount <= v_item.current_bid THEN
    RAISE EXCEPTION 'Bid must be higher than current bid of %', v_item.current_bid;
  END IF;

  IF p_amount < v_item.starting_price THEN
    RAISE EXCEPTION 'Bid must be at least the starting price of %', v_item.starting_price;
  END IF;

  -- Verified-bidders gate
  IF v_item.verified_bidders_only THEN
    SELECT verified INTO v_bidder_verified
    FROM public.profiles
    WHERE id = p_user_id;
    IF NOT COALESCE(v_bidder_verified, false) THEN
      RAISE EXCEPTION 'This auction requires a verified account to bid';
    END IF;
  END IF;

  INSERT INTO public.bids (livestock_id, user_id, amount, idempotency_key)
  VALUES (p_livestock_id, p_user_id, p_amount, p_idempotency_key)
  RETURNING id INTO v_bid_id;

  UPDATE public.livestock_items
  SET current_bid = p_amount,
      bid_count = bid_count + 1
  WHERE id = p_livestock_id;

  -- Skip notifications on demo lots — they generate noise with no real stakes.
  IF NOT v_item.is_demo THEN
    INSERT INTO public.notifications (user_id, type, title, message, priority, link)
    VALUES (v_item.seller_id, 'bid', 'New bid on your listing',
            'Someone bid US$' || p_amount || ' on ' || v_item.title,
            'medium', '/my-listings');

    FOR v_prev_bidder IN
      SELECT DISTINCT ON (user_id) user_id
      FROM public.bids
      WHERE livestock_id = p_livestock_id
        AND user_id != p_user_id
        AND id != v_bid_id
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, priority, link)
      VALUES (v_prev_bidder.user_id, 'bid', 'You''ve been outbid!',
              'A new bid of US$' || p_amount || ' was placed on ' || v_item.title || '. Place a higher bid to stay in the race!',
              'high', '/item/' || p_livestock_id::text);
    END LOOP;
  END IF;

  RETURN v_bid_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
