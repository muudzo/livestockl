-- Multi-tenancy foundation: tenants + tenant_members, tenant_id on transactional tables,
-- RLS rewritten for tenant isolation, place_bid enforces same-tenant membership.
--
-- Pivot context: ZimLivestock moves from single-tenant marketplace to SaPS
-- (Software as a Professional Service) where each auction house / cooperative
-- / processor is a tenant with its own configured deployment.
--
-- N:N membership (a user can be a buyer at one auction house and an operator
-- at another). Path-based tenant resolution at the URL layer (/t/<slug>/...) —
-- frontend wiring lands in a follow-up.

-- ============================================================
-- 1. Core tenancy tables
-- ============================================================

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]+$' and char_length(slug) between 2 and 64),
  name text not null,
  -- Per-tenant auction mechanics. Set from the discovery interview at onboarding.
  -- Shape mirrors panel-ask #3 (8 May demo): commission split, reserve handling,
  -- dispute window, lot fees, anti-shill rules. Stored as JSONB so a tenant
  -- operator can adjust without a schema change.
  config jsonb not null default jsonb_build_object(
    'commission_seller_pct', 5,
    'commission_buyer_pct',  7,
    'reserve_required',      false,
    'dispute_window_days',   3,
    'lot_fee_usd',           0,
    'anti_shill_window_seconds', 5,
    'default_currency',      'USD'
  ),
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'operator', 'seller', 'buyer')),
  joined_at timestamptz not null default now(),
  primary key (tenant_id, user_id, role)
);

create index if not exists idx_tenant_members_user on public.tenant_members(user_id);
create index if not exists idx_tenant_members_tenant on public.tenant_members(tenant_id);

-- ============================================================
-- 2. Helper functions used by RLS policies
-- ============================================================

-- security definer so RLS on tenant_members doesn't recursively block the lookup
create or replace function public.user_tenant_ids(p_user uuid default auth.uid())
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct tenant_id from public.tenant_members where user_id = p_user;
$$;

create or replace function public.user_has_role(p_tenant uuid, p_role text, p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.tenant_members
    where tenant_id = p_tenant and user_id = p_user and role = p_role
  );
$$;

grant execute on function public.user_tenant_ids(uuid) to authenticated;
grant execute on function public.user_has_role(uuid, text, uuid) to authenticated;

-- Column-default resolver: returns the user's first tenant membership so existing
-- frontend inserts (which predate the tenant column) continue to work without
-- being aware of tenancy. Once the URL-path tenant resolver lands in the frontend,
-- inserts should pass tenant_id explicitly and this default becomes a safety net.
-- Returns NULL for service-role callers (auth.uid() is null) — service-role code
-- must pass tenant_id explicitly. NULL hits the NOT NULL constraint by design.
create or replace function public.default_user_tenant()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.tenant_members
  where user_id = auth.uid()
  order by joined_at asc
  limit 1;
$$;

grant execute on function public.default_user_tenant() to authenticated;

-- ============================================================
-- 3. Seed tenants (demo + first real customer)
-- ============================================================

insert into public.tenants (slug, name, config)
values (
  'zimlivestock-demo',
  'ZimLivestock Demo',
  jsonb_build_object(
    'commission_seller_pct', 5,
    'commission_buyer_pct',  7,
    'reserve_required',      false,
    'dispute_window_days',   3,
    'lot_fee_usd',           0,
    'anti_shill_window_seconds', 5,
    'default_currency',      'USD'
  )
) on conflict (slug) do nothing;

-- Second tenant illustrates how config differs per auction house. Numbers come
-- from the auction-field-visit-2026-03-19 research doc.
insert into public.tenants (slug, name, config)
values (
  'harare-auction-house',
  'Harare Auction House',
  jsonb_build_object(
    'commission_seller_pct', 5,
    'commission_buyer_pct',  7,
    'reserve_required',      true,
    'dispute_window_days',   7,
    'lot_fee_usd',           25,
    'anti_shill_window_seconds', 10,
    'default_currency',      'USD'
  )
) on conflict (slug) do nothing;

-- ============================================================
-- 4. Backfill tenant_id on transactional tables, then enforce NOT NULL
-- ============================================================

do $$
declare
  v_default uuid;
begin
  select id into v_default from public.tenants where slug = 'zimlivestock-demo';

  -- livestock_items
  alter table public.livestock_items add column if not exists tenant_id uuid references public.tenants(id);
  update public.livestock_items set tenant_id = v_default where tenant_id is null;
  alter table public.livestock_items alter column tenant_id set not null;

  -- bids
  alter table public.bids add column if not exists tenant_id uuid references public.tenants(id);
  update public.bids set tenant_id = v_default where tenant_id is null;
  alter table public.bids alter column tenant_id set not null;

  -- payments
  alter table public.payments add column if not exists tenant_id uuid references public.tenants(id);
  update public.payments set tenant_id = v_default where tenant_id is null;
  alter table public.payments alter column tenant_id set not null;

  -- notifications
  alter table public.notifications add column if not exists tenant_id uuid references public.tenants(id);
  update public.notifications set tenant_id = v_default where tenant_id is null;
  alter table public.notifications alter column tenant_id set not null;

  -- conversations
  alter table public.conversations add column if not exists tenant_id uuid references public.tenants(id);
  update public.conversations set tenant_id = v_default where tenant_id is null;
  alter table public.conversations alter column tenant_id set not null;

  -- messages
  alter table public.messages add column if not exists tenant_id uuid references public.tenants(id);
  update public.messages set tenant_id = v_default where tenant_id is null;
  alter table public.messages alter column tenant_id set not null;

  -- bill_payments
  alter table public.bill_payments add column if not exists tenant_id uuid references public.tenants(id);
  update public.bill_payments set tenant_id = v_default where tenant_id is null;
  alter table public.bill_payments alter column tenant_id set not null;

  -- favorites
  alter table public.favorites add column if not exists tenant_id uuid references public.tenants(id);
  update public.favorites set tenant_id = v_default where tenant_id is null;
  alter table public.favorites alter column tenant_id set not null;

  -- agents
  alter table public.agents add column if not exists tenant_id uuid references public.tenants(id);
  update public.agents set tenant_id = v_default where tenant_id is null;
  alter table public.agents alter column tenant_id set not null;

  -- agent_payment_orders
  alter table public.agent_payment_orders add column if not exists tenant_id uuid references public.tenants(id);
  update public.agent_payment_orders set tenant_id = v_default where tenant_id is null;
  alter table public.agent_payment_orders alter column tenant_id set not null;

  -- Backfill: every existing profile becomes a buyer in the demo tenant so
  -- nothing in the running app suddenly loses access on migrate.
  insert into public.tenant_members (tenant_id, user_id, role)
  select v_default, id, 'buyer'
  from public.profiles
  on conflict do nothing;
end $$;

create index if not exists idx_livestock_tenant         on public.livestock_items(tenant_id);
create index if not exists idx_bids_tenant              on public.bids(tenant_id);
create index if not exists idx_payments_tenant          on public.payments(tenant_id);
create index if not exists idx_notifications_tenant    on public.notifications(tenant_id);
create index if not exists idx_conversations_tenant    on public.conversations(tenant_id);
create index if not exists idx_messages_tenant          on public.messages(tenant_id);
create index if not exists idx_bill_payments_tenant    on public.bill_payments(tenant_id);
create index if not exists idx_favorites_tenant         on public.favorites(tenant_id);
create index if not exists idx_agents_tenant            on public.agents(tenant_id);
create index if not exists idx_agent_pay_orders_tenant on public.agent_payment_orders(tenant_id);

-- Attach the default resolver to every scoped table. Authenticated inserts
-- that omit tenant_id will inherit the user's primary tenant.
alter table public.livestock_items       alter column tenant_id set default public.default_user_tenant();
alter table public.bids                  alter column tenant_id set default public.default_user_tenant();
alter table public.payments              alter column tenant_id set default public.default_user_tenant();
alter table public.notifications         alter column tenant_id set default public.default_user_tenant();
alter table public.conversations         alter column tenant_id set default public.default_user_tenant();
alter table public.messages              alter column tenant_id set default public.default_user_tenant();
alter table public.bill_payments         alter column tenant_id set default public.default_user_tenant();
alter table public.favorites             alter column tenant_id set default public.default_user_tenant();
alter table public.agents                alter column tenant_id set default public.default_user_tenant();
alter table public.agent_payment_orders alter column tenant_id set default public.default_user_tenant();

-- ============================================================
-- 5. Auto-add new signups to the demo tenant as buyers
-- ============================================================
-- Production deployments will swap this for a tenant resolver that uses the
-- signup URL's /t/<slug> or an invite token.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_default_tenant uuid;
begin
  insert into public.profiles (id, email, first_name, last_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  );

  select id into v_default_tenant from public.tenants where slug = 'zimlivestock-demo';
  if v_default_tenant is not null then
    insert into public.tenant_members (tenant_id, user_id, role)
    values (v_default_tenant, new.id, 'buyer')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- ============================================================
-- 6. RLS — enable on new tables and rewrite for tenant isolation
-- ============================================================

alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;

drop policy if exists "Tenants viewable by members" on public.tenants;
create policy "Tenants viewable by members"
  on public.tenants for select
  using (id in (select public.user_tenant_ids()));

drop policy if exists "Members can view their memberships" on public.tenant_members;
create policy "Members can view their memberships"
  on public.tenant_members for select
  using (user_id = auth.uid() or tenant_id in (select public.user_tenant_ids()));

-- Tenant admins can manage memberships in their tenant
drop policy if exists "Admins manage memberships" on public.tenant_members;
create policy "Admins manage memberships"
  on public.tenant_members for all
  using (public.user_has_role(tenant_id, 'admin'))
  with check (public.user_has_role(tenant_id, 'admin'));

-- ---- livestock_items ----
drop policy if exists "Listings are viewable by everyone" on public.livestock_items;
drop policy if exists "Authenticated users can create listings" on public.livestock_items;
drop policy if exists "Sellers can update own listings" on public.livestock_items;
drop policy if exists "Sellers can delete own listings with no bids" on public.livestock_items;

create policy "Listings viewable to tenant members"
  on public.livestock_items for select
  using (tenant_id in (select public.user_tenant_ids()));

create policy "Tenant members can create listings"
  on public.livestock_items for insert
  with check (
    auth.uid() = seller_id
    and tenant_id in (select public.user_tenant_ids())
  );

create policy "Sellers can update own listings"
  on public.livestock_items for update
  using (auth.uid() = seller_id and tenant_id in (select public.user_tenant_ids()))
  with check (
    current_bid is not distinct from (select current_bid from public.livestock_items where id = livestock_items.id)
    and bid_count is not distinct from (select bid_count from public.livestock_items where id = livestock_items.id)
    and view_count is not distinct from (select view_count from public.livestock_items where id = livestock_items.id)
    and status is not distinct from (select status from public.livestock_items where id = livestock_items.id)
    and end_time is not distinct from (select end_time from public.livestock_items where id = livestock_items.id)
    and seller_id is not distinct from (select seller_id from public.livestock_items where id = livestock_items.id)
    and tenant_id is not distinct from (select tenant_id from public.livestock_items where id = livestock_items.id)
  );

create policy "Sellers can delete own listings with no bids"
  on public.livestock_items for delete
  using (auth.uid() = seller_id and bid_count = 0 and status = 'active'
         and tenant_id in (select public.user_tenant_ids()));

-- ---- bids ----
drop policy if exists "Bids are viewable by everyone" on public.bids;
create policy "Bids viewable to tenant members"
  on public.bids for select
  using (tenant_id in (select public.user_tenant_ids()));
-- INSERTs continue to go exclusively through place_bid() RPC.

-- ---- payments ----
drop policy if exists "Users can view own payments" on public.payments;
drop policy if exists "Authenticated users can create payments" on public.payments;

create policy "Users view own payments in their tenants"
  on public.payments for select
  using (auth.uid() = user_id and tenant_id in (select public.user_tenant_ids()));

create policy "Users create payments in their tenants"
  on public.payments for insert
  with check (auth.uid() = user_id and tenant_id in (select public.user_tenant_ids()));

-- ---- notifications ----
drop policy if exists "Users can view own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Users can create own notifications" on public.notifications;
drop policy if exists "Users can delete own notifications" on public.notifications;

create policy "Users view own notifications in their tenants"
  on public.notifications for select
  using (auth.uid() = user_id and tenant_id in (select public.user_tenant_ids()));

create policy "Users update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id and tenant_id in (select public.user_tenant_ids()));

create policy "Users create own notifications"
  on public.notifications for insert
  with check (auth.uid() = user_id and tenant_id in (select public.user_tenant_ids()));

create policy "Users delete own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id and tenant_id in (select public.user_tenant_ids()));

-- ---- favorites ----
drop policy if exists "Users can view own favorites" on public.favorites;
drop policy if exists "Users can insert own favorites" on public.favorites;
drop policy if exists "Users can delete own favorites" on public.favorites;

create policy "Users view own favorites in their tenants"
  on public.favorites for select
  using (auth.uid() = user_id and tenant_id in (select public.user_tenant_ids()));

create policy "Users insert own favorites in their tenants"
  on public.favorites for insert
  with check (auth.uid() = user_id and tenant_id in (select public.user_tenant_ids()));

create policy "Users delete own favorites in their tenants"
  on public.favorites for delete
  using (auth.uid() = user_id and tenant_id in (select public.user_tenant_ids()));

-- ---- conversations ----
drop policy if exists "Users can view own conversations" on public.conversations;
drop policy if exists "Users can create conversations they are part of" on public.conversations;
drop policy if exists "Users can update own conversations" on public.conversations;

create policy "Conversations viewable to participants in their tenants"
  on public.conversations for select
  using (
    (auth.uid() = participant_1 or auth.uid() = participant_2)
    and tenant_id in (select public.user_tenant_ids())
  );

create policy "Users create conversations they are part of in their tenants"
  on public.conversations for insert
  with check (
    auth.uid() = participant_1
    and tenant_id in (select public.user_tenant_ids())
  );

create policy "Conversation participants can update in their tenants"
  on public.conversations for update
  using (
    (auth.uid() = participant_1 or auth.uid() = participant_2)
    and tenant_id in (select public.user_tenant_ids())
  );

-- ---- messages ----
drop policy if exists "Users can view messages in own conversations" on public.messages;
drop policy if exists "Users can insert messages in own conversations" on public.messages;
drop policy if exists "Sender can update own messages" on public.messages;
drop policy if exists "Recipient can mark messages as read" on public.messages;

create policy "Messages viewable to conversation participants in tenant"
  on public.messages for select
  using (
    tenant_id in (select public.user_tenant_ids())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

create policy "Messages insertable by participants in tenant"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and tenant_id in (select public.user_tenant_ids())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

create policy "Sender can update own messages"
  on public.messages for update
  using (auth.uid() = sender_id and tenant_id in (select public.user_tenant_ids()))
  with check (auth.uid() = sender_id);

create policy "Recipient can mark messages as read"
  on public.messages for update
  using (
    auth.uid() != sender_id
    and tenant_id in (select public.user_tenant_ids())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  )
  with check (
    content is not distinct from (select content from public.messages where id = messages.id)
    and sender_id is not distinct from (select sender_id from public.messages where id = messages.id)
  );

-- ---- bill_payments ----
drop policy if exists "Users can view own bill payments" on public.bill_payments;
drop policy if exists "Users can insert own bill payments" on public.bill_payments;

create policy "Users view own bill payments in their tenants"
  on public.bill_payments for select
  using (auth.uid() = user_id and tenant_id in (select public.user_tenant_ids()));

create policy "Users insert own bill payments in their tenants"
  on public.bill_payments for insert
  with check (auth.uid() = user_id and tenant_id in (select public.user_tenant_ids()));

-- ---- agents ----
drop policy if exists "Users can view own agents" on public.agents;
drop policy if exists "Users can create own agents" on public.agents;
drop policy if exists "Users can update own agents" on public.agents;
drop policy if exists "Users can delete own agents" on public.agents;

create policy "Users view own agents in their tenants"
  on public.agents for select
  using (auth.uid() = user_id and tenant_id in (select public.user_tenant_ids()));

create policy "Users create own agents in their tenants"
  on public.agents for insert
  with check (auth.uid() = user_id and tenant_id in (select public.user_tenant_ids()));

create policy "Users update own agents in their tenants"
  on public.agents for update
  using (auth.uid() = user_id and tenant_id in (select public.user_tenant_ids()));

create policy "Users delete own agents in their tenants"
  on public.agents for delete
  using (auth.uid() = user_id and tenant_id in (select public.user_tenant_ids()));

-- ---- agent_payment_orders ----
drop policy if exists "Users can view own agent payment orders" on public.agent_payment_orders;
create policy "Users view own agent payment orders in their tenants"
  on public.agent_payment_orders for select
  using (auth.uid() = user_id and tenant_id in (select public.user_tenant_ids()));

-- ============================================================
-- 7. place_bid: enforce same-tenant membership + stamp tenant_id on bid
-- ============================================================

create or replace function public.place_bid(
  p_livestock_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_idempotency_key uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_bid_id uuid;
  v_prev_bidder record;
  v_existing_bid_id uuid;
begin
  if p_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  if p_idempotency_key is not null then
    select id into v_existing_bid_id
    from public.bids
    where user_id = p_user_id and idempotency_key = p_idempotency_key
    limit 1;
    if v_existing_bid_id is not null then
      return v_existing_bid_id;
    end if;
  end if;

  select * into v_item
  from public.livestock_items
  where id = p_livestock_id
  for update;

  if not found then
    raise exception 'Listing not found';
  end if;

  -- Tenant membership: bidder must belong to the listing's tenant
  if not exists (
    select 1 from public.tenant_members
    where tenant_id = v_item.tenant_id and user_id = p_user_id
  ) then
    raise exception 'Not a member of this auction';
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

  insert into public.bids (livestock_id, user_id, amount, idempotency_key, tenant_id)
  values (p_livestock_id, p_user_id, p_amount, p_idempotency_key, v_item.tenant_id)
  returning id into v_bid_id;

  update public.livestock_items
  set current_bid = p_amount,
      bid_count = bid_count + 1
  where id = p_livestock_id;

  insert into public.notifications (user_id, type, title, message, priority, link, tenant_id)
  values (
    v_item.seller_id, 'bid', 'New bid on your listing',
    'Someone bid US$' || p_amount || ' on ' || v_item.title,
    'medium', '/my-listings', v_item.tenant_id
  );

  for v_prev_bidder in
    select distinct on (user_id) user_id
    from public.bids
    where livestock_id = p_livestock_id
      and user_id != p_user_id
      and id != v_bid_id
  loop
    insert into public.notifications (user_id, type, title, message, priority, link, tenant_id)
    values (
      v_prev_bidder.user_id, 'bid', 'You''ve been outbid!',
      'A new bid of US$' || p_amount || ' was placed on ' || v_item.title || '. Place a higher bid to stay in the race!',
      'high', '/item/' || p_livestock_id::text, v_item.tenant_id
    );
  end loop;

  return v_bid_id;
end;
$$;

grant execute on function public.place_bid(uuid, uuid, numeric, uuid) to authenticated;

-- ============================================================
-- 8. end_expired_auctions: stamp tenant_id on the notifications it creates
-- ============================================================

create or replace function public.end_expired_auctions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_winning_bid record;
begin
  if not pg_try_advisory_xact_lock(42) then
    return;
  end if;

  for v_item in
    select id, seller_id, title, tenant_id
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

      insert into public.notifications (user_id, type, title, message, priority, link, tenant_id)
      values (
        v_winning_bid.user_id, 'auction_won', 'You won!',
        'You won the auction for ' || v_item.title || ' at US$' || v_winning_bid.amount || '. Head to the listing to complete payment.',
        'high', '/payments', v_item.tenant_id
      );

      insert into public.notifications (user_id, type, title, message, priority, link, tenant_id)
      values (
        v_item.seller_id, 'auction_ending', 'Auction sold!',
        'Your listing ' || v_item.title || ' sold for US$' || v_winning_bid.amount || '.',
        'high', '/my-listings', v_item.tenant_id
      );

      insert into public.notifications (user_id, type, title, message, priority, link, tenant_id)
      select distinct b.user_id, 'auction_lost', 'Auction ended',
             'The auction for ' || v_item.title || ' has ended. The winning bid was US$' || v_winning_bid.amount || '.',
             'medium', '/item/' || v_item.id::text, v_item.tenant_id
      from public.bids b
      where b.livestock_id = v_item.id
        and b.user_id != v_winning_bid.user_id;
    else
      insert into public.notifications (user_id, type, title, message, priority, link, tenant_id)
      values (
        v_item.seller_id, 'auction_ending', 'Auction ended',
        'Your listing ' || v_item.title || ' ended with no bids.',
        'medium', '/my-listings', v_item.tenant_id
      );
    end if;
  end loop;
end;
$$;
