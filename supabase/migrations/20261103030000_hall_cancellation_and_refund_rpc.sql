-- ============================================================================
-- Migration: 20261103030000_hall_cancellation_and_refund_rpc.sql
-- Description: Adds cancellation and refund tracking columns to convention_bookings,
--              establishes guest capacity check constraints, and provides the
--              SECURITY DEFINER RPC cancel_hall_booking(p_booking_id) with 48h
--              tiered refund rules in Asia/Kolkata timezone.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Add cancellation, refund, and cooling columns to convention_bookings
-- ----------------------------------------------------------------------------
ALTER TABLE public.convention_bookings
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_percent NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS cooling TEXT DEFAULT 'AC';

-- Ensure refund_status has valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'convention_bookings_refund_status_chk'
  ) THEN
    ALTER TABLE public.convention_bookings
      ADD CONSTRAINT convention_bookings_refund_status_chk
      CHECK (refund_status IN ('NONE', 'PENDING', 'PROCESSED', 'NOT_APPLICABLE'));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: Enforce guest count bounds (min 30, max 10,000 for convention halls)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'convention_bookings_guests_bounds_chk'
  ) THEN
    ALTER TABLE public.convention_bookings
      ADD CONSTRAINT convention_bookings_guests_bounds_chk
      CHECK (guests >= 30 AND guests <= 10000) NOT VALID;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 3: SECURITY DEFINER RPC cancel_hall_booking(p_booking_id)
-- Rules:
--   - Caller must be the booking owner or an admin
--   - Cannot cancel if already CANCELLED or COMPLETED
--   - Start timestamp evaluated in Asia/Kolkata (UTC+05:30)
--   - >= 48 hours before start -> 100% refund
--   - < 48 hours before start -> 50% refund
--   - After event start -> 0% refund, cancellation rejected
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_hall_booking(
  p_booking_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_row public.convention_bookings;
  v_event_start TIMESTAMPTZ;
  v_hours_until NUMERIC;
  v_refund_percent NUMERIC(5, 2);
  v_refund_amount NUMERIC(10, 2);
  v_refund_status TEXT;
  v_now TIMESTAMPTZ;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required to cancel a hall reservation.';
  END IF;

  SELECT * INTO v_row
  FROM public.convention_bookings
  WHERE id = p_booking_id
    AND (user_id = v_uid OR public.is_admin())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND: Hall booking % not found or unauthorized.', p_booking_id;
  END IF;

  IF UPPER(v_row.status) = 'CANCELLED' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Booking is already cancelled.';
  END IF;

  IF UPPER(v_row.status) = 'COMPLETED' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Past completed bookings cannot be cancelled.';
  END IF;

  -- Event start timestamp in Asia/Kolkata (+05:30)
  v_event_start := (v_row.date::TEXT || ' ' || v_row.start_time::TEXT || '+05:30')::TIMESTAMPTZ;
  v_now := NOW();
  v_hours_until := EXTRACT(EPOCH FROM (v_event_start - v_now)) / 3600.0;

  IF v_hours_until <= 0 THEN
    RAISE EXCEPTION 'EVENT_STARTED: Cancellation is not available after the event has started.';
  END IF;

  -- >= 48 hours -> 100% refund; < 48 hours -> 50% refund
  IF v_hours_until >= 48.0 THEN
    v_refund_percent := 100.00;
  ELSE
    v_refund_percent := 50.00;
  END IF;

  v_refund_amount := ROUND((COALESCE(v_row.amount_paid, v_row.amount) * v_refund_percent) / 100.00, 2);
  IF v_refund_amount > 0 THEN
    v_refund_status := 'PENDING';
  ELSE
    v_refund_status := 'NOT_APPLICABLE';
  END IF;

  UPDATE public.convention_bookings
  SET status = 'CANCELLED',
      cancelled_at = v_now,
      refund_percent = v_refund_percent,
      refund_amount = v_refund_amount,
      refund_status = v_refund_status,
      updated_at = v_now
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'success', true,
    'booking_type', 'hall',
    'booking_id', v_row.id,
    'status', v_row.status,
    'hours_until_start', ROUND(v_hours_until, 1),
    'refund_percent', v_row.refund_percent,
    'refund_amount', v_row.refund_amount,
    'refund_status', v_row.refund_status,
    'refund_status_text', CASE WHEN v_row.refund_amount > 0 THEN 'Refund pending' ELSE 'No refund due' END,
    'refund_timing_note', 'Refund will be credited to original payment method as per your payment method timeline',
    'cancelled_at', v_row.cancelled_at
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.cancel_hall_booking(TEXT) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- STEP 4: Integrate cancel_hall_booking into unified cancel_booking RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_type TEXT,
  p_booking_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_normalized_type TEXT;
BEGIN
  v_normalized_type := LOWER(TRIM(COALESCE(p_booking_type, 'auto')));

  -- Route by explicit or auto-detected type
  IF v_normalized_type IN ('hall', 'convention', 'convention_hall') OR p_booking_id LIKE 'FRCC-H-%' THEN
    RETURN public.cancel_hall_booking(p_booking_id);
  ELSIF v_normalized_type IN ('stay', 'hotel') OR p_booking_id LIKE 'FRCC-S-%' THEN
    RETURN public.cancel_stay_booking(p_booking_id);
  ELSIF v_normalized_type IN ('table', 'dining') OR p_booking_id LIKE 'FRCC-TAB-%' OR p_booking_id LIKE 'FRCC-T-%' THEN
    RETURN public.cancel_table_booking(p_booking_id);
  ELSIF v_normalized_type IN ('activity', 'activities', 'game') OR p_booking_id LIKE 'FRCC-ACT-%' THEN
    RETURN public.cancel_activity_booking(p_booking_id);
  ELSE
    -- Try matching hall booking first if id starts with FRCC-H
    IF EXISTS (SELECT 1 FROM public.convention_bookings WHERE id = p_booking_id) THEN
      RETURN public.cancel_hall_booking(p_booking_id);
    ELSIF EXISTS (SELECT 1 FROM public.stay_bookings WHERE booking_ref = p_booking_id OR id::TEXT = p_booking_id) THEN
      RETURN public.cancel_stay_booking(p_booking_id);
    ELSIF EXISTS (SELECT 1 FROM public.table_bookings WHERE booking_ref = p_booking_id OR id::TEXT = p_booking_id) THEN
      RETURN public.cancel_table_booking(p_booking_id);
    ELSE
      RETURN public.cancel_activity_booking(p_booking_id);
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_booking(TEXT, TEXT) TO authenticated, service_role;

