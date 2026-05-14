-- ============================================================================
-- WhatsApp bot — session state for the list-my-animal conversation flow
-- ============================================================================
-- The bot runs as a Node.js process on the Mac mini and uses this table to
-- persist conversation state per WhatsApp phone number. Survives bot
-- restarts so an in-flight listing isn't lost.
--
-- One row per phone number. State machine:
--   idle → awaiting_photo → awaiting_breed → awaiting_weight
--        → awaiting_price → awaiting_confirm → idle
-- Send "cancel" at any point to reset to idle.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wa_sessions (
  phone text PRIMARY KEY,
  state text NOT NULL DEFAULT 'idle' CHECK (state IN (
    'idle',
    'awaiting_photo',
    'awaiting_breed',
    'awaiting_weight',
    'awaiting_price',
    'awaiting_confirm'
  )),
  draft jsonb DEFAULT '{}'::jsonb NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  user_id uuid REFERENCES public.profiles(id),
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_sessions_last_message
  ON public.wa_sessions (last_message_at DESC);

-- Audit log of every inbound and outbound message — same shape as
-- billpay_inbound_log so reconciliation tooling can reuse the pattern.
CREATE TABLE IF NOT EXISTS public.wa_message_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type text NOT NULL CHECK (message_type IN ('text', 'image', 'system')),
  body text,
  media_url text,
  state_before text,
  state_after text,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_message_log_phone
  ON public.wa_message_log (phone, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wa_message_log_created
  ON public.wa_message_log (created_at DESC);

ALTER TABLE public.wa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_message_log ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE policies → only service-role bypass can access.
-- The bot uses the service-role key. No app-side reads.

COMMENT ON TABLE public.wa_sessions IS
  'Per-phone conversation state for the WhatsApp list-my-animal bot. Service-role only.';
COMMENT ON TABLE public.wa_message_log IS
  'Audit log of every WhatsApp bot message — inbound and outbound. Service-role only.';
