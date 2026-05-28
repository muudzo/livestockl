-- Align transport_requests.item_id FK with schema.sql declaration.
-- schema.sql:782 declares `ON DELETE CASCADE` but the table was originally
-- created without the cascade clause, so prod has `NO ACTION`. Surfaced
-- 2026-05-28 when the demo seed's idempotent DELETE on livestock_items
-- was blocked by a stranded transport_requests row.

ALTER TABLE public.transport_requests
  DROP CONSTRAINT IF EXISTS transport_requests_item_id_fkey;

ALTER TABLE public.transport_requests
  ADD CONSTRAINT transport_requests_item_id_fkey
  FOREIGN KEY (item_id)
  REFERENCES public.livestock_items(id)
  ON DELETE CASCADE;
