-- Slice 4 of the SaPS discovery flow: atomic tenant provisioning.
--
-- provision_tenant() takes the new admin's auth user_id (already created by
-- the edge function via supabase.auth.admin.createUser) plus the wizard
-- payload, and writes the three rows that constitute "tenant exists":
--
--   1. tenants     (the configured deployment)
--   2. tenant_members (the new admin's membership)
--   3. leads       (status='onboarded' + tenant_id back-reference)
--
-- All three live or die together — calling the function and getting a
-- tenant_id back is the signal that provisioning succeeded.

create or replace function public.provision_tenant(
  p_lead_id uuid,
  p_user_id uuid,
  p_slug text,
  p_name text,
  p_config jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_lead record;
begin
  -- Verify lead is in an approvable state and not already provisioned.
  select id, status, onboard_token, approved_at
  into v_lead
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'Lead not found';
  end if;

  if v_lead.status = 'onboarded' then
    raise exception 'Lead is already onboarded';
  end if;

  if v_lead.onboard_token is null then
    raise exception 'Lead has not been approved';
  end if;

  -- Slug uniqueness — surfaces as a clear error rather than a generic
  -- unique-violation that the edge function would have to translate.
  if exists (select 1 from public.tenants where slug = p_slug) then
    raise exception 'Slug % is already taken', p_slug;
  end if;

  -- 1. Create the tenant
  insert into public.tenants (slug, name, config)
  values (p_slug, p_name, p_config)
  returning id into v_tenant_id;

  -- 2. Promote the new auth user to admin of this tenant
  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_tenant_id, p_user_id, 'admin');

  -- 3. Close out the lead
  update public.leads
  set status = 'onboarded',
      tenant_id = v_tenant_id,
      onboard_token = null  -- consume the token so the wizard URL can't replay
  where id = p_lead_id;

  return v_tenant_id;
end;
$$;

-- Only service-role / SECURITY DEFINER callers should reach this; the edge
-- function is the only sanctioned caller. No grants to authenticated/anon —
-- they couldn't call it usefully anyway since they don't know lead_id +
-- user_id pairs without going through the wizard.
revoke all on function public.provision_tenant(uuid, uuid, text, text, jsonb) from public;
