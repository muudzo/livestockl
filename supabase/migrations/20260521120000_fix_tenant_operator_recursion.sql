-- Fix infinite RLS recursion in "Operators update tenant config".
--
-- The original policy referenced `(select slug from public.tenants where id = tenants.id)`
-- which re-triggers RLS on the same table and recurses forever, breaking every
-- tenant UPDATE (including admin saves from TenantSettings.tsx).
--
-- Replace the subquery with a SECURITY DEFINER helper that fetches the
-- immutable fields without going through RLS.

drop policy if exists "Operators update tenant config" on public.tenants;

create or replace function public.tenant_immutable_field(p_id uuid, p_field text)
returns text
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select case p_field
    when 'slug'   then slug
    when 'name'   then name
    when 'status' then status
    else null
  end
  from public.tenants
  where id = p_id;
$$;

revoke all on function public.tenant_immutable_field(uuid, text) from public;
grant execute on function public.tenant_immutable_field(uuid, text) to authenticated;

create policy "Operators update tenant config"
  on public.tenants for update
  using (public.user_has_role(id, 'operator'))
  with check (
    public.user_has_role(id, 'operator')
    and slug   is not distinct from public.tenant_immutable_field(id, 'slug')
    and name   is not distinct from public.tenant_immutable_field(id, 'name')
    and status is not distinct from public.tenant_immutable_field(id, 'status')
  );
