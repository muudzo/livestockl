-- Allow free-text location on livestock_items.
-- The original CHECK constraint only allowed Zimbabwean cities, blocking
-- international sellers and WhatsApp-originated listings with custom locations.
alter table public.livestock_items
  drop constraint if exists livestock_items_location_check;
