-- ---------------------------------------------------------------------------
-- docs/stay-schema.sql — STAGE 1: PostgreSQL Schema for FRCC Stays
-- Safe to re-run with IF NOT EXISTS and DROP/CREATE OR REPLACE FUNCTION
-- ---------------------------------------------------------------------------

-- 1. TABLES

-- room_types table
CREATE TABLE IF NOT EXISTS public.room_types (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL DEFAULT 'vijayawada',
  category TEXT NOT NULL CHECK (category IN ('normal', 'suite')),
  name TEXT NOT NULL,
  description TEXT,
  bed_type TEXT,
  view TEXT,
  size_sqft INTEGER,
  max_guests INTEGER NOT NULL DEFAULT 2,
  rooms_total INTEGER NOT NULL DEFAULT 10,
  price_per_night INTEGER NOT NULL,
  amenities JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true
);

-- stay_bookings table
CREATE TABLE IF NOT EXISTS public.stay_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_request_id TEXT UNIQUE,
  booking_ref TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  room_type_id TEXT REFERENCES public.room_types(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER NOT NULL,
  rooms INTEGER NOT NULL DEFAULT 1,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  guest_name TEXT NOT NULL,
  guest_mobile TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  special_request TEXT,
  price_per_night INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  member_discount INTEGER NOT NULL DEFAULT 0,
  coupon_code TEXT,
  coupon_discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'upi',
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  hold_expires_at TIMESTAMPTZ,
  is_test BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stay_bookings_dates ON public.stay_bookings (room_type_id, check_in, check_out, status);
CREATE INDEX IF NOT EXISTS idx_stay_bookings_user ON public.stay_bookings (user_id);

-- 2. SEED ROOM_TYPES FROM src/data/hotel.js
INSERT INTO public.room_types (id, area_id, category, name, description, bed_type, view, size_sqft, max_guests, rooms_total, price_per_night, amenities, active)
VALUES
  ('vja-standard-room', 'vijayawada', 'normal', 'Standard Room', 'Comfortable and well-appointed standard room with modern amenities and courtyard view.', 'Queen Bed', 'Courtyard View', 280, 2, 10, 2500, '["Free WiFi", "AC", "Queen Bed", "Breakfast Included", "Room Service"]'::jsonb, true),
  ('vja-deluxe-room', 'vijayawada', 'normal', 'Deluxe Room', 'Spacious deluxe room with private balcony, scenic views, and club pool access.', 'King Bed', 'Krishna River View', 380, 2, 10, 3500, '["Free WiFi", "River View Balcony", "King Bed", "AC", "Breakfast Included", "Pool Access"]'::jsonb, true),
  ('vja-premium-room', 'vijayawada', 'normal', 'Premium Room', 'Premium room with floor-to-ceiling windows, luxury bath fittings, and full campus privileges.', 'King Bed', 'Panoramic River & Lawn View', 450, 3, 10, 4500, '["Free WiFi", "Floor-to-Ceiling Windows", "King Bed", "AC", "Breakfast Included", "Pool & Gym Access"]'::jsonb, true),
  ('vja-junior-suite', 'vijayawada', 'suite', 'Junior Suite', 'Generously proportioned junior suite featuring a separate sitting lounge and riverfront vistas.', 'King Bed + Sofa Bed', 'Riverfront View', 600, 3, 4, 6000, '["Free WiFi", "Living Area", "King Bed", "AC", "Jacuzzi", "Breakfast Included", "Club Lounge Access"]'::jsonb, true),
  ('vja-executive-suite', 'vijayawada', 'suite', 'Executive Suite', 'Executive suite with private meeting lounge, ergonomic work alcove, and bespoke butler service.', 'King Bed + Workstation', 'Panoramic City & River View', 750, 3, 4, 8000, '["Free WiFi", "Separate Living Room", "Ergonomic Desk", "Jacuzzi", "Breakfast Included", "VIP Concierge"]'::jsonb, true),
  ('vja-royal-suite', 'vijayawada', 'suite', 'Royal Suite', 'Palatial royal suite with expansive private terrace, dining room, jacuzzi, and 24-hour butler concierge.', 'Four-Poster King Bed', 'Private Terrace & Riverfront', 1100, 4, 4, 10000, '["Private Terrace", "Dedicated Butler Service", "Living & Dining Room", "Jacuzzi", "Breakfast Included", "Valet Parking"]'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET
  area_id = EXCLUDED.area_id,
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  bed_type = EXCLUDED.bed_type,
  view = EXCLUDED.view,
  size_sqft = EXCLUDED.size_sqft,
  max_guests = EXCLUDED.max_guests,
  rooms_total = EXCLUDED.rooms_total,
  price_per_night = EXCLUDED.price_per_night,
  amenities = EXCLUDED.amenities,
  active = EXCLUDED.active;

-- 3. FUNCTION get_available_rooms
CREATE OR REPLACE FUNCTION public.get_available_rooms(
  p_check_in DATE,
  p_check_out DATE
)
RETURNS TABLE (
  id TEXT,
  area_id TEXT,
  category TEXT,
  name TEXT,
  description TEXT,
  bed_type TEXT,
  view TEXT,
  size_sqft INTEGER,
  max_guests INTEGER,
  rooms_total INTEGER,
  price_per_night INTEGER,
  amenities JSONB,
  active BOOLEAN,
  available INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rt.id,
    rt.area_id,
    rt.category,
    rt.name,
    rt.description,
    rt.bed_type,
    rt.view,
    rt.size_sqft,
    rt.max_guests,
    rt.rooms_total,
    rt.price_per_night,
    rt.amenities,
    rt.active,
    GREATEST(
      0,
      rt.rooms_total - COALESCE(
        (
          SELECT SUM(sb.rooms)::INTEGER
          FROM public.stay_bookings sb
          WHERE sb.room_type_id = rt.id
            AND sb.check_in < p_check_out
            AND sb.check_out > p_check_in
            AND (
              sb.status = 'confirmed'
              OR (sb.status = 'pending' AND sb.hold_expires_at > NOW())
            )
        ),
        0
      )
    )::INTEGER AS available
  FROM public.room_types rt
  WHERE rt.active = true
  ORDER BY rt.price_per_night ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. FUNCTION create_stay_booking
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
  -- Never trust p_user_id: use auth.uid()
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to make a stay reservation.';
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> v_uid THEN
    RAISE EXCEPTION 'Invalid user credentials for reservation.';
  END IF;

  -- 1. Idempotency guard: return existing booking if client_request_id already recorded
  IF p_client_request_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.stay_bookings
    WHERE client_request_id = p_client_request_id;
    
    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  -- 2. Lock room_types row for update to prevent race conditions
  SELECT * INTO v_room
  FROM public.room_types
  WHERE id = p_room_type_id AND active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room type % not found or inactive', p_room_type_id;
  END IF;

  -- 3. Date validation
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

  -- 7. Apply member discount only for active membership
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = v_uid 
      AND status = 'Active'
      AND (valid_until IS NULL OR valid_until > NOW())
  ) INTO v_is_member;

  IF v_is_member THEN
    v_member_discount := ROUND(v_subtotal * 0.30)::INTEGER;
  END IF;

  -- 8. Apply coupon redemption logic only when applies_to contains 'stay' or 'all'
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

  -- 11. Insert booking record
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

-- 5. ROW LEVEL SECURITY POLICIES

ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stay_bookings ENABLE ROW LEVEL SECURITY;

-- room_types is readable by everyone
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'room_types' AND policyname = 'Room types are readable by everyone') THEN
    CREATE POLICY "Room types are readable by everyone" ON public.room_types FOR SELECT USING (true);
  END IF;
END $$;

-- stay_bookings: users can select only their own stay_bookings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stay_bookings' AND policyname = 'Users can select own stay bookings') THEN
    CREATE POLICY "Users can select own stay bookings" ON public.stay_bookings 
    FOR SELECT USING (
      user_id = auth.uid() OR auth.uid() IS NULL
    );
  END IF;
END $$;

-- Direct inserts only through create_stay_booking security definer function
REVOKE INSERT, UPDATE, DELETE ON public.stay_bookings FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_stay_booking TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_rooms TO anon, authenticated;
