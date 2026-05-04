-- Add status column to agent_bids — already present on live (added by the
-- April 16 demo seed's defensive ALTER) but missing from schema.sql, so
-- a fresh init from schema.sql would break win-detector. This migration
-- documents the column in the migration history and is a no-op on
-- environments that already have it.

alter table public.agent_bids add column if not exists status text default 'placed';
