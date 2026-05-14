-- Panel ask #4 (2026-05-08): sellers register a Paynow merchant ID instead
-- of bank details. Holding seller bank details is a custody and compliance
-- burden we should not own. Storing a Paynow integration / merchant ID lets
-- Paynow handle KYC and payout rails on our behalf, and lets future
-- settlement edge functions pay out via Paynow merchant-transfer.
--
-- Profile gets a single optional text column. Format mirrors Paynow's
-- integration-ID format (digit string, e.g. "23997"). We don't enforce
-- existence on signup — the field is collected on the /account page and
-- soft-guarded at listing-create time so sellers know to fill it in before
-- their first auction settles.

alter table public.profiles
  add column if not exists paynow_merchant_id text;

-- Validate format: empty/null OK (collected later); when set, must be a
-- digit string up to 12 characters. Paynow integration IDs are currently
-- 5 digits, but they grow, so we leave headroom.
alter table public.profiles
  drop constraint if exists profiles_paynow_merchant_id_format;
alter table public.profiles
  add constraint profiles_paynow_merchant_id_format
  check (paynow_merchant_id is null or paynow_merchant_id ~ '^[0-9]{1,12}$');

comment on column public.profiles.paynow_merchant_id is
  'Seller payout target. Paynow merchant / integration ID. When set, future settlement functions pay this seller via Paynow merchant-transfer instead of holding funds ourselves. Required before a seller can take payment on a sold lot.';
