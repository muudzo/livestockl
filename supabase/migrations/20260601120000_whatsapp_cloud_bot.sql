-- ============================================================================
-- WhatsApp Cloud API bot — seller-side lifecycle
-- ============================================================================
-- Replaces the whatsapp-web.js demo bot with an official Meta Cloud API bot
-- (Edge Function `whatsapp-cloud`). The Cloud API supports interactive list
-- messages and image-header button cards, so the seller never types option
-- numbers — they tap rows and buttons.
--
-- Seller lifecycle this powers:
--   list an animal -> get an in-chat push when a bid lands -> accept the top
--   bid (closes the auction in the buyer's favour) -> get an in-chat push when
--   the buyer pays -> trigger delivery.
--
-- Three pieces:
--   1. wa_cloud_sessions / wa_cloud_message_log — per-wa_id state + audit.
--   2. accept_top_bid()  — seller hammers the sale to the current top bidder.
--   3. bids AFTER INSERT trigger — pushes a WhatsApp notify for every new bid,
--      regardless of which channel placed it (web, USSD, bot).
-- ============================================================================

-- ── 1. Session + audit tables (service-role only) ──────────────────────────
-- Keyed by wa_id (the sender's international MSISDN with no '+', e.g.
-- 263771234567) — that IS the seller's identity, so unlike the Messenger bot
-- we never ask for a phone number. No CHECK on `state`: the wa_sessions CHECK
-- constraint drifted out of sync with the code and broke persistence, so we
-- keep the column free-form here.

CREATE TABLE IF NOT EXISTS public.wa_cloud_sessions (
  wa_id text PRIMARY KEY,
  state text NOT NULL DEFAULT 'MENU',
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid REFERENCES public.profiles(id),
  tenant_id uuid REFERENCES public.tenants(id),
  last_inbound_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- last_inbound_at drives the 24h customer-service window: inside it we may send
-- free-form interactive messages; outside it proactive pushes fall back to SMS.
CREATE INDEX IF NOT EXISTS idx_wa_cloud_sessions_last_inbound
  ON public.wa_cloud_sessions (last_inbound_at DESC);

CREATE TABLE IF NOT EXISTS public.wa_cloud_message_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  msg_type text,
  body text,
  payload text,
  state_before text,
  state_after text,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_cloud_message_log_wa_id
  ON public.wa_cloud_message_log (wa_id, created_at DESC);

ALTER TABLE public.wa_cloud_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_cloud_message_log ENABLE ROW LEVEL SECURITY;
-- No policies → only the service-role key (the Edge Function) can touch these.

COMMENT ON TABLE public.wa_cloud_sessions IS
  'Per-wa_id conversation state for the WhatsApp Cloud API seller bot. Service-role only.';
COMMENT ON TABLE public.wa_cloud_message_log IS
  'Audit log of every WhatsApp Cloud API bot message — inbound and outbound. Service-role only.';

-- ── 2. accept_top_bid() — seller closes the auction to the top bidder ───────
-- The platform is an ascending auction, so "accept a bid" means "sell now to
-- whoever is currently highest". Mirrors end_expired_auctions()'s winner +
-- notification logic, but for one lot, on demand, authorised by seller phone.
CREATE OR REPLACE FUNCTION public.accept_top_bid(p_listing_id uuid, p_seller_phone text)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
  AS $$
declare
  v_item        record;
  v_winning_bid record;
begin
  select * into v_item
  from public.livestock_items
  where id = p_listing_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'lot_not_found');
  end if;

  -- Authorise: the calling phone must own this listing.
  if not exists (
    select 1 from public.profiles
    where id = v_item.seller_id and phone = p_seller_phone
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_seller');
  end if;

  if v_item.status != 'active' then
    return jsonb_build_object('ok', false, 'error', 'lot_not_active', 'status', v_item.status);
  end if;

  select * into v_winning_bid
  from public.bids
  where livestock_id = v_item.id
  order by amount desc
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_bids');
  end if;

  update public.livestock_items set status = 'ended' where id = v_item.id;
  update public.bids set is_winner = false where livestock_id = v_item.id;
  update public.bids set is_winner = true where id = v_winning_bid.id;

  insert into public.notifications (user_id, type, title, message, priority, link, tenant_id)
  values (
    v_winning_bid.user_id, 'auction_won', 'You won!',
    'The seller accepted your bid of US$' || v_winning_bid.amount || ' for ' || v_item.title ||
      '. Head to the listing to complete payment.',
    'high', '/payments', v_item.tenant_id
  );

  insert into public.notifications (user_id, type, title, message, priority, link, tenant_id)
  values (
    v_item.seller_id, 'auction_ending', 'Bid accepted',
    'You accepted US$' || v_winning_bid.amount || ' for ' || v_item.title || '. Waiting for the buyer to pay.',
    'high', '/my-listings', v_item.tenant_id
  );

  insert into public.notifications (user_id, type, title, message, priority, link, tenant_id)
  select distinct b.user_id, 'auction_lost', 'Auction ended',
         'The auction for ' || v_item.title || ' has ended. The winning bid was US$' || v_winning_bid.amount || '.',
         'medium', '/item/' || v_item.id::text, v_item.tenant_id
  from public.bids b
  where b.livestock_id = v_item.id
    and b.user_id != v_winning_bid.user_id;

  return jsonb_build_object(
    'ok', true,
    'winner_user_id', v_winning_bid.user_id,
    'amount', v_winning_bid.amount,
    'reference', v_item.reference,
    'title', v_item.title
  );
end;
$$;

ALTER FUNCTION public.accept_top_bid(uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.accept_top_bid(uuid, text) FROM anon, authenticated;
-- Service-role only: the bot authorises the seller via their WhatsApp number.

-- ── 3. Push a WhatsApp notify on every new bid (any channel) ────────────────
-- AFTER INSERT on bids so it covers web place_bid, place_bid_on_behalf, and
-- direct bot inserts alike. Fire-and-forget via pg_net; never blocks the bid.
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_whatsapp_new_bid()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
  AS $$
declare
  v_item   record;
  v_secret text;
begin
  select li.id, li.title, li.reference, li.seller_id, li.is_demo, p.phone as seller_phone
    into v_item
  from public.livestock_items li
  join public.profiles p on p.id = li.seller_id
  where li.id = new.livestock_id;

  -- Skip demo lots and sellers with no phone on file.
  if not found or v_item.is_demo
     or v_item.seller_phone is null or v_item.seller_phone = '' then
    return new;
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'cron_secret' limit 1;

  perform net.http_post(
    url := 'https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/whatsapp-cloud/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(v_secret, '')
    ),
    body := jsonb_build_object(
      'event', 'new_bid',
      'seller_phone', v_item.seller_phone,
      'listing_id', v_item.id,
      'listing_title', v_item.title,
      'reference', v_item.reference,
      'amount', new.amount
    ),
    timeout_milliseconds := 5000
  );

  return new;
exception when others then
  -- A notify failure must never roll back the bid.
  return new;
end;
$$;

ALTER FUNCTION public.notify_whatsapp_new_bid() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_notify_whatsapp_new_bid ON public.bids;
CREATE TRIGGER trg_notify_whatsapp_new_bid
  AFTER INSERT ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.notify_whatsapp_new_bid();
