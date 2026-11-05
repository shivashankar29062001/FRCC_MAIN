-- ============================================================================
-- Migration: 20261103050000_fix_table_bookings_permissions_and_rpc.sql
-- Description: Fixes "permission denied for table table_bookings" by granting
--              SELECT and UPDATE to authenticated and service_role, establishing
--              an RLS UPDATE policy, and ensuring cancel_table_booking RPC runs
--              as SECURITY DEFINER with execute permissions.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Grant table-level permissions to authenticated, anon, and service_role
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.table_bookings TO authenticated, anon, service_role;

-- ----------------------------------------------------------------------------
-- STEP 2: RLS policy allowing authenticated users to update own table bookings
-- ----------------------------------------------------------------------------
ALTER TABLE public.table_bookings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'table_bookings'
      AND policyname = 'Users can update own table bookings'
  ) THEN
    CREATE POLICY "Users can update own table bookings" ON public.table_bookings
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id OR user_id IS NULL OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL OR public.is_admin());
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 3: SECURITY DEFINER RPC cancel_table_booking(p_booking_id)
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
    AND (user_id = v_uid OR user_id IS NULL OR public.is_admin())
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

GRANT EXECUTE ON FUNCTION public.cancel_table_booking(TEXT) TO authenticated, anon, service_role;

-- ----------------------------------------------------------------------------
-- STEP 4: Ensure unified cancel_booking routes table bookings
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

  IF v_normalized_type IN ('table', 'dining') OR p_booking_id LIKE 'FRCC-TAB-%' OR p_booking_id LIKE 'FRCC-T-%' THEN
    RETURN public.cancel_table_booking(p_booking_id);
  ELSIF v_normalized_type IN ('stay', 'hotel') OR p_booking_id LIKE 'FRCC-S-%' THEN
    RETURN public.cancel_stay_booking(p_booking_id);
  ELSIF v_normalized_type IN ('hall', 'convention', 'convention_hall') OR p_booking_id LIKE 'FRCC-H-%' THEN
    RETURN public.cancel_hall_booking(p_booking_id);
  ELSIF v_normalized_type IN ('activity', 'activities', 'game') OR p_booking_id LIKE 'FRCC-ACT-%' THEN
    RETURN public.cancel_activity_booking(p_booking_id);
  ELSE
    IF EXISTS (SELECT 1 FROM public.table_bookings WHERE booking_ref = p_booking_id OR id::TEXT = p_booking_id) THEN
      RETURN public.cancel_table_booking(p_booking_id);
    ELSIF EXISTS (SELECT 1 FROM public.stay_bookings WHERE booking_ref = p_booking_id OR id::TEXT = p_booking_id) THEN
      RETURN public.cancel_stay_booking(p_booking_id);
    ELSIF EXISTS (SELECT 1 FROM public.convention_bookings WHERE id = p_booking_id) THEN
      RETURN public.cancel_hall_booking(p_booking_id);
    ELSE
      RETURN public.cancel_activity_booking(p_booking_id);
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_booking(TEXT, TEXT) TO authenticated, anon, service_role;

