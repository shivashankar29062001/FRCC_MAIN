-- ============================================================================
-- Migration: 20261110050000_fix_dining_location_and_past_slots.sql
-- Description:
--   1. Adds explicit campus/location columns (city_id, city_name, area_name,
--      venue_location_name, location) to public.table_bookings and backfills
--      missing location metadata from existing [Location: ...] notes tags.
--   2. Updates get_available_table_slots(p_venue_id, p_date) to mark passed
--      time slots on today's date (Asia/Kolkata) and past dates unavailable
--      for all dining venues.
--   3. Updates create_table_booking(...) to enforce Asia/Kolkata past-date
--      and past-slot validation on the server and persist campus/location.
-- ============================================================================

-- 1. Add explicit location columns to table_bookings
ALTER TABLE public.table_bookings
  ADD COLUMN IF NOT EXISTS city_id TEXT,
  ADD COLUMN IF NOT EXISTS city_name TEXT,
  ADD COLUMN IF NOT EXISTS area_name TEXT,
  ADD COLUMN IF NOT EXISTS venue_location_name TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT;

-- Backfill new location columns from existing [Location: cityId | cityName | areaName | venueLocationName] notes tags
UPDATE public.table_bookings
SET
  city_id = CASE
    WHEN COALESCE(notes, '') ~* '\[Location:[^\]]*hyd' THEN 'hyd'
    WHEN COALESCE(notes, '') ~* '\[Location:\s*([^|]+)\|' THEN TRIM((REGEXP_MATCH(notes, '\[Location:\s*([^|]+)\|', 'i'))[1])
    ELSE 'vja'
  END,
  city_name = CASE
    WHEN COALESCE(notes, '') ~* '\[Location:[^\]]*hyd' THEN 'Hyderabad'
    WHEN COALESCE(notes, '') ~* '\[Location:[^|]+\|\s*([^|]+)\|' THEN TRIM((REGEXP_MATCH(notes, '\[Location:[^|]+\|\s*([^|]+)\|', 'i'))[1])
    ELSE 'Vijayawada'
  END,
  area_name = CASE
    WHEN COALESCE(notes, '') ~* '\[Location:[^\]]*hyd' THEN 'Hyderabad Campus'
    WHEN COALESCE(notes, '') ~* '\[Location:[^|]+\|[^|]+\|\s*([^|]+)\|' THEN TRIM((REGEXP_MATCH(notes, '\[Location:[^|]+\|[^|]+\|\s*([^|]+)\|', 'i'))[1])
    ELSE 'Vijayawada Campus'
  END,
  venue_location_name = CASE
    WHEN COALESCE(notes, '') ~* '\[Location:[^\]]*hyd' THEN 'Hyderabad Club Dining'
    WHEN COALESCE(notes, '') ~* '\[Location:[^|]+\|[^|]+\|[^|]+\|\s*([^\]]+)\]' THEN TRIM((REGEXP_MATCH(notes, '\[Location:[^|]+\|[^|]+\|[^|]+\|\s*([^\]]+)\]', 'i'))[1])
    ELSE 'FRCC Clubhouse Dining'
  END,
  location = CASE
    WHEN COALESCE(notes, '') ~* '\[Location:[^\]]*hyd' THEN 'Hyderabad Campus — Hyderabad Club Dining'
    WHEN COALESCE(notes, '') ~* '\[Location:[^|]+\|[^|]+\|\s*([^|]+)\|\s*([^\]]+)\]' THEN
      TRIM((REGEXP_MATCH(notes, '\[Location:[^|]+\|[^|]+\|\s*([^|]+)\|\s*([^\]]+)\]', 'i'))[1]) || ' — ' ||
      TRIM((REGEXP_MATCH(notes, '\[Location:[^|]+\|[^|]+\|\s*([^|]+)\|\s*([^\]]+)\]', 'i'))[2])
    ELSE 'Vijayawada Campus — Main Clubhouse'
  END
WHERE city_id IS NULL
   OR location IS NULL;

-- 2. Update get_available_table_slots to disable past time slots in Asia/Kolkata
CREATE OR REPLACE FUNCTION public.get_available_table_slots(
  p_venue_id TEXT,
  p_date DATE
)
RETURNS TABLE (
  time_slot TEXT,
  seats_left INTEGER,
  available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_venue public.dining_venues;
  v_capacity INTEGER;
  v_ist_now TIMESTAMP;
BEGIN
  SELECT * INTO v_venue FROM public.dining_venues WHERE id = p_venue_id AND active = true;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_capacity := COALESCE(v_venue.capacity_per_slot, 20);
  v_ist_now := NOW() AT TIME ZONE 'Asia/Kolkata';

  RETURN QUERY
  WITH venue_default_slots AS (
    SELECT unnest(CASE p_venue_id
      WHEN 'restaurant' THEN ARRAY[
        '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM',
        '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM'
      ]
      WHEN 'coffee-shop' THEN ARRAY[
        '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '03:00 PM',
        '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'
      ]
      WHEN 'pub' THEN ARRAY[
        '04:30 PM', '05:30 PM', '06:30 PM', '07:30 PM', '08:30 PM', '09:30 PM', '10:30 PM'
      ]
      WHEN 'lounge-bar' THEN ARRAY[
        '05:30 PM', '06:30 PM', '07:30 PM', '08:30 PM', '09:30 PM', '10:30 PM', '11:00 PM'
      ]
      WHEN 'rooftop-restaurant' THEN ARRAY[
        '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM'
      ]
      ELSE ARRAY['12:00 PM', '01:00 PM', '07:00 PM', '08:00 PM', '09:00 PM']
    END) AS slot
  )
  SELECT
    vds.slot AS time_slot,
    GREATEST(0, v_capacity - COALESCE(SUM(tb.guests), 0)::INTEGER) AS seats_left,
    (
      (v_capacity - COALESCE(SUM(tb.guests), 0)::INTEGER) > 0
      AND (
        p_date > v_ist_now::DATE
        OR (
          p_date = v_ist_now::DATE
          AND TO_TIMESTAMP(vds.slot, 'HH12:MI AM')::TIME > v_ist_now::TIME
        )
      )
    ) AS available
  FROM venue_default_slots vds
  LEFT JOIN public.table_bookings tb
    ON tb.venue_id = p_venue_id
   AND tb.date = p_date
   AND tb.time_slot = vds.slot
   AND LOWER(tb.status) = 'confirmed'
  GROUP BY vds.slot
  ORDER BY TO_TIMESTAMP(vds.slot, 'HH12:MI AM')::TIME ASC;
END;
$$;

-- 3. Replace create_table_booking to enforce Asia/Kolkata past-slot rejection and persist location
DROP FUNCTION IF EXISTS public.create_table_booking(
  TEXT, TEXT, DATE, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID
);

CREATE OR REPLACE FUNCTION public.create_table_booking(
  p_client_request_id TEXT,
  p_venue_id TEXT,
  p_date DATE,
  p_time TEXT,
  p_guests INTEGER,
  p_name TEXT,
  p_mobile TEXT,
  p_email TEXT,
  p_notes TEXT DEFAULT NULL,
  p_age_confirmed BOOLEAN DEFAULT FALSE,
  p_user_id UUID DEFAULT NULL,
  p_city_id TEXT DEFAULT NULL,
  p_city_name TEXT DEFAULT NULL,
  p_area_name TEXT DEFAULT NULL,
  p_venue_location_name TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL
) RETURNS public.table_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_existing public.table_bookings;
  v_venue public.dining_venues;
  v_ist_now TIMESTAMP;
  v_slot_time TIME;
  v_booked_seats INTEGER;
  v_capacity INTEGER;
  v_seats_remaining INTEGER;
  v_booking_ref TEXT;
  v_city_id TEXT;
  v_city_name TEXT;
  v_area_name TEXT;
  v_venue_loc_name TEXT;
  v_location TEXT;
  v_loc_match TEXT[];
  v_new_booking public.table_bookings;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to make a table reservation.';
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> v_uid THEN
    RAISE EXCEPTION 'Invalid user credentials for reservation.';
  END IF;

  IF p_client_request_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.table_bookings
    WHERE client_request_id = p_client_request_id;

    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  SELECT * INTO v_venue
  FROM public.dining_venues
  WHERE id = p_venue_id AND active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dining venue % not found or inactive', p_venue_id;
  END IF;

  v_ist_now := NOW() AT TIME ZONE 'Asia/Kolkata';

  IF p_date IS NULL OR p_date < v_ist_now::DATE THEN
    RAISE EXCEPTION 'Reservation date cannot be in the past.';
  END IF;

  IF p_date > (v_ist_now::DATE + INTERVAL '30 days') THEN
    RAISE EXCEPTION 'Table reservations can only be made up to 30 days in advance.';
  END IF;

  -- Parse reservation time slot (supports '12:00 PM' and '17:00') and block past times today
  BEGIN
    IF TRIM(COALESCE(p_time, '')) ~* 'am|pm' THEN
      v_slot_time := TO_TIMESTAMP(UPPER(TRIM(p_time)), 'HH12:MI AM')::TIME;
    ELSE
      v_slot_time := TRIM(COALESCE(p_time, ''))::TIME;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid reservation time slot.';
  END;

  IF p_date = v_ist_now::DATE AND v_slot_time <= v_ist_now::TIME THEN
    RAISE EXCEPTION 'Selected time slot has already passed. Please choose an upcoming time slot.';
  END IF;

  IF p_guests < 1 OR p_guests > 12 THEN
    RAISE EXCEPTION 'Party size must be between 1 and 12 guests.';
  END IF;

  IF v_venue.min_age > 0 AND NOT p_age_confirmed THEN
    RAISE EXCEPTION 'You must confirm that you are % or older to book at %.', v_venue.min_age, v_venue.name;
  END IF;

  -- Resolve campus/location from explicit parameters or [Location: ...] tag in notes
  v_loc_match := REGEXP_MATCH(
    COALESCE(p_notes, ''),
    '\[Location:\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^\]]+)\]',
    'i'
  );

  v_city_id := COALESCE(NULLIF(TRIM(COALESCE(p_city_id, '')), ''), NULLIF(TRIM(COALESCE(v_loc_match[1], '')), ''), 'vja');
  v_city_name := COALESCE(NULLIF(TRIM(COALESCE(p_city_name, '')), ''), NULLIF(TRIM(COALESCE(v_loc_match[2], '')), ''), CASE WHEN LOWER(v_city_id) LIKE '%hyd%' THEN 'Hyderabad' ELSE 'Vijayawada' END);
  v_area_name := COALESCE(NULLIF(TRIM(COALESCE(p_area_name, '')), ''), NULLIF(TRIM(COALESCE(v_loc_match[3], '')), ''), CASE WHEN LOWER(v_city_id) LIKE '%hyd%' THEN 'Hyderabad Campus' ELSE 'Vijayawada Campus' END);
  v_venue_loc_name := COALESCE(NULLIF(TRIM(COALESCE(p_venue_location_name, '')), ''), NULLIF(TRIM(COALESCE(v_loc_match[4], '')), ''), CASE WHEN LOWER(v_city_id) LIKE '%hyd%' THEN 'Hyderabad Club Dining' ELSE 'FRCC Clubhouse Dining' END);
  v_location := COALESCE(NULLIF(TRIM(COALESCE(p_location, '')), ''), v_area_name || ' — ' || v_venue_loc_name);

  v_capacity := COALESCE(v_venue.capacity_per_slot, 20);

  SELECT COALESCE(SUM(guests), 0) INTO v_booked_seats
  FROM public.table_bookings
  WHERE venue_id = p_venue_id
    AND date = p_date
    AND time_slot = p_time
    AND LOWER(status) = 'confirmed';

  v_seats_remaining := v_capacity - v_booked_seats;
  IF v_seats_remaining < p_guests THEN
    RAISE EXCEPTION 'Insufficient capacity at % on % at %. Only % seat(s) remaining.',
      v_venue.name, p_date, p_time, GREATEST(0, v_seats_remaining);
  END IF;

  v_booking_ref := 'FRCC-T-' || TO_CHAR(v_ist_now, 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

  INSERT INTO public.table_bookings (
    client_request_id,
    booking_ref,
    user_id,
    venue_id,
    date,
    time_slot,
    guests,
    guest_name,
    guest_mobile,
    guest_email,
    notes,
    age_confirmed,
    city_id,
    city_name,
    area_name,
    venue_location_name,
    location,
    status,
    created_at
  ) VALUES (
    p_client_request_id,
    v_booking_ref,
    v_uid,
    v_venue.id,
    p_date,
    p_time,
    p_guests,
    p_name,
    p_mobile,
    p_email,
    p_notes,
    p_age_confirmed,
    v_city_id,
    v_city_name,
    v_area_name,
    v_venue_loc_name,
    v_location,
    'confirmed',
    NOW()
  ) RETURNING * INTO v_new_booking;

  RETURN v_new_booking;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_table_slots(TEXT, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_table_booking(
  TEXT, TEXT, DATE, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';

