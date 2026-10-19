-- ===========================================================================
-- docs/dining-schema.sql — Canonical Dining Schema for FRCC
-- ===========================================================================

-- 1. Create dining_venues table
CREATE TABLE IF NOT EXISTS public.dining_venues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  tagline TEXT,
  cuisine TEXT,
  hours TEXT,
  min_age INTEGER NOT NULL DEFAULT 0,
  capacity_per_slot INTEGER NOT NULL DEFAULT 20,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed dining_venues
INSERT INTO public.dining_venues (id, name, type, tagline, cuisine, hours, min_age, capacity_per_slot, active)
VALUES
  ('restaurant', 'Restaurant', 'Restaurant', 'All-day multi-cuisine dining with authentic Andhra and continental favourites', 'Multi-cuisine & Andhra', '11:00 AM – 11:00 PM', 0, 30, true),
  ('coffee-shop', 'Coffee Shop', 'Coffee Shop', 'Artisan brews, steeped teas and fresh bakes in a relaxed café setting', 'Coffee & Bakes', '6:30 AM – 10:30 PM', 0, 20, true),
  ('pub', 'Pub', 'Pub', 'Draft pours, curated spirits, bar bites and upbeat evening atmosphere', 'Pub Grub & Drinks', '4:00 PM – 11:30 PM', 21, 25, true),
  ('lounge-bar', 'Lounge Bar', 'Lounge Bar', 'Sophisticated craft cocktails, single malts and small plates in an intimate lounge', 'Cocktails & Small Plates', '5:00 PM – 12:00 AM', 21, 20, true),
  ('rooftop-restaurant', 'Rooftop Restaurant', 'Rooftop Restaurant', 'Open-air terrace dining with river breezes, live grills and sunset views', 'Grills & Continental', '6:30 PM – 11:30 PM', 0, 25, true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create table_bookings table
CREATE TABLE IF NOT EXISTS public.table_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_request_id TEXT UNIQUE,
  booking_ref TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  venue_id TEXT REFERENCES public.dining_venues(id),
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  guests INTEGER NOT NULL DEFAULT 2,
  guest_name TEXT NOT NULL,
  guest_mobile TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  notes TEXT,
  age_confirmed BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_table_bookings_user ON public.table_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_table_bookings_venue_slot ON public.table_bookings(venue_id, date, time_slot, status);

-- 3. Functions
CREATE OR REPLACE FUNCTION public.get_available_table_slots(
  p_venue_id TEXT,
  p_date DATE
) RETURNS TABLE (
  time_slot TEXT,
  seats_left INTEGER,
  available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venue public.dining_venues;
  v_capacity INTEGER;
BEGIN
  SELECT * INTO v_venue FROM public.dining_venues WHERE id = p_venue_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venue % not found or inactive', p_venue_id;
  END IF;

  v_capacity := COALESCE(v_venue.capacity_per_slot, 20);

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
    (v_capacity - COALESCE(SUM(tb.guests), 0)::INTEGER) > 0 AS available
  FROM venue_default_slots vds
  LEFT JOIN public.table_bookings tb
    ON tb.venue_id = p_venue_id
   AND tb.date = p_date
   AND tb.time_slot = vds.slot
   AND tb.status = 'confirmed'
  GROUP BY vds.slot;
END;
$$;

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
  p_user_id UUID DEFAULT NULL
) RETURNS public.table_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_existing public.table_bookings;
  v_venue public.dining_venues;
  v_booked_seats INTEGER;
  v_capacity INTEGER;
  v_seats_remaining INTEGER;
  v_booking_ref TEXT;
  v_new_booking public.table_bookings;
BEGIN
  -- Authenticated user validation: Never trust user_id from client
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to make a table reservation.';
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> v_uid THEN
    RAISE EXCEPTION 'Invalid user credentials for reservation.';
  END IF;

  -- 1. Idempotency guard: Return existing booking if client_request_id exists
  IF p_client_request_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.table_bookings
    WHERE client_request_id = p_client_request_id;

    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  -- 2. Lock venue row FOR UPDATE
  SELECT * INTO v_venue
  FROM public.dining_venues
  WHERE id = p_venue_id AND active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dining venue % not found or inactive', p_venue_id;
  END IF;

  -- 3. Date validation: Today to 30 days ahead
  IF p_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Reservation date cannot be in the past.';
  END IF;

  IF p_date > (CURRENT_DATE + INTERVAL '30 days') THEN
    RAISE EXCEPTION 'Table reservations can only be made up to 30 days in advance.';
  END IF;

  -- 4. Guests validation: 1 to 12
  IF p_guests < 1 OR p_guests > 12 THEN
    RAISE EXCEPTION 'Party size must be between 1 and 12 guests.';
  END IF;

  -- 5. Age confirmation check when min_age > 0
  IF v_venue.min_age > 0 AND NOT p_age_confirmed THEN
    RAISE EXCEPTION 'You must confirm that you are % or older to book at %.', v_venue.min_age, v_venue.name;
  END IF;

  -- 6. Lock and re-check remaining seats
  v_capacity := COALESCE(v_venue.capacity_per_slot, 20);

  SELECT COALESCE(SUM(guests), 0) INTO v_booked_seats
  FROM public.table_bookings
  WHERE venue_id = p_venue_id
    AND date = p_date
    AND time_slot = p_time
    AND status = 'confirmed';

  v_seats_remaining := v_capacity - v_booked_seats;
  IF v_seats_remaining < p_guests THEN
    RAISE EXCEPTION 'Insufficient capacity at % on % at %. Only % seat(s) remaining.',
      v_venue.name, p_date, p_time, GREATEST(0, v_seats_remaining);
  END IF;

  -- 7. Generate booking reference: FRCC-T-<YYYY>-<6 digits>
  v_booking_ref := 'FRCC-T-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

  -- 8. Insert record and return row
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
    'confirmed',
    NOW()
  ) RETURNING * INTO v_new_booking;

  RETURN v_new_booking;
END;
$$;

-- 4. Row Level Security Policies
ALTER TABLE public.dining_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dining_venues' AND policyname = 'Venues readable by everyone') THEN
    CREATE POLICY "Venues readable by everyone" ON public.dining_venues FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'table_bookings' AND policyname = 'Users can select own table bookings') THEN
    CREATE POLICY "Users can select own table bookings" ON public.table_bookings
    FOR SELECT USING (
      auth.uid() = user_id
    );
  END IF;
END $$;

REVOKE INSERT, UPDATE, DELETE ON public.table_bookings FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_available_table_slots(TEXT, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_table_booking(TEXT, TEXT, DATE, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
