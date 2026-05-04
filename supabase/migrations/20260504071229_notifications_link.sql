-- Add deep-link column to notifications + populate it from place_bid /
-- end_expired_auctions so the in-app notification panel can route to the
-- right destination per recipient (sellers vs outbid bidders both use
-- type='bid', so type alone isn't enough to disambiguate).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE FUNCTION.
-- Safe to apply repeatedly. Existing rows keep link=NULL and the client
-- falls back to type-based routing for them.

alter table public.notifications add column if not exists link text;

-- ─── place_bid: same body as schema.sql, with link populated ───
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

  if p_amount <= v_item.current_bid then
    raise exception 'Bid must be higher than current bid of %', v_item.current_bid;
  end if;

  if p_amount < v_item.starting_price then
    raise exception 'Bid must be at least the starting price of %', v_item.starting_price;
  end if;

  insert into public.bids (livestock_id, user_id, amount, idempotency_key)
  values (p_livestock_id, p_user_id, p_amount, p_idempotency_key)
  returning id into v_bid_id;

  update public.livestock_items
  set current_bid = p_amount,
      bid_count = bid_count + 1
  where id = p_livestock_id;

  -- Seller → /my-listings
  insert into public.notifications (user_id, type, title, message, priority, link)
  values (v_item.seller_id, 'bid', 'New bid on your listing',
          'Someone bid US$' || p_amount || ' on ' || v_item.title,
          'medium',
          '/my-listings');

  -- Outbid bidders → /item/<id> so they land on the bid form
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

-- ─── end_expired_auctions: same body, with link populated ───
create or replace function public.end_expired_auctions()
returns void as $$
declare
  v_item record;
  v_winning_bid record;
begin
  if not pg_try_advisory_xact_lock(42) then
    return;
  end if;

  for v_item in
    select id, seller_id, title
    from public.livestock_items
    where status = 'active' and end_time <= now()
    for update skip locked
    limit 50
  loop
    update public.livestock_items set status = 'ended' where id = v_item.id;

    select * into v_winning_bid
    from public.bids
    where livestock_id = v_item.id
    order by amount desc
    limit 1;

    if found then
      update public.bids set is_winner = false where livestock_id = v_item.id;
      update public.bids set is_winner = true where id = v_winning_bid.id;

      -- Winner → /payments
      insert into public.notifications (user_id, type, title, message, priority, link)
      values (v_winning_bid.user_id, 'auction_won', 'You won!',
              'You won the auction for ' || v_item.title || ' at US$' || v_winning_bid.amount || '. Head to the listing to complete payment.',
              'high',
              '/payments');

      -- Seller → /my-listings
      insert into public.notifications (user_id, type, title, message, priority, link)
      values (v_item.seller_id, 'auction_ending', 'Auction sold!',
              'Your listing ' || v_item.title || ' sold for US$' || v_winning_bid.amount || '.',
              'high',
              '/my-listings');

      -- Losing bidders → /item/<id>
      insert into public.notifications (user_id, type, title, message, priority, link)
      select distinct b.user_id, 'auction_lost', 'Auction ended',
             'The auction for ' || v_item.title || ' has ended. The winning bid was US$' || v_winning_bid.amount || '.',
             'medium',
             '/item/' || v_item.id::text
      from public.bids b
      where b.livestock_id = v_item.id
        and b.user_id != v_winning_bid.user_id;
    else
      insert into public.notifications (user_id, type, title, message, priority, link)
      values (v_item.seller_id, 'auction_ending', 'Auction ended',
              'Your listing ' || v_item.title || ' ended with no bids.',
              'medium',
              '/my-listings');
    end if;
  end loop;
end;
$$ language plpgsql security definer;
