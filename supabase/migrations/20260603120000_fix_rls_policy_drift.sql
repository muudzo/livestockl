-- Fix verified, exploitable RLS policy drift between the prod schema dump and
-- the intended (rls_policies.sql) policies. Surfaced by the 2026-06-03 audit.
--
-- MUST be applied to prod (`supabase db push`) and validated by the
-- security-agent 11/11 suite before the next launch. Each policy below replaces
-- a permissive/no-op prod policy with the column-locked form that was always
-- intended.
--
-- Pattern note: the prod column-lock WITH CHECKs were no-ops because their
-- subquery self-aliased both sides (`WHERE t_1.id = t_1.id`, always true). The
-- correct form correlates the subquery to the row being checked
-- (`WHERE t.id = <table>.id`), which under MVCC/READ COMMITTED reads the
-- committed OLD value during the UPDATE — the same semantics tenant_immutable_field
-- already relies on. No SECURITY DEFINER helper is needed here because each role
-- can already SELECT its own row (profiles: public; payments/livestock/messages:
-- owner/participant SELECT policies).

begin;

-- ── 1. profiles: lock verified / rating / sales_count (self-verify + fake-rep) ──
-- Prod policy had NO WITH CHECK, letting any user PATCH verified=true (bypassing
-- the verified-bidder auction gate) and inflate rating/sales_count.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and verified    is not distinct from (select pr.verified    from public.profiles pr where pr.id = auth.uid())
    and rating      is not distinct from (select pr.rating      from public.profiles pr where pr.id = auth.uid())
    and sales_count is not distinct from (select pr.sales_count from public.profiles pr where pr.id = auth.uid())
  );

-- ── 2. payments: forbid user-driven status/amount changes (self-mark-paid) ──
-- The only legitimate user update is payments.paynow_reference (the poll URL,
-- usePayments.ts). Everything financially material is pinned to its stored value;
-- real settlement transitions are done by service_role (webhook / poll-sync),
-- which bypasses RLS.
drop policy if exists "Users can update own payment status" on public.payments;
create policy "Users can update own payment metadata" on public.payments
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and status       is not distinct from (select p.status       from public.payments p where p.id = payments.id)
    and amount       is not distinct from (select p.amount       from public.payments p where p.id = payments.id)
    and user_id      is not distinct from (select p.user_id      from public.payments p where p.id = payments.id)
    and livestock_id is not distinct from (select p.livestock_id from public.payments p where p.id = payments.id)
    and reference    is not distinct from (select p.reference    from public.payments p where p.id = payments.id)
    and tenant_id    is not distinct from (select p.tenant_id    from public.payments p where p.id = payments.id)
  );

-- ── 3. livestock_items: drop the duplicate UNGUARDED delete policy ──
-- An unguarded `FOR DELETE USING (auth.uid()=seller_id)` coexisted with the
-- intended bid_count=0 guard; permissive policies OR, so the unguarded one won,
-- letting a seller cascade-delete a bid-on lot (destroying bids/agent_bids/
-- clearance_events/ownership_transitions with no audit trail).
drop policy if exists "Sellers can delete own listings" on public.livestock_items;
-- (leaves "Sellers can delete own listings with no bids" — the guarded policy)

-- ── 4. livestock_items: repair the no-op column-lock on the UPDATE policy ──
-- Pins the anti-tamper columns to their stored values (RPCs that legitimately
-- change them — place_bid, increment_view_count, end_expired_auctions — are
-- SECURITY DEFINER and bypass RLS). Sellers can still edit title/breed/age/
-- weight/description/location/health/image_urls, and starting_price while
-- bid_count=0 (enforced in useUpdateListing).
drop policy if exists "Sellers can update own listings" on public.livestock_items;
create policy "Sellers can update own listings" on public.livestock_items
  for update
  using (auth.uid() = seller_id and tenant_id in (select public.user_tenant_ids()))
  with check (
    auth.uid() = seller_id
    and tenant_id   is not distinct from (select l.tenant_id   from public.livestock_items l where l.id = livestock_items.id)
    and current_bid is not distinct from (select l.current_bid from public.livestock_items l where l.id = livestock_items.id)
    and bid_count   is not distinct from (select l.bid_count   from public.livestock_items l where l.id = livestock_items.id)
    and view_count  is not distinct from (select l.view_count  from public.livestock_items l where l.id = livestock_items.id)
    and status      is not distinct from (select l.status      from public.livestock_items l where l.id = livestock_items.id)
    and end_time    is not distinct from (select l.end_time    from public.livestock_items l where l.id = livestock_items.id)
    and seller_id   is not distinct from (select l.seller_id   from public.livestock_items l where l.id = livestock_items.id)
  );

-- ── 5. messages: repair the no-op content/sender lock on mark-as-read ──
drop policy if exists "Recipient can mark messages as read" on public.messages;
create policy "Recipient can mark messages as read" on public.messages
  for update
  using (
    auth.uid() <> sender_id
    and tenant_id in (select public.user_tenant_ids())
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  )
  with check (
    content   is not distinct from (select m.content   from public.messages m where m.id = messages.id)
    and sender_id is not distinct from (select m.sender_id from public.messages m where m.id = messages.id)
  );

-- ── 6. agents: drop the overly-broad catch-all FOR ALL policy ──
-- `USING (user_id = auth.uid())` with no WITH CHECK and no tenant scope OR'd
-- with (and thus mooted) the explicit per-command tenant-scoped policies, which
-- already cover SELECT/INSERT/UPDATE/DELETE for the owner within their tenant.
drop policy if exists "Users manage own agents" on public.agents;

commit;
