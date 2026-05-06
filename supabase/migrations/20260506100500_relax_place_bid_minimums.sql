-- Drop the "must beat current bid" and "must beat starting price" checks in
-- place_bid. Demo / agentic flows want to place arbitrary positive amounts.
-- The bids.amount > 0 column check still prevents zero/negative bids.

create or replace function public.place_bid(
  p_livestock_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_idempotency_key uuid default null
)
returns uuid as $$
declare
  v_item record;
  v_bid_id uuid;
  v_prev_bidder record;
  v_existing_bid_id uuid;
begin
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

  select * into v_item
  from public.livestock_items
  where id = p_livestock_id
  for update;

  if not found then
    raise exception 'Listing not found';
  end if;

  if v_item.status != 'active' then
    raise exception 'Auction is not active';
  end if;

  if v_item.end_time <= now() then
    update public.livestock_items set status = 'ended' where id = p_livestock_id;
    raise exception 'Auction has ended';
  end if;

  if v_item.seller_id = p_user_id then
    raise exception 'Cannot bid on your own listing';
  end if;

  -- (Removed: amount must beat current_bid / starting_price)

  insert into public.bids (livestock_id, user_id, amount, idempotency_key)
  values (p_livestock_id, p_user_id, p_amount, p_idempotency_key)
  returning id into v_bid_id;

  update public.livestock_items
  set current_bid = p_amount,
      bid_count = bid_count + 1
  where id = p_livestock_id;

  insert into public.notifications (user_id, type, title, message, priority, link)
  values (v_item.seller_id, 'bid', 'New bid on your listing',
          'Someone bid US$' || p_amount || ' on ' || v_item.title,
          'medium',
          '/my-listings');

  for v_prev_bidder in
    select distinct on (user_id) user_id
    from public.bids
    where livestock_id = p_livestock_id
      and user_id != p_user_id
      and id != v_bid_id
  loop
    insert into public.notifications (user_id, type, title, message, priority, link)
    values (v_prev_bidder.user_id, 'bid', 'You''ve been outbid!',
            'A new bid of US$' || p_amount || ' was placed on ' || v_item.title || '. Place a higher bid to stay in the race!',
            'high',
            '/item/' || p_livestock_id::text);
  end loop;

  return v_bid_id;
end;
$$ language plpgsql security definer;
