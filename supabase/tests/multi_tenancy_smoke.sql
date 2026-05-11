-- Smoke test for the multi-tenancy migration.
-- Run AFTER 20260511100000_multi_tenancy.sql is applied.
--
-- Usage (Supabase SQL editor or psql against a non-prod DB):
--   \set ON_ERROR_STOP on
--   \i supabase/tests/multi_tenancy_smoke.sql
--
-- Asserts:
--   * Two tenants exist
--   * Demo data backfilled to the demo tenant
--   * Cross-tenant SELECT is blocked by RLS
--   * place_bid() rejects a non-member bidder
--
-- Cleanup at the bottom removes test fixtures.

begin;

-- ============================================================
-- Setup: two test users, one in tenant A, one in tenant B
-- ============================================================

-- Synthetic auth users (skip the auth.users trigger by inserting profiles
-- directly with stable UUIDs we control).
do $$
declare
  v_tenant_a uuid;
  v_tenant_b uuid;
  v_user_a uuid := '11111111-1111-1111-1111-111111111111';
  v_user_b uuid := '22222222-2222-2222-2222-222222222222';
begin
  select id into v_tenant_a from public.tenants where slug = 'zimlivestock-demo';
  select id into v_tenant_b from public.tenants where slug = 'harare-auction-house';

  if v_tenant_a is null or v_tenant_b is null then
    raise exception 'Tenants not seeded — did the migration run?';
  end if;

  -- Synthetic auth users
  insert into auth.users (id, email)
  values
    (v_user_a, 'smoke-a@test.local'),
    (v_user_b, 'smoke-b@test.local')
  on conflict (id) do nothing;

  insert into public.profiles (id, email, first_name, last_name, phone)
  values
    (v_user_a, 'smoke-a@test.local', 'Smoke', 'A', '0770000001'),
    (v_user_b, 'smoke-b@test.local', 'Smoke', 'B', '0770000002')
  on conflict (id) do nothing;

  -- Memberships: A in demo, B in harare
  insert into public.tenant_members (tenant_id, user_id, role)
  values
    (v_tenant_a, v_user_a, 'buyer'),
    (v_tenant_b, v_user_b, 'buyer')
  on conflict do nothing;
end $$;

-- ============================================================
-- Assertion 1: Both tenants exist with distinct configs
-- ============================================================
do $$
declare
  v_count int;
  v_demo_lot_fee numeric;
  v_harare_lot_fee numeric;
begin
  select count(*) into v_count from public.tenants where status = 'active';
  if v_count < 2 then
    raise exception 'Expected >= 2 active tenants, got %', v_count;
  end if;

  select (config->>'lot_fee_usd')::numeric into v_demo_lot_fee
  from public.tenants where slug = 'zimlivestock-demo';
  select (config->>'lot_fee_usd')::numeric into v_harare_lot_fee
  from public.tenants where slug = 'harare-auction-house';

  if v_demo_lot_fee = v_harare_lot_fee then
    raise exception 'Tenants must have distinct configs (lot fee identical: %)', v_demo_lot_fee;
  end if;

  raise notice 'PASS: 2 tenants with distinct configs (demo lot fee=%, harare lot fee=%)',
    v_demo_lot_fee, v_harare_lot_fee;
end $$;

-- ============================================================
-- Assertion 2: All existing listings backfilled to demo tenant
-- ============================================================
do $$
declare
  v_null_tenant_count int;
  v_demo_tenant uuid;
  v_demo_listings int;
begin
  select count(*) into v_null_tenant_count from public.livestock_items where tenant_id is null;
  if v_null_tenant_count > 0 then
    raise exception 'Found % listings with null tenant_id', v_null_tenant_count;
  end if;

  select id into v_demo_tenant from public.tenants where slug = 'zimlivestock-demo';
  select count(*) into v_demo_listings from public.livestock_items where tenant_id = v_demo_tenant;
  raise notice 'PASS: backfill complete, % listings in demo tenant', v_demo_listings;
end $$;

-- ============================================================
-- Assertion 3: Cross-tenant SELECT blocked by RLS
-- ============================================================
-- Create one listing in each tenant, then switch roles and try to read across.
do $$
declare
  v_tenant_a uuid;
  v_tenant_b uuid;
  v_user_a uuid := '11111111-1111-1111-1111-111111111111';
  v_user_b uuid := '22222222-2222-2222-2222-222222222222';
  v_listing_a uuid;
  v_listing_b uuid;
  v_visible_count int;
begin
  select id into v_tenant_a from public.tenants where slug = 'zimlivestock-demo';
  select id into v_tenant_b from public.tenants where slug = 'harare-auction-house';

  -- Tenant A listing (seller = user A)
  insert into public.livestock_items (
    title, category, breed, age, weight, description, location, health,
    starting_price, seller_id, duration_days, end_time, tenant_id
  ) values (
    'SMOKE-A-bull', 'Cattle', 'Brahman', '3', '450', 'smoke test A', 'Harare', 'Good',
    100, v_user_a, 1, now() + interval '1 day', v_tenant_a
  ) returning id into v_listing_a;

  -- Tenant B listing (seller = user B)
  insert into public.livestock_items (
    title, category, breed, age, weight, description, location, health,
    starting_price, seller_id, duration_days, end_time, tenant_id
  ) values (
    'SMOKE-B-bull', 'Cattle', 'Brahman', '3', '450', 'smoke test B', 'Harare', 'Good',
    100, v_user_b, 1, now() + interval '1 day', v_tenant_b
  ) returning id into v_listing_b;

  -- Impersonate user A. set_config(..., true) is local to the transaction.
  -- We swap to the 'authenticated' role so RLS actually evaluates (the
  -- postgres/service role bypasses RLS).
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config('role', 'authenticated', true);

  execute 'set local role authenticated';

  select count(*) into v_visible_count
  from public.livestock_items
  where title like 'SMOKE-%';

  execute 'reset role';

  if v_visible_count != 1 then
    raise exception 'User A should see exactly 1 SMOKE listing (own tenant); saw %', v_visible_count;
  end if;

  raise notice 'PASS: cross-tenant RLS isolation works (user A sees 1, not 2)';

  -- Clean up test listings
  delete from public.livestock_items where id in (v_listing_a, v_listing_b);
end $$;

-- ============================================================
-- Assertion 4: place_bid rejects a non-member bidder
-- ============================================================
do $$
declare
  v_tenant_a uuid;
  v_user_a uuid := '11111111-1111-1111-1111-111111111111';
  v_user_b uuid := '22222222-2222-2222-2222-222222222222';
  v_listing_a uuid;
  v_seller uuid := '33333333-3333-3333-3333-333333333333';
  v_caught_msg text;
begin
  select id into v_tenant_a from public.tenants where slug = 'zimlivestock-demo';

  -- Need a different seller (A is the would-be cross-tenant bidder)
  insert into auth.users (id, email) values (v_seller, 'smoke-seller@test.local') on conflict (id) do nothing;
  insert into public.profiles (id, email, first_name, last_name, phone)
    values (v_seller, 'smoke-seller@test.local', 'Smoke', 'Seller', '0770000003')
    on conflict (id) do nothing;
  insert into public.tenant_members (tenant_id, user_id, role)
    values (v_tenant_a, v_seller, 'seller') on conflict do nothing;

  insert into public.livestock_items (
    title, category, breed, age, weight, description, location, health,
    starting_price, seller_id, duration_days, end_time, tenant_id
  ) values (
    'SMOKE-A-bid-target', 'Cattle', 'Brahman', '3', '450', 'smoke', 'Harare', 'Good',
    100, v_seller, 1, now() + interval '1 day', v_tenant_a
  ) returning id into v_listing_a;

  -- Impersonate user B (NOT a member of tenant A) and try to bid
  perform set_config('request.jwt.claim.sub', v_user_b::text, true);
  perform set_config('role', 'authenticated', true);
  execute 'set local role authenticated';

  begin
    perform public.place_bid(v_listing_a, v_user_b, 200, null);
    execute 'reset role';
    raise exception 'FAIL: place_bid should have rejected cross-tenant bidder';
  exception
    when others then
      v_caught_msg := sqlerrm;
      execute 'reset role';
      if v_caught_msg !~* 'not a member' and v_caught_msg !~* 'unauthorized' then
        raise exception 'FAIL: wrong rejection reason (got "%")', v_caught_msg;
      end if;
      raise notice 'PASS: cross-tenant bid blocked ("%")', v_caught_msg;
  end;

  -- Cleanup
  delete from public.livestock_items where id = v_listing_a;
  delete from public.tenant_members where user_id = v_seller;
  delete from public.profiles where id = v_seller;
  delete from auth.users where id = v_seller;
end $$;

-- ============================================================
-- Cleanup synthetic users
-- ============================================================
do $$
declare
  v_user_a uuid := '11111111-1111-1111-1111-111111111111';
  v_user_b uuid := '22222222-2222-2222-2222-222222222222';
begin
  delete from public.tenant_members where user_id in (v_user_a, v_user_b);
  delete from public.profiles where id in (v_user_a, v_user_b);
  delete from auth.users where id in (v_user_a, v_user_b);
  raise notice 'Cleanup complete.';
end $$;

commit;

select 'All multi-tenancy smoke tests passed.' as result;
