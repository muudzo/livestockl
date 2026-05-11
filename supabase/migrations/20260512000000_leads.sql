-- SaPS discovery pipeline: leads table for /operators/request-access submissions.
-- Anonymous INSERTs are allowed (the form is public). SELECT is locked to
-- service-role / super-admins — leads contain contact info we don't want
-- competitors scraping.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),

  -- Submission payload
  auction_house_name text not null check (char_length(auction_house_name) between 2 and 200),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_phone text not null check (char_length(contact_phone) between 6 and 32),
  contact_email text not null check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  town text check (char_length(town) <= 80),

  lots_per_week text not null check (lots_per_week in (
    'under_50', '50_to_200', '200_plus', 'unsure'
  )),
  current_payment_rail text not null check (current_payment_rail in (
    'cash_only', 'cash_and_eft', 'paynow', 'other_platform', 'mixed'
  )),
  biggest_friction text not null check (char_length(biggest_friction) between 10 and 1200),

  -- Pipeline state
  status text not null default 'new' check (status in (
    'new', 'contacted', 'qualified', 'onboarded', 'dropped'
  )),
  notes text,
  approved_at timestamptz,
  onboard_token uuid unique,
  tenant_id uuid references public.tenants(id),

  -- Submission metadata for spam triage (best-effort, not authoritative)
  user_agent text,
  submitted_via text default 'web_form',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_status_created
  on public.leads(status, created_at desc);
create index if not exists idx_leads_email
  on public.leads(contact_email);

-- updated_at trigger
drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.update_updated_at();

alter table public.leads enable row level security;

-- Anonymous form submission. INSERT only — no SELECT for anon.
drop policy if exists "Anyone can submit a lead" on public.leads;
create policy "Anyone can submit a lead"
  on public.leads for insert
  to anon, authenticated
  with check (
    -- Defensive: even though check constraints catch most of this, RLS adds
    -- a second layer for status spoofing and pipeline-state injection.
    status = 'new'
    and approved_at is null
    and onboard_token is null
    and tenant_id is null
    and notes is null
  );

-- Super-admin SELECT/UPDATE — Slice 3 will wire the admin UI. For now,
-- service-role bypasses RLS and can do everything.
