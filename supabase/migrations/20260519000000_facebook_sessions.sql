-- ============================================================================
-- Facebook Messenger bot — session state and message audit log
-- ============================================================================
-- One row per PSID (page-scoped user ID). State machine:
--   MENU → BROWSE_TYPE → BROWSE_RESULTS → DETAIL
--   MENU → SELL_CATEGORY → SELL_BREED → SELL_LOCATION
--        → SELL_PRICE → SELL_PHONE → SELL_CONFIRM → MENU
-- Send "menu" at any point to reset to MENU.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fb_sessions (
  psid text PRIMARY KEY,
  state text NOT NULL DEFAULT 'MENU',
  draft jsonb DEFAULT '{}'::jsonb NOT NULL,
  user_id uuid REFERENCES public.profiles(id),
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fb_sessions_last_message
  ON public.fb_sessions (last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.fb_message_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  psid text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type text NOT NULL CHECK (message_type IN ('text', 'postback', 'quick_reply', 'template', 'system')),
  body text,
  payload text,
  state_before text,
  state_after text,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fb_message_log_psid
  ON public.fb_message_log (psid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fb_message_log_created
  ON public.fb_message_log (created_at DESC);

ALTER TABLE public.fb_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fb_message_log ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE policies → service-role only (same pattern as wa_sessions).

COMMENT ON TABLE public.fb_sessions IS
  'Per-PSID conversation state for the Facebook Messenger bot. Service-role only.';
COMMENT ON TABLE public.fb_message_log IS
  'Audit log of every Facebook bot message — inbound and outbound. Service-role only.';
