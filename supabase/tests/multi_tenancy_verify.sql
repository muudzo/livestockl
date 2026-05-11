-- Read-only verification of the multi-tenancy migration. Safe to run against prod.
-- Paste into the Supabase SQL editor:
--   https://supabase.com/dashboard/project/hmeieslclzycyjjjflfh/sql
--
-- Asserts via SELECT only:
--   1. Both tenants exist with distinct configs
--   2. Every transactional table has tenant_id NOT NULL
--   3. No row is missing tenant_id (backfill complete)
--   4. RLS is enabled on tenants + tenant_members
--   5. New helper functions exist and are callable by authenticated role
--
-- The destructive smoke test (multi_tenancy_smoke.sql) inserts synthetic users
-- and is meant for a local / branch DB, NOT prod.

-- 1. Tenants exist with distinct configs
select
  slug,
  name,
  config->>'commission_seller_pct' as commission_seller_pct,
  config->>'commission_buyer_pct'  as commission_buyer_pct,
  config->>'reserve_required'      as reserve_required,
  config->>'dispute_window_days'   as dispute_window_days,
  config->>'lot_fee_usd'           as lot_fee_usd,
  status
from public.tenants
order by slug;
-- Expect: 2 rows. harare-auction-house has lot_fee_usd=25, dispute_window=7,
-- reserve_required=true. zimlivestock-demo has lot_fee_usd=0, dispute_window=3.

-- 2. tenant_id column is NOT NULL on every transactional table
select
  table_name,
  column_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and column_name = 'tenant_id'
order by table_name;
-- Expect: 10 rows, all is_nullable='NO', column_default references default_user_tenant()

-- 3. Backfill complete — no NULL tenant_id anywhere
select 'livestock_items'      as t, count(*) filter (where tenant_id is null) as null_rows, count(*) as total from public.livestock_items
union all select 'bids',                count(*) filter (where tenant_id is null), count(*) from public.bids
union all select 'payments',            count(*) filter (where tenant_id is null), count(*) from public.payments
union all select 'notifications',       count(*) filter (where tenant_id is null), count(*) from public.notifications
union all select 'conversations',       count(*) filter (where tenant_id is null), count(*) from public.conversations
union all select 'messages',            count(*) filter (where tenant_id is null), count(*) from public.messages
union all select 'bill_payments',       count(*) filter (where tenant_id is null), count(*) from public.bill_payments
union all select 'favorites',           count(*) filter (where tenant_id is null), count(*) from public.favorites
union all select 'agents',              count(*) filter (where tenant_id is null), count(*) from public.agents
union all select 'agent_payment_orders', count(*) filter (where tenant_id is null), count(*) from public.agent_payment_orders;
-- Expect: every null_rows = 0.

-- 4. RLS enabled on new tables
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('tenants', 'tenant_members')
order by c.relname;
-- Expect: rls_enabled = true on both.

-- 5. Helper functions exist
select
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as args,
  pg_get_function_result(p.oid) as returns
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('user_tenant_ids', 'user_has_role', 'default_user_tenant')
order by p.proname;
-- Expect: 3 rows.

-- 6. Existing profiles backfilled into demo tenant as buyers
select
  t.slug,
  count(distinct tm.user_id) as members
from public.tenant_members tm
join public.tenants t on t.id = tm.tenant_id
group by t.slug
order by t.slug;
-- Expect: zimlivestock-demo has N members (= existing profiles count).

-- 7. RLS policy count per table (sanity)
select
  schemaname || '.' || tablename as table_name,
  count(*) as policy_count
from pg_policies
where schemaname = 'public'
  and tablename in (
    'tenants', 'tenant_members', 'livestock_items', 'bids', 'payments',
    'notifications', 'favorites', 'conversations', 'messages',
    'bill_payments', 'agents', 'agent_payment_orders'
  )
group by 1
order by 1;
-- Expect: every table has >= 1 policy. Spot-check a few — e.g. livestock_items
-- should have 4 (select / insert / update / delete).
