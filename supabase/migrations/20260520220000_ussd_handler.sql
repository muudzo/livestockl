-- USSD handler support
-- 1. ussd_sessions: lightweight log (Africa's Talking sessionId → last activity)
-- 2. place_bid_on_behalf: service-role RPC that resolves phone → user and places a bid

create table if not exists public.ussd_sessions (
  id            uuid primary key default gen_random_uuid(),
  session_id    text not null unique,        -- Africa's Talking sessionId
  phone         text not null,               -- E.164, e.g. +263771234567
  last_text     text not null default '',    -- last text= value from AT
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.ussd_sessions enable row level security;
-- Service role only — no user-facing RLS needed
create policy "service role full access" on public.ussd_sessions
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- place_bid_on_behalf
-- Called by the USSD handler (service role). Resolves phone → profile,
-- then inserts a bid exactly as place_bid does but without the auth.uid() check.
create or replace function public.place_bid_on_behalf(
  p_livestock_id uuid,
  p_phone        text,
  p_amount       numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid;
  v_item     record;
  v_bid_id   uuid;
begin
  -- Resolve phone to user
  select id into v_user_id
  from public.profiles
  where phone = p_phone
  limit 1;

  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'phone_not_registered');
  end if;

  -- Lock the item row
  select * into v_item
  from public.livestock_items
  where id = p_livestock_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'lot_not_found');
  end if;

  if v_item.status != 'active' then
    return jsonb_build_object('ok', false, 'error', 'lot_not_active');
  end if;

  if v_item.end_time <= now() then
    update public.livestock_items set status = 'ended' where id = p_livestock_id;
    return jsonb_build_object('ok', false, 'error', 'auction_ended');
  end if;

  if v_item.seller_id = v_user_id then
    return jsonb_build_object('ok', false, 'error', 'cannot_bid_own_lot');
  end if;

  if p_amount <= v_item.current_bid then
    return jsonb_build_object('ok', false, 'error', 'bid_too_low',
                              'current_bid', v_item.current_bid);
  end if;

  if p_amount < v_item.starting_price then
    return jsonb_build_object('ok', false, 'error', 'below_starting_price',
                              'starting_price', v_item.starting_price);
  end if;

  -- Insert bid
  insert into public.bids (livestock_id, user_id, amount)
  values (p_livestock_id, v_user_id, p_amount)
  returning id into v_bid_id;

  -- Update lot atomically
  update public.livestock_items
  set current_bid = p_amount,
      bid_count   = bid_count + 1
  where id = p_livestock_id;

  -- Notify seller
  insert into public.notifications (user_id, type, title, message, priority, link)
  values (v_item.seller_id, 'bid', 'New bid on your listing',
          'USSD bid of US$' || p_amount || ' on ' || v_item.title,
          'medium', '/my-listings');

  return jsonb_build_object('ok', true, 'bid_id', v_bid_id, 'amount', p_amount);
end;
$$;

-- Only callable by service role
revoke execute on function public.place_bid_on_behalf(uuid, text, numeric) from public, anon, authenticated;
grant  execute on function public.place_bid_on_behalf(uuid, text, numeric) to service_role;
