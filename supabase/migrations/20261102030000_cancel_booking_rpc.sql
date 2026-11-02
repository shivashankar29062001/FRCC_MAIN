-- ============================================================================
-- Migration: 20261102030000_cancel_booking_rpc.sql
-- Description: Unified & per-service booking cancellation RPC functions for
--              Stay (stay_bookings), Dining (table_bookings), Activities (bookings),
--              and shared reuse for Halls and Parking.
--              Enforces auth.uid() ownership check, prevents cancelling already
--              cancelled/completed bookings, and records cancelled_at timestamp.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Add cancelled_at column to booking tables if missing
-- ----------------------------------------------------------------------------
ALTER TABLE public.stay_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.table_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'activity_bookings'
  ) THEN
    ALTER TABLE public.activity_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: RPC cancel_stay_booking(p_booking_id)
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
    RAISE EXCEPTION 'BOOKING_NOT_FOUND: Stay booking not found or unauthorized.';
  END IF;

  IF LOWER(v_row.status) IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Booking cannot be cancelled because it is already %.', v_row.status;
  END IF;

  UPDATE public.stay_bookings
  SET status = 'cancelled',
      cancelled_at = NOW(),
      updated_at = NOW()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'success', true,
    'booking_type', 'stay',
    'booking_id', COALESCE(v_row.booking_ref, v_row.id::TEXT),
    'status', v_row.status,
    'cancelled_at', v_row.cancelled_at
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- STEP 3: RPC cancel_table_booking(p_booking_id)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_table_booking(
  p_booking_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_row public.table_bookings;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required to cancel a dining table reservation.';
  END IF;

  SELECT * INTO v_row
  FROM public.table_bookings
  WHERE (booking_ref = p_booking_id OR id::TEXT = p_booking_id)
    AND (user_id = v_uid OR public.is_admin())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND: Table reservation not found or unauthorized.';
  END IF;

  IF LOWER(v_row.status) IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Reservation cannot be cancelled because it is already %.', v_row.status;
  END IF;

  UPDATE public.table_bookings
  SET status = 'cancelled',
      cancelled_at = NOW()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'success', true,
    'booking_type', 'dining',
    'booking_id', COALESCE(v_row.booking_ref, v_row.id::TEXT),
    'status', v_row.status,
    'cancelled_at', v_row.cancelled_at
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- STEP 4: RPC cancel_activity_booking(p_booking_id)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_activity_booking(
  p_booking_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_row public.bookings;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required to cancel an activity booking.';
  END IF;

  SELECT * INTO v_row
  FROM public.bookings
  WHERE booking_id = p_booking_id
    AND (user_id = v_uid OR public.is_admin())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND: Booking not found or unauthorized.';
  END IF;

  IF LOWER(v_row.status) IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Booking cannot be cancelled because it is already %.', v_row.status;
  END IF;

  UPDATE public.bookings
  SET status = 'Cancelled',
      cancelled_at = NOW(),
      updated_at = NOW()
  WHERE booking_id = p_booking_id
  RETURNING * INTO v_row;

  -- Cancel associated payment if pending
  UPDATE public.payments
  SET status = 'Cancelled'
  WHERE booking_id = p_booking_id AND status = 'Pending';

  -- If separate activity_bookings table exists, update it as well
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'activity_bookings'
  ) THEN
    EXECUTE 'UPDATE public.activity_bookings SET status = ''cancelled'', cancelled_at = NOW() WHERE (booking_ref = $1 OR id::TEXT = $1) AND (user_id = $2 OR public.is_admin())'
    USING p_booking_id, v_uid;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'booking_type', 'activity',
    'booking_id', v_row.booking_id,
    'status', v_row.status,
    'cancelled_at', v_row.cancelled_at
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- STEP 5: Unified RPC cancel_booking(p_booking_type, p_booking_id)
--         Dispatches to stay_bookings, table_bookings, or bookings (activity/hall/parking)
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
  v_type TEXT;
BEGIN
  v_type := LOWER(TRIM(COALESCE(p_booking_type, '')));

  IF v_type IN ('stay', 'hotel', 'room') THEN
    RETURN public.cancel_stay_booking(p_booking_id);
  ELSIF v_type IN ('dining', 'table', 'restaurant') THEN
    RETURN public.cancel_table_booking(p_booking_id);
  ELSIF v_type IN ('activity', 'activities', 'game', 'sports', 'hall', 'halls', 'parking') THEN
    RETURN public.cancel_activity_booking(p_booking_id);
  ELSE
    -- Auto-detect service by booking reference prefix
    IF p_booking_id LIKE 'FRCC-S-%' THEN
      RETURN public.cancel_stay_booking(p_booking_id);
    ELSIF p_booking_id LIKE 'FRCC-TAB-%' THEN
      RETURN public.cancel_table_booking(p_booking_id);
    ELSIF p_booking_id LIKE 'FRCC-ACT-%' THEN
      RETURN public.cancel_activity_booking(p_booking_id);
    ELSE
      -- Fallback cascade probe: stay -> table -> bookings
      BEGIN
        RETURN public.cancel_stay_booking(p_booking_id);
      EXCEPTION WHEN OTHERS THEN
        BEGIN
          RETURN public.cancel_table_booking(p_booking_id);
        EXCEPTION WHEN OTHERS THEN
          RETURN public.cancel_activity_booking(p_booking_id);
        END;
      END;
    END IF;
  END IF;
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.cancel_stay_booking(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_table_booking(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_activity_booking(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(TEXT, TEXT) TO authenticated;

