-- ============================================================================
-- Migration: 20261103010000_parking_campus_and_rpc.sql
-- Description:
--   1. Adds campus, start_at, and end_at columns to public.parking_bookings.
--   2. Adds CHECK constraint on vehicle_number matching Indian standard & BH formats.
--   3. Enables btree_gist extension and enforces an anti-collision exclusion
--      constraint per campus and slot over overlapping time ranges.
--   4. Adds SECURITY DEFINER RPC get_parking_availability(campus, start_at, end_at).
--   5. Adds SECURITY DEFINER RPC create_parking_booking(...) with advisory lock
--      and SLOT_TAKEN exception.
--   6. Enforces owner-only RLS on public.parking_bookings.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Enable btree_gist extension for range exclusion constraint
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ----------------------------------------------------------------------------
-- STEP 2: Add campus, start_at, end_at columns & migrate existing data
-- ----------------------------------------------------------------------------
ALTER TABLE public.parking_bookings ADD COLUMN IF NOT EXISTS campus TEXT;
ALTER TABLE public.parking_bookings ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ;
ALTER TABLE public.parking_bookings ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;

-- Backfill campus from city if null
UPDATE public.parking_bookings
SET campus = LOWER(city)
WHERE campus IS NULL AND city IS NOT NULL;

UPDATE public.parking_bookings
SET campus = 'vijayawada'
WHERE campus IS NULL;

ALTER TABLE public.parking_bookings ALTER COLUMN campus SET DEFAULT 'vijayawada';

-- Backfill start_at and end_at if null
UPDATE public.parking_bookings
SET start_at = (booking_date + arrival_time)::timestamp AT TIME ZONE 'Asia/Kolkata',
    end_at = COALESCE(expires_at, (booking_date + arrival_time)::timestamp AT TIME ZONE 'Asia/Kolkata' + (duration_days || ' days')::interval)
WHERE start_at IS NULL;

-- ----------------------------------------------------------------------------
-- STEP 3: Vehicle number format CHECK constraint
-- Validates:
--   - Standard Indian: e.g. AP39AB1234 (2 letters, 1-2 digits, 1-3 letters, 4 digits)
--   - BH series: e.g. 22BH1234AA (2 digits, BH, 4 digits, 1-2 letters)
-- ----------------------------------------------------------------------------
ALTER TABLE public.parking_bookings DROP CONSTRAINT IF EXISTS chk_parking_vehicle_number;
ALTER TABLE public.parking_bookings ADD CONSTRAINT chk_parking_vehicle_number
  CHECK (vehicle_number ~* '^([A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$');

-- ----------------------------------------------------------------------------
-- STEP 4: Anti-collision exclusion constraint per campus and slot
-- Replaces old single-day index which prevented same slot across different cities
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.uq_active_parking_slot_booking;

ALTER TABLE public.parking_bookings DROP CONSTRAINT IF EXISTS uq_parking_slot_campus_timerange;

ALTER TABLE public.parking_bookings ADD CONSTRAINT uq_parking_slot_campus_timerange
  EXCLUDE USING gist (
    campus WITH =,
    slot_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (booking_status = 'CONFIRMED');

-- ----------------------------------------------------------------------------
-- STEP 5: Trigger to automatically populate start_at and end_at on INSERT/UPDATE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_parking_booking_set_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.campus IS NOT NULL THEN
    NEW.campus := LOWER(NEW.campus);
  END IF;

  IF NEW.start_at IS NULL AND NEW.booking_date IS NOT NULL AND NEW.arrival_time IS NOT NULL THEN
    NEW.start_at := (NEW.booking_date + NEW.arrival_time)::timestamp AT TIME ZONE 'Asia/Kolkata';
  END IF;

  IF NEW.end_at IS NULL AND NEW.start_at IS NOT NULL THEN
    NEW.end_at := NEW.start_at + ((COALESCE(NEW.duration_days, 1)) || ' days')::interval;
  END IF;

  IF NEW.expires_at IS NULL AND NEW.end_at IS NOT NULL THEN
    NEW.expires_at := NEW.end_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_parking_timestamps ON public.parking_bookings;
CREATE TRIGGER trg_set_parking_timestamps
  BEFORE INSERT OR UPDATE ON public.parking_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_parking_booking_set_timestamps();

-- ----------------------------------------------------------------------------
-- STEP 6: RPC get_parking_availability(campus, start_at, end_at)
-- SECURITY DEFINER — Returns slot codes and availability status only.
-- Absolutely NO personal user information is exposed.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_parking_availability(
  p_campus TEXT,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ
)
RETURNS TABLE (
  slot_code TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_campus TEXT := LOWER(TRIM(p_campus));
BEGIN
  RETURN QUERY
  WITH all_slots AS (
    SELECT 'A' || LPAD(i::TEXT, 2, '0') AS slot_id FROM generate_series(1, 50) i
    UNION ALL
    SELECT 'B' || LPAD(i::TEXT, 2, '0') AS slot_id FROM generate_series(1, 50) i
    UNION ALL
    SELECT 'C' || LPAD(i::TEXT, 2, '0') AS slot_id FROM generate_series(1, 50) i
  ),
  booked_slots AS (
    SELECT DISTINCT pb.slot_id
    FROM public.parking_bookings pb
    WHERE pb.campus = v_campus
      AND pb.booking_status = 'CONFIRMED'
      AND tstzrange(pb.start_at, pb.end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
  )
  SELECT
    s.slot_id AS slot_code,
    CASE WHEN b.slot_id IS NOT NULL THEN 'booked' ELSE 'available' END AS status
  FROM all_slots s
  LEFT JOIN booked_slots b ON s.slot_id = b.slot_id
  ORDER BY s.slot_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_parking_availability(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- STEP 7: RPC create_parking_booking(...)
-- SECURITY DEFINER — Requires auth.uid(), validates format and dates,
-- acquires transactional advisory lock per campus:slot, raises SLOT_TAKEN on
-- conflict, and creates confirmed booking.
-- ----------------------------------------------------------------------------
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

  -- 2. Validate vehicle registration number
  IF NOT (v_clean_vehicle ~* '^([A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$') THEN
    RAISE EXCEPTION 'INVALID_VEHICLE_NUMBER: Enter a valid vehicle number, e.g. AP39AB1234';
  END IF;

  -- 3. Calculate start and end timestamps (Asia/Kolkata timezone)
  v_start_at := (p_booking_date + p_arrival_time)::timestamp AT TIME ZONE 'Asia/Kolkata';
  v_end_at := v_start_at + (v_duration || ' days')::interval;

  -- 4. Date check (no bookings in the past with 15 min grace)
  IF v_start_at < NOW() - INTERVAL '15 minutes' THEN
    RAISE EXCEPTION 'INVALID_DATE: Booking arrival time cannot be in the past.';
  END IF;

  -- 5. Advisory lock per campus and slot to serialize concurrent requests
  PERFORM pg_advisory_xact_lock(hashtext(v_campus || ':' || v_slot_id));

  -- 6. Concurrency collision check
  IF EXISTS (
    SELECT 1
    FROM public.parking_bookings
    WHERE campus = v_campus
      AND slot_id = v_slot_id
      AND booking_status = 'CONFIRMED'
      AND tstzrange(start_at, end_at, '[)') && tstzrange(v_start_at, v_end_at, '[)')
  ) THEN
    RAISE EXCEPTION 'SLOT_TAKEN';
  END IF;

  -- 7. Generate unique booking reference
  v_booking_ref := 'FRCC-PARK-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
  v_city_display := CASE WHEN v_campus = 'hyderabad' THEN 'Hyderabad' ELSE 'Vijayawada' END;

  -- 8. Insert new confirmed booking record
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
    total_amount,
    payment_method,
    payment_status,
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
    COALESCE(p_vehicle_type, 'Four Wheeler'),
    v_clean_vehicle,
    p_vehicle_model,
    COALESCE(p_total_amount, 0),
    COALESCE(p_payment_method, 'UPI'),
    'PAID',
    'CONFIRMED'
  )
  RETURNING * INTO v_new_booking;

  RETURN v_new_booking;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_parking_booking(
  TEXT, TEXT, DATE, TIME, INTEGER, TEXT, TEXT, TEXT, TEXT, NUMERIC
) TO authenticated;

-- ----------------------------------------------------------------------------
-- STEP 8: RLS configuration for public.parking_bookings
-- ----------------------------------------------------------------------------
ALTER TABLE public.parking_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own parking bookings" ON public.parking_bookings;
CREATE POLICY "Users can view own parking bookings"
  ON public.parking_bookings
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own parking bookings" ON public.parking_bookings;
CREATE POLICY "Users can update own parking bookings"
  ON public.parking_bookings
  FOR UPDATE
  USING (auth.uid() = user_id);

