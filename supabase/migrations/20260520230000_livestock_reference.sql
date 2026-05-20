-- Add AUCT-XXXX short reference to livestock listings for USSD dial-in lookup

create sequence if not exists public.listing_ref_seq start 1;

alter table public.livestock_items
  add column if not exists reference text unique;

create or replace function public.set_listing_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null then
    new.reference := 'AUCT-' || lpad(nextval('public.listing_ref_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists set_listing_reference_trigger on public.livestock_items;
create trigger set_listing_reference_trigger
  before insert on public.livestock_items
  for each row execute function public.set_listing_reference();

-- Backfill references for existing listings that have none
update public.livestock_items
set reference = 'AUCT-' || lpad(nextval('public.listing_ref_seq')::text, 4, '0')
where reference is null;

create index if not exists idx_livestock_reference on public.livestock_items(reference);
