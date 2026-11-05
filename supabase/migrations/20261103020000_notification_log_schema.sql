-- ============================================================================
-- Migration: 20261103020000_notification_log_schema.sql
-- Description:
--   1. Creates public.notification_log table to track delivery of confirmation
--      emails and SMS/WhatsApp messages idempotently.
--   2. Enables Row Level Security (RLS) with OWNER-ONLY READ permissions.
--   3. Absolutely NO client write policies (inserts/updates only through service role).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL DEFAULT 'parking',
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  recipient TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped', 'rate_limited')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by booking reference and channel
CREATE INDEX IF NOT EXISTS idx_notification_log_booking_channel
  ON public.notification_log (booking_id, channel);

CREATE INDEX IF NOT EXISTS idx_notification_log_sent_status
  ON public.notification_log (booking_id, status);

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS)
-- Read-only access for owners of the booking. No client write permissions.
-- ----------------------------------------------------------------------------
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification logs" ON public.notification_log;
CREATE POLICY "Users can view own notification logs"
  ON public.notification_log
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.parking_bookings pb
      WHERE (pb.booking_reference = notification_log.booking_id OR pb.id::TEXT = notification_log.booking_id)
        AND pb.user_id = auth.uid()
    )
  );

