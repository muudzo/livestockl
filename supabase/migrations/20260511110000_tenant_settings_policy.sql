-- Tenant settings: let operators edit per-tenant auction mechanics from the UI
-- without an SQL editor.
--
-- Policy split: admins can update everything; operators can only update the
-- config JSONB. Non-mutable fields are pinned to their existing values via
-- IS NOT DISTINCT FROM, mirroring the pattern in rls_policies.sql for
-- profiles.verified / rating / sales_count.

drop policy if exists "Admins update tenants" on public.tenants;
drop policy if exists "Operators update tenant config" on public.tenants;

-- Admins: full update
create policy "Admins update tenants"
  on public.tenants for update
  using (public.user_has_role(id, 'admin'))
  with check (public.user_has_role(id, 'admin'));

-- Operators: config-only update. Non-config fields must equal current row.
create policy "Operators update tenant config"
  on public.tenants for update
  using (public.user_has_role(id, 'operator'))
  with check (
    public.user_has_role(id, 'operator')
    and slug   is not distinct from (select slug   from public.tenants where id = tenants.id)
    and name   is not distinct from (select name   from public.tenants where id = tenants.id)
    and status is not distinct from (select status from public.tenants where id = tenants.id)
  );
