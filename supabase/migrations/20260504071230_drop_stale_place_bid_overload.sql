-- Drop the stale 3-arg place_bid overload left over from before
-- idempotency_key was added. The 4-arg version (with default null on
-- p_idempotency_key) supersedes it for all callers — the frontend
-- always passes 4 args (src/hooks/useBids.ts).
--
-- Without this, the link-aware notification updates only land for the
-- 4-arg overload; any stray 3-arg caller would still fire the old
-- linkless inserts. Removing the duplicate also eliminates Postgres
-- function-resolution ambiguity warnings.

drop function if exists public.place_bid(uuid, uuid, numeric);
