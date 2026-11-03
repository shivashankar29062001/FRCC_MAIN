-- ===========================================================================
-- docs/stay-fix.sql
-- Fix create_stay_booking RPC overload mismatch, schema cache reload,
-- and parameter synchronization for Supabase PostgREST.
-- ===========================================================================

-- 1. Ensure coupons table has applies_to column
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS applies_to TEXT[] DEFAULT ARRAY['all']::TEXT[];
UPDATE public.coupons 
SET applies_to = ARRAY['all', 'stay', 'membership'] 
WHERE applies_to IS NULL OR applies_to = '{}'::TEXT[];

-- 2. Drop EVERY existing overload of create_stay_booking using pg_proc and regprocedure
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT p.oid::regprocedure AS func_sig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'create_stay_booking'
  ) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE;';
  END LOOP;
END $$;

-- 3. Recreate create_stay_booking with exact parameter names, security definer, and search_path
CREATE OR REPLACE FUNCTION public.create_stay_booking(
  p_adults INTEGER,
  p_check_in DATE,
  p_check_out DATE,
  p_children INTEGER,
  p_client_request_id TEXT,
  p_coupon_code TEXT DEFAULT NULL,
  p_guest_email TEXT DEFAULT '',
  p_guest_mobile TEXT DEFAULT '',
  p_guest_name TEXT DEFAULT '',
  p_is_mock_paid BOOLEAN DEFAULT FALSE,
  p_payment_method TEXT DEFAULT 'upi',
  p_room_type_id TEXT DEFAULT NULL,
  p_rooms INTEGER DEFAULT 1,
  p_special_request TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS public.stay_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_existing public.stay_bookings;
  v_room public.room_types;
  v_nights INTEGER;
  v_booked_rooms INTEGER;
  v_available INTEGER;
  v_subtotal INTEGER;
  v_member_discount INTEGER := 0;
  v_coupon_discount INTEGER := 0;
  v_total INTEGER;
  v_status TEXT;
  v_hold_expires TIMESTAMPTZ := NULL;
  v_is_member BOOLEAN := false;
  v_booking_ref TEXT;
  v_new_booking public.stay_bookings;
  v_coupon RECORD;
BEGIN
  -- (d) Never trust p_user_id: use auth.uid()
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to make a stay reservation.';
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> v_uid THEN
    RAISE EXCEPTION 'Invalid user credentials for reservation.';
  END IF;

  -- (e) 1. Idempotency guard: return existing booking if client_request_id already recorded
  IF p_client_request_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.stay_bookings
    WHERE client_request_id = p_client_request_id;
    
    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  -- 2. Lock the room_types row FOR UPDATE
  SELECT * INTO v_room
  FROM public.room_types
  WHERE id = p_room_type_id AND active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room type % not found or inactive', p_room_type_id;
  END IF;

  -- 3. Validate dates
  IF p_check_in < CURRENT_DATE THEN
    RAISE EXCEPTION 'Check-in date cannot be in the past';
  END IF;

  IF p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'Check-out date must be after check-in date';
  END IF;

  v_nights := (p_check_out - p_check_in);
  IF v_nights < 1 OR v_nights > 30 THEN
    RAISE EXCEPTION 'Stay duration must be between 1 and 30 nights';
  END IF;

  -- 4. Rooms and guests validation
  IF p_rooms < 1 THEN
    RAISE EXCEPTION 'Rooms count must be at least 1';
  END IF;

  IF (p_adults + p_children) > (v_room.max_guests * p_rooms) THEN
    RAISE EXCEPTION 'Total guests exceed maximum allowed capacity for % room(s)', p_rooms;
  END IF;

  -- 5. Re-check real-time availability for overlapping confirmed or still-held bookings
  SELECT COALESCE(SUM(sb.rooms), 0) INTO v_booked_rooms
  FROM public.stay_bookings sb
  WHERE sb.room_type_id = v_room.id
    AND sb.check_in < p_check_out
    AND sb.check_out > p_check_in
    AND (
      sb.status = 'confirmed'
      OR (sb.status = 'pending' AND sb.hold_expires_at > NOW())
    );

  v_available := v_room.rooms_total - v_booked_rooms;
  IF v_available < p_rooms THEN
    RAISE EXCEPTION 'Insufficient room availability for the requested dates (% available, % requested)', v_available, p_rooms;
  END IF;

  -- 6. Recalculate price on the server
  v_subtotal := v_nights * v_room.price_per_night * p_rooms;

  -- 7. Apply member discount only for an active membership
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = v_uid 
      AND status = 'Active'
      AND (valid_until IS NULL OR valid_until > NOW())
  ) INTO v_is_member;

  IF v_is_member THEN
    v_member_discount := ROUND(v_subtotal * 0.30)::INTEGER;
  END IF;

  -- 8. Apply coupon only when coupons.applies_to contains 'stay' or 'all'
  IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) <> '' THEN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_coupon_code))
    FOR UPDATE;

    IF FOUND 
       AND v_coupon.active 
       AND (v_coupon.expires_at IS NULL OR v_coupon.expires_at > NOW()) 
       AND (v_coupon.used_count < v_coupon.max_uses)
       AND (
         v_coupon.applies_to IS NULL 
         OR 'all' = ANY(v_coupon.applies_to) 
         OR 'stay' = ANY(v_coupon.applies_to)
       ) THEN
      v_coupon_discount := ROUND((v_subtotal - v_member_discount) * (v_coupon.percent_off::NUMERIC / 100))::INTEGER;
      
      UPDATE public.coupons
      SET used_count = used_count + 1
      WHERE id = v_coupon.id;
    END IF;
  END IF;

  v_total := GREATEST(0, v_subtotal - v_member_discount - v_coupon_discount);

  -- 9. Determine status and hold expiration
  -- TODO-RAZORPAY: before real payments p_is_mock_paid must be removed and the status must be set only after server-side payment verification
  IF v_total = 0 OR p_is_mock_paid THEN
    v_status := 'confirmed';
    v_hold_expires := NULL;
  ELSE
    v_status := 'pending';
    v_hold_expires := NOW() + INTERVAL '15 minutes';
  END IF;

  -- 10. Generate booking_ref: FRCC-S-<YYYY>-<6 digits>
  v_booking_ref := 'FRCC-S-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

  -- 11. Insert booking record and return
  INSERT INTO public.stay_bookings (
    client_request_id,
    booking_ref,
    user_id,
    room_type_id,
    check_in,
    check_out,
    nights,
    rooms,
    adults,
    children,
    guest_name,
    guest_mobile,
    guest_email,
    special_request,
    price_per_night,
    subtotal,
    member_discount,
    coupon_code,
    coupon_discount,
    total,
    payment_method,
    status,
    hold_expires_at,
    is_test,
    created_at
  ) VALUES (
    p_client_request_id,
    v_booking_ref,
    v_uid,
    v_room.id,
    p_check_in,
    p_check_out,
    v_nights,
    p_rooms,
    p_adults,
    p_children,
    p_guest_name,
    p_guest_mobile,
    p_guest_email,
    p_special_request,
    v_room.price_per_night,
    v_subtotal,
    v_member_discount,
    p_coupon_code,
    v_coupon_discount,
    v_total,
    p_payment_method,
    v_status,
    v_hold_expires,
    (v_coupon_discount > 0 OR p_is_mock_paid),
    NOW()
  ) RETURNING * INTO v_new_booking;

  RETURN v_new_booking;
END;
$$;

-- (f) Grant execute and reload PostgREST schema cache
GRANT EXECUTE ON FUNCTION public.create_stay_booking(
  INTEGER, DATE, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, INTEGER, TEXT, UUID
) TO authenticated;

NOTIFY pgrst, 'reload schema';
