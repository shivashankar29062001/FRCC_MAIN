-- ============================================================================
-- Migration: 20261103040000_stay_cancellation_policy_rpc.sql
-- Description: Adds cancellation, refund, and retention columns to stay_bookings,
--              and provides the SECURITY DEFINER RPC cancel_stay_booking(p_booking_id)
--              implementing the 24h tiered Stay Cancellation Policy in Asia/Kolkata:
--                - Free cancellation up to 24 hours before check-in (100% refund)
--                - Late cancellation (< 24 hours until checkout): 1-night charge
--                - No-show (after checkout): Non-refundable (cancellation rejected)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Add cancellation, refund, and retention columns to stay_bookings
-- ----------------------------------------------------------------------------
ALTER TABLE public.stay_bookings
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_percent NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retention_amount NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'NONE';

-- Ensure refund_status has valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stay_bookings_refund_status_chk'
  ) THEN
    ALTER TABLE public.stay_bookings
      ADD CONSTRAINT stay_bookings_refund_status_chk
      CHECK (refund_status IN ('NONE', 'PENDING', 'PROCESSED', 'NOT_APPLICABLE'));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: SECURITY DEFINER RPC cancel_stay_booking(p_booking_id)
-- Rules:
--   - Caller must be the booking owner or an admin
--   - Cannot cancel if already CANCELLED or COMPLETED
--   - Check-in time evaluated as 12:00 PM IST (UTC+05:30)
--   - Check-out time evaluated as 11:00 AM IST (UTC+05:30)
--   - >= 24 hours before check-in -> 100% refund, 0 retention
--   - < 24 hours before check-in until checkout -> Late cancellation (1-night charge retained, rest refunded)
--   - After check-out -> No-show: cancellation rejected / non-refundable
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_stay_booking(
  p_booking_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_row public.stay_bookings;
  v_check_in_dt TIMESTAMPTZ;
  v_check_out_dt TIMESTAMPTZ;
  v_hours_until NUMERIC;
  v_one_night NUMERIC(10, 2);
  v_retention_amount NUMERIC(10, 2);
  v_refund_percent NUMERIC(5, 2);
  v_refund_amount NUMERIC(10, 2);
  v_refund_status TEXT;
  v_now TIMESTAMPTZ;
  v_is_late BOOLEAN := false;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required to cancel a stay reservation.';
  END IF;

  SELECT * INTO v_row
  FROM public.stay_bookings
  WHERE (booking_ref = p_booking_id OR id::TEXT = p_booking_id)
    AND (user_id = v_uid OR public.is_admin())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND: Stay booking % not found or unauthorized.', p_booking_id;
  END IF;

  IF LOWER(v_row.status) = 'cancelled' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Booking is already cancelled.';
  END IF;

  IF LOWER(v_row.status) = 'completed' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Past completed stays cannot be cancelled.';
  END IF;

  -- Asia/Kolkata (+05:30) check-in (12:00 PM) and check-out (11:00 AM)
  v_check_in_dt := (v_row.check_in::TEXT || ' 12:00:00+05:30')::TIMESTAMPTZ;
  v_check_out_dt := (v_row.check_out::TEXT || ' 11:00:00+05:30')::TIMESTAMPTZ;
  v_now := NOW();
  v_hours_until := EXTRACT(EPOCH FROM (v_check_in_dt - v_now)) / 3600.0;

  -- If checkout time has passed, reservation is completed / no-show
  IF v_now > v_check_out_dt THEN
    RAISE EXCEPTION 'EVENT_COMPLETED: Check-out date has passed; no-show bookings are non-refundable.';
  END IF;

  -- 1. Free cancellation up to 24 hours before check-in (100% refund)
  IF v_hours_until >= 24.0 THEN
    v_is_late := false;
    v_retention_amount := 0.00;
    v_refund_percent := 100.00;
    v_refund_amount := v_row.total;
    IF v_refund_amount > 0 THEN
      v_refund_status := 'PENDING';
    ELSE
      v_refund_status := 'NONE';
    END IF;
  ELSE
    -- 2. Late cancellation (< 24 hours before check-in or during check-in day before checkout): 1-night charge
    v_is_late := true;
    v_one_night := COALESCE(v_row.price_per_night, ROUND(v_row.total / GREATEST(1, v_row.nights)));
    v_retention_amount := LEAST(v_row.total::NUMERIC, (v_one_night * GREATEST(1, COALESCE(v_row.rooms, 1))));
    v_refund_amount := GREATEST(0.00, v_row.total - v_retention_amount);
    IF v_row.total > 0 THEN
      v_refund_percent := ROUND((v_refund_amount * 100.0) / v_row.total, 2);
    ELSE
      v_refund_percent := 0.00;
    END IF;

    IF v_refund_amount > 0 THEN
      v_refund_status := 'PENDING';
    ELSE
      v_refund_status := 'NOT_APPLICABLE';
    END IF;
  END IF;

  UPDATE public.stay_bookings
  SET status = 'cancelled',
      cancelled_at = v_now,
      refund_percent = v_refund_percent,
      refund_amount = v_refund_amount,
      retention_amount = v_retention_amount,
      refund_status = v_refund_status,
      updated_at = v_now
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'success', true,
    'booking_type', 'stay',
    'booking_id', COALESCE(v_row.booking_ref, v_row.id::TEXT),
    'status', v_row.status,
    'is_late_cancellation', v_is_late,
    'hours_until_checkin', ROUND(v_hours_until, 1),
    'refund_percent', v_row.refund_percent,
    'refund_amount', v_row.refund_amount,
    'retention_amount', v_row.retention_amount,
    'refund_status', v_row.refund_status,
    'policy_text', 'Free cancellation up to 24 hours before check-in. Late cancellation: 1-night charge. No-show: Non-refundable.',
    'refund_status_text', CASE
      WHEN v_row.refund_amount > 0 THEN 'Refund pending'
      WHEN v_is_late THEN 'No refund due (1-night charge applied)'
      ELSE 'Full refund'
    END,
    'refund_timing_note', 'Refund will be credited to original payment method as per your payment method timeline',
    'cancelled_at', v_row.cancelled_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_stay_booking(TEXT) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- STEP 3: Ensure unified cancel_booking routes stay cancellations
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

  IF v_normalized_type IN ('stay', 'hotel') OR p_booking_id LIKE 'FRCC-S-%' THEN
    RETURN public.cancel_stay_booking(p_booking_id);
  ELSIF v_normalized_type IN ('hall', 'convention', 'convention_hall') OR p_booking_id LIKE 'FRCC-H-%' THEN
    RETURN public.cancel_hall_booking(p_booking_id);
  ELSIF v_normalized_type IN ('table', 'dining') OR p_booking_id LIKE 'FRCC-TAB-%' OR p_booking_id LIKE 'FRCC-T-%' THEN
    RETURN public.cancel_table_booking(p_booking_id);
  ELSIF v_normalized_type IN ('activity', 'activities', 'game') OR p_booking_id LIKE 'FRCC-ACT-%' THEN
    RETURN public.cancel_activity_booking(p_booking_id);
  ELSE
    IF EXISTS (SELECT 1 FROM public.stay_bookings WHERE booking_ref = p_booking_id OR id::TEXT = p_booking_id) THEN
      RETURN public.cancel_stay_booking(p_booking_id);
    ELSIF EXISTS (SELECT 1 FROM public.convention_bookings WHERE id = p_booking_id) THEN
      RETURN public.cancel_hall_booking(p_booking_id);
    ELSIF EXISTS (SELECT 1 FROM public.table_bookings WHERE booking_ref = p_booking_id OR id::TEXT = p_booking_id) THEN
      RETURN public.cancel_table_booking(p_booking_id);
    ELSE
      RETURN public.cancel_activity_booking(p_booking_id);
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_booking(TEXT, TEXT) TO authenticated, service_role;

