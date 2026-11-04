-- ============================================================================
-- Migration: 20261104020000_validate_vehicle_number_format.sql
-- Description:
--   Updates vehicle number validation in public.parking_bookings to enforce
--   exact format AP74HU7654 (^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$).
-- ============================================================================

-- 1. Update CHECK constraint on public.parking_bookings
ALTER TABLE public.parking_bookings DROP CONSTRAINT IF EXISTS chk_parking_vehicle_number;
ALTER TABLE public.parking_bookings ADD CONSTRAINT chk_parking_vehicle_number
  CHECK (vehicle_number ~ '^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$');

-- 2. Update RPC create_parking_booking with new regex validation
CREATE OR REPLACE FUNCTION public.create_parking_booking(
  p_campus TEXT,
  p_slot_id TEXT,
  p_booking_date DATE,
  p_arrival_time TIME,
  p_duration_days INTEGER DEFAULT 1,
  p_vehicle_type TEXT DEFAULT 'Four Wheeler',
  p_vehicle_number TEXT DEFAULT '',
  p_vehicle_model TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'UPI',
  p_total_amount NUMERIC DEFAULT 0
)
RETURNS public.parking_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_campus TEXT;
  v_slot_id TEXT;
  v_clean_vehicle TEXT;
  v_start_at TIMESTAMPTZ;
  v_end_at TIMESTAMPTZ;
  v_duration INTEGER;
  v_booking_ref TEXT;
  v_city_display TEXT;
  v_new_booking public.parking_bookings;
BEGIN
  -- 1. Authentication check
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required to book a parking slot.';
  END IF;

  v_campus := LOWER(TRIM(p_campus));
  v_slot_id := UPPER(TRIM(p_slot_id));
  v_clean_vehicle := UPPER(REGEXP_REPLACE(p_vehicle_number, '[^A-Za-z0-9]', '', 'g'));
  v_duration := GREATEST(1, LEAST(COALESCE(p_duration_days, 1), 7));

  -- 2. Validate vehicle registration number: format AP74HU7654
  IF NOT (v_clean_vehicle ~ '^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$') THEN
    RAISE EXCEPTION 'INVALID_VEHICLE_NUMBER: Invalid vehicle registration number. Expected format: AP74HU7654';
  END IF;

  -- 3. Calculate start_at and end_at timestamps (Asia/Kolkata)
  v_start_at := (p_booking_date + p_arrival_time)::timestamp AT TIME ZONE 'Asia/Kolkata';
  v_end_at := v_start_at + (v_duration || ' days')::interval;

  -- 4. Transactional advisory lock per campus:slot
  PERFORM pg_advisory_xact_lock(hashtext(v_campus || ':' || v_slot_id));

  -- 5. Collision check: overlapping CONFIRMED booking for same campus and slot
  IF EXISTS (
    SELECT 1 FROM public.parking_bookings
    WHERE campus = v_campus
      AND slot_id = v_slot_id
      AND booking_status = 'CONFIRMED'
      AND tstzrange(start_at, end_at, '[)') && tstzrange(v_start_at, v_end_at, '[)')
  ) THEN
    RAISE EXCEPTION 'SLOT_TAKEN: Parking slot % in % is already booked for this time period.', v_slot_id, v_campus;
  END IF;

  -- 6. Generate booking reference
  v_booking_ref := 'FRCC-PARK-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
  v_city_display := CASE WHEN v_campus = 'hyderabad' THEN 'Hyderabad' ELSE 'Vijayawada' END;

  -- 7. Insert the confirmed booking
  INSERT INTO public.parking_bookings (
    booking_reference,
    user_id,
    campus,
    city,
    slot_id,
    booking_date,
    arrival_time,
    duration_days,
    start_at,
    end_at,
    expires_at,
    vehicle_type,
    vehicle_number,
    vehicle_model,
    payment_method,
    payment_status,
    total_amount,
    booking_status
  ) VALUES (
    v_booking_ref,
    v_uid,
    v_campus,
    v_city_display,
    v_slot_id,
    p_booking_date,
    p_arrival_time,
    v_duration,
    v_start_at,
    v_end_at,
    v_end_at,
    p_vehicle_type,
    v_clean_vehicle,
    p_vehicle_model,
    p_payment_method,
    'PAID',
    p_total_amount,
    'CONFIRMED'
  )
  RETURNING * INTO v_new_booking;

  RETURN v_new_booking;
END;
$$;

