-- Protect PII on public.profiles.
--
-- Problem: the SELECT policy is `using (true)` (profiles are world-readable so
-- the marketplace can show seller name/rating via embedded joins). But the
-- table also holds email, phone, and paynow_merchant_id — meaning any anon or
-- authenticated client could dump every user's PII through the REST API.
--
-- Fix: column-level privileges. The public/marketplace only needs non-PII
-- seller fields (these are the only columns referenced by the
-- `profiles!seller_id(...)` embedded joins). email / phone / paynow_merchant_id
-- become readable only by the owner, via a SECURITY DEFINER RPC.
--
-- RLS row policies are unchanged; this adds a column-grant layer on top.

-- 1) Drop blanket SELECT, then grant only the non-PII columns to API roles.
--    (Column-level GRANT only takes effect once the table-wide grant is gone.)
revoke select on public.profiles from anon;
revoke select on public.profiles from authenticated;

grant select (
  id, first_name, last_name, avatar_url, verified, rating, sales_count, created_at
) on public.profiles to anon, authenticated;

-- 2) Owner-only read of the full row (including PII) via SECURITY DEFINER.
create or replace function public.get_my_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

revoke all on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;
