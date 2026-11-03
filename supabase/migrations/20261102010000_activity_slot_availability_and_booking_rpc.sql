-- ============================================================================
-- Migration: 20261102010000_activity_slot_availability_and_booking_rpc.sql
-- Description: Enforce Activity slot availability & booking concurrency at the
--              database level. Includes game config catalog, slot availability RPC,
--              atomic booking creation RPC with advisory lock, cancellation RPC,
--              partial unique index safety net, and restricted RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Create public.activity_games table & seed from games.config.js
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  capacity_per_slot INTEGER NOT NULL,
  slot_minutes INTEGER NOT NULL DEFAULT 60,
  price NUMERIC NOT NULL DEFAULT 1500,
  open_hour INTEGER NOT NULL DEFAULT 6,
  close_hour INTEGER NOT NULL DEFAULT 22,
  is_group_capacity BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed games with PLACEHOLDER capacities (marked: confirm with client)
-- Exclusive resources: capacity = number of courts / tables / grounds (1 booking per unit per slot)
-- Group activities: capacity = maximum people / children / members per slot
INSERT INTO public.activity_games (
  id, name, category, capacity_per_slot, slot_minutes, price, open_hour, close_hour, is_group_capacity, is_active
) VALUES
  -- 1. Badminton: 4 indoor courts (exclusive, 1 booking per court per slot) [PLACEHOLDER - confirm with client]
  ('badminton', 'Badminton', 'indoor', 4, 60, 1500, 6, 22, false, true),

  -- 2. Tennis: 2 clay courts (exclusive, 1 booking per court per slot) [PLACEHOLDER - confirm with client]
  ('tennis', 'Tennis', 'outdoor', 2, 60, 1500, 6, 21, false, true),

  -- 3. Cricket: 1 ground (exclusive, 1 booking per slot) [PLACEHOLDER - confirm with client]
  ('cricket', 'Cricket', 'outdoor', 1, 60, 1500, 6, 20, false, true),

  -- 4. Table Tennis: 6 tournament tables (exclusive, 1 booking per table per slot) [PLACEHOLDER - confirm with client]
  ('table-tennis', 'Table Tennis', 'indoor', 6, 60, 1500, 7, 22, false, true),

  -- 5. Volleyball: 2 courts (exclusive, 1 booking per court per slot) [PLACEHOLDER - confirm with client]
  ('volleyball', 'Volleyball', 'outdoor', 2, 60, 1500, 6, 21, false, true),

  -- 6. Chess: 4 tables (exclusive, 1 booking per table per slot) [PLACEHOLDER - confirm with client]
  ('chess', 'Chess', 'indoor', 4, 60, 1500, 8, 21, false, true),

  -- 7. Carom: 4 boards (exclusive, 1 booking per board per slot) [PLACEHOLDER - confirm with client]
  ('carom', 'Carom', 'indoor', 4, 60, 1500, 8, 22, false, true),

  -- 8. Card Room: 6 tables (exclusive, 1 booking per table per slot) [PLACEHOLDER - confirm with client]
  ('card-room', 'Card Room', 'indoor', 6, 60, 1500, 8, 23, false, true),

  -- 9. Golf: 1 tee time / group per slot (exclusive) [PLACEHOLDER - confirm with client]
  ('golf', 'Golf', 'outdoor', 1, 60, 1500, 6, 18, false, true),

  -- 10. Swimming Pool: 20 people per slot (group activity) [PLACEHOLDER - confirm with client]
  ('swimming-pool', 'Swimming Pool', 'water', 20, 60, 1000, 6, 20, true, true),

  -- 11. Kids Play Area: 15 children per slot (group activity) [PLACEHOLDER - confirm with client]
  ('kids-play-area', 'Kids Play Area', 'kids', 15, 60, 1500, 9, 20, true, true),

  -- 12. Football: 1 pitch/ground (exclusive, 1 booking per slot) [PLACEHOLDER - confirm with client]
  ('football', 'Football', 'outdoor', 1, 60, 1500, 6, 21, false, true),

  -- 13. Squash: 2 glass-back courts (exclusive, 1 booking per court per slot) [PLACEHOLDER - confirm with client]
  ('squash', 'Squash', 'indoor', 2, 60, 1500, 6, 22, false, true),

  -- 14. Basketball: 2 full courts (exclusive, 1 booking per court per slot) [PLACEHOLDER - confirm with client]
  ('basketball', 'Basketball', 'outdoor', 2, 60, 1500, 6, 21, false, true),

  -- 15. Luxury Gym: 30 members per slot (group activity) [PLACEHOLDER - confirm with client]
  ('luxury-gym', 'Luxury Gym', 'fitness', 30, 60, 1500, 6, 22, true, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  capacity_per_slot = EXCLUDED.capacity_per_slot,
  slot_minutes = EXCLUDED.slot_minutes,
  price = EXCLUDED.price,
  open_hour = EXCLUDED.open_hour,
  close_hour = EXCLUDED.close_hour,
  is_group_capacity = EXCLUDED.is_group_capacity,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Enable RLS on activity_games (public read for active games)
ALTER TABLE public.activity_games ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'activity_games' AND policyname = 'Public read active activity games'
  ) THEN
    CREATE POLICY "Public read active activity games" ON public.activity_games
      FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: Add game_id column to public.bookings & backfill
-- ----------------------------------------------------------------------------
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS game_id TEXT;

-- Backfill existing activity bookings
UPDATE public.bookings
SET game_id = COALESCE(
  details->>'gameId',
  details->>'game',
  LOWER(REPLACE(title, ' ', '-'))
)
WHERE category = 'activity' AND game_id IS NULL;

-- Index for fast slot lookup
CREATE INDEX IF NOT EXISTS idx_bookings_activity_slot_lookup
ON public.bookings (game_id, date, slot, status)
WHERE category = 'activity';

-- ----------------------------------------------------------------------------
-- STEP 3: Read-only duplicate check query & Partial Unique Index
-- ----------------------------------------------------------------------------
-- ============================================================================
-- AUDIT QUERY (Run this read-only query to inspect duplicate rows before index):
--
-- SELECT user_id, game_id, date, slot, count(*) AS duplicate_count
-- FROM public.bookings
-- WHERE category = 'activity'
--   AND status IN ('Confirmed', 'Pending')
--   AND user_id IS NOT NULL
-- GROUP BY user_id, game_id, date, slot
-- HAVING count(*) > 1;
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_user_activity_booking
ON public.bookings (user_id, game_id, date, slot)
WHERE category = 'activity' AND status IN ('Confirmed', 'Pending') AND user_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- STEP 4: RPC get_slot_availability(p_game_id, p_date)
--         Callable by authenticated & anon users.
--         Returns ONLY slot, slot_range, capacity, booked_count, remaining, status.
--         ZERO personal user data or other users' rows exposed.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_slot_availability(
  p_game_id TEXT,
  p_date DATE
)
RETURNS TABLE (
  slot TEXT,
  slot_range TEXT,
  capacity INTEGER,
  booked_count INTEGER,
  remaining INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_game public.activity_games;
  v_open_min INTEGER;
  v_close_min INTEGER;
  v_step_min INTEGER;
  v_curr_min INTEGER;
  v_slot_start TEXT;
  v_slot_end TEXT;
  v_slot_range TEXT;
  v_booked INTEGER;
  v_remaining INTEGER;
  v_status TEXT;
  v_is_today BOOLEAN;
  v_is_past_day BOOLEAN;
  v_now_min INTEGER;
  v_ist_now TIMESTAMP;
BEGIN
  -- 1. Load active game configuration
  SELECT * INTO v_game
  FROM public.activity_games
  WHERE id = p_game_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GAME_NOT_FOUND: Activity "%" not found or inactive.', p_game_id;
  END IF;

  -- 2. Timezone-aware date calculations (Asia/Kolkata)
  v_ist_now := NOW() AT TIME ZONE 'Asia/Kolkata';
  v_is_past_day := (p_date < v_ist_now::DATE);
  v_is_today := (p_date = v_ist_now::DATE);
  v_now_min := EXTRACT(HOUR FROM v_ist_now)::INTEGER * 60 + EXTRACT(MINUTE FROM v_ist_now)::INTEGER;

  v_open_min := v_game.open_hour * 60;
  v_close_min := v_game.close_hour * 60;
  v_step_min := COALESCE(v_game.slot_minutes, 60);
  IF v_step_min <= 0 THEN v_step_min := 60; END IF;

  v_curr_min := v_open_min;
  WHILE (v_curr_min + v_step_min) <= v_close_min LOOP
    v_slot_start := LPAD((v_curr_min / 60)::TEXT, 2, '0') || ':' || LPAD((v_curr_min % 60)::TEXT, 2, '0');
    v_slot_end := LPAD(((v_curr_min + v_step_min) / 60)::TEXT, 2, '0') || ':' || LPAD(((v_curr_min + v_step_min) % 60)::TEXT, 2, '0');
    v_slot_range := v_slot_start || ' – ' || v_slot_end;

    -- 3. Calculate booked count from active confirmed/pending bookings
    IF v_game.is_group_capacity THEN
      SELECT COALESCE(SUM(b.players), 0)::INTEGER INTO v_booked
      FROM public.bookings b
      WHERE (b.game_id = p_game_id OR (b.game_id IS NULL AND b.category = 'activity' AND LOWER(REPLACE(b.title, ' ', '-')) = p_game_id))
        AND (b.date = TO_CHAR(p_date, 'YYYY-MM-DD') OR b.date = p_date::TEXT)
        AND b.slot = v_slot_start
        AND b.category = 'activity'
        AND b.status IN ('Confirmed', 'Pending');
    ELSE
      SELECT COUNT(b.id)::INTEGER INTO v_booked
      FROM public.bookings b
      WHERE (b.game_id = p_game_id OR (b.game_id IS NULL AND b.category = 'activity' AND LOWER(REPLACE(b.title, ' ', '-')) = p_game_id))
        AND (b.date = TO_CHAR(p_date, 'YYYY-MM-DD') OR b.date = p_date::TEXT)
        AND b.slot = v_slot_start
        AND b.category = 'activity'
        AND b.status IN ('Confirmed', 'Pending');
    END IF;

    -- 4. Calculate remaining and status
    v_remaining := GREATEST(0, v_game.capacity_per_slot - v_booked);

    -- If past date or earlier today (15-min booking buffer), mark full/unavailable
    IF v_is_past_day OR (v_is_today AND v_curr_min <= (v_now_min + 15)) THEN
      v_remaining := 0;
      v_status := 'full';
    ELSIF v_remaining = 0 THEN
      v_status := 'full';
    ELSIF v_remaining <= 3 THEN
      v_status := 'almost_full';
    ELSE
      v_status := 'available';
    END IF;

    slot := v_slot_start;
    slot_range := v_slot_range;
    capacity := v_game.capacity_per_slot;
    booked_count := v_booked;
    remaining := v_remaining;
    status := v_status;
    RETURN NEXT;

    v_curr_min := v_curr_min + v_step_min;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_slot_availability(TEXT, DATE) TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- STEP 5: RPC create_activity_booking
--         Requires auth.uid().
--         Advisory lock on (game_id, date, slot) serializes concurrent attempts.
--         Enforces:
--           - Date not in past & valid operating slot
--           - ALREADY_BOOKED if same user has active booking
--           - SLOT_FULL if remaining capacity < players (or < 1 for exclusive)
--           - Server-side price calculation with 30% member discount
--           - Atomically creates booking & payment record
--           - Returns inserted public.bookings row
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_activity_booking(
  p_game_id TEXT,
  p_date DATE,
  p_slot TEXT,
  p_players INTEGER DEFAULT 1,
  p_user_name TEXT DEFAULT NULL,
  p_mobile TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'upi',
  p_details JSONB DEFAULT '{}'::JSONB
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_game public.activity_games;
  v_ist_now TIMESTAMP;
  v_is_today BOOLEAN;
  v_now_min INTEGER;
  v_slot_min INTEGER;
  v_players INTEGER;
  v_booked_units INTEGER;
  v_remaining INTEGER;
  v_is_member BOOLEAN := false;
  v_hours INTEGER := 1;
  v_sessions INTEGER := 1;
  v_base_rate NUMERIC;
  v_subtotal NUMERIC := 0;
  v_discount NUMERIC := 0;
  v_amount NUMERIC := 0;
  v_booking_ref TEXT;
  v_payment_id TEXT;
  v_new_booking public.bookings;
BEGIN
  -- 1. Ensure caller is authenticated
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required to book an activity.';
  END IF;

  -- 2. Validate game exists and lock row for update to ensure atomic check & insert
  SELECT * INTO v_game
  FROM public.activity_games
  WHERE id = p_game_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GAME_NOT_FOUND: Activity "%" not found or inactive.', p_game_id;
  END IF;

  -- 3. Validate date and slot time
  v_ist_now := NOW() AT TIME ZONE 'Asia/Kolkata';
  IF p_date < v_ist_now::DATE THEN
    RAISE EXCEPTION 'INVALID_DATE: Reservation date cannot be in the past.';
  END IF;

  v_is_today := (p_date = v_ist_now::DATE);
  v_now_min := EXTRACT(HOUR FROM v_ist_now)::INTEGER * 60 + EXTRACT(MINUTE FROM v_ist_now)::INTEGER;

  -- Parse slot HH:MM to minutes
  v_slot_min := (SPLIT_PART(p_slot, ':', 1)::INTEGER * 60) + (SPLIT_PART(p_slot, ':', 2)::INTEGER);
  IF v_is_today AND v_slot_min <= (v_now_min + 15) THEN
    RAISE EXCEPTION 'This slot is no longer available';
  END IF;

  IF v_slot_min < (v_game.open_hour * 60) OR (v_slot_min + v_game.slot_minutes) > (v_game.close_hour * 60) THEN
    RAISE EXCEPTION 'INVALID_SLOT: Slot % is outside operating hours for %.', p_slot, v_game.name;
  END IF;

  v_players := GREATEST(1, COALESCE(p_players, 1));

  -- 4. Transaction-level advisory lock on (game_id, date, slot)
  PERFORM pg_advisory_xact_lock(hashtext(p_game_id), hashtext(TO_CHAR(p_date, 'YYYY-MM-DD') || ':' || p_slot));

  -- 5. ALREADY_BOOKED check: Ensure this user does not already have an active booking
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE user_id = v_uid
      AND (game_id = p_game_id OR (category = 'activity' AND LOWER(REPLACE(title, ' ', '-')) = p_game_id))
      AND (date = TO_CHAR(p_date, 'YYYY-MM-DD') OR date = p_date::TEXT)
      AND slot = p_slot
      AND category = 'activity'
      AND status IN ('Confirmed', 'Pending')
  ) THEN
    RAISE EXCEPTION 'This slot is no longer available';
  END IF;

  -- 6. SLOT_FULL check: Verify remaining capacity
  IF v_game.is_group_capacity THEN
    SELECT COALESCE(SUM(b.players), 0)::INTEGER INTO v_booked_units
    FROM public.bookings b
    WHERE (b.game_id = p_game_id OR (category = 'activity' AND LOWER(REPLACE(b.title, ' ', '-')) = p_game_id))
      AND (b.date = TO_CHAR(p_date, 'YYYY-MM-DD') OR b.date = p_date::TEXT)
      AND b.slot = p_slot
      AND b.category = 'activity'
      AND b.status IN ('Confirmed', 'Pending');

    v_remaining := v_game.capacity_per_slot - v_booked_units;
    IF v_remaining < v_players THEN
      RAISE EXCEPTION 'This slot is no longer available';
    END IF;
  ELSE
    SELECT COUNT(b.id)::INTEGER INTO v_booked_units
    FROM public.bookings b
    WHERE (b.game_id = p_game_id OR (category = 'activity' AND LOWER(REPLACE(b.title, ' ', '-')) = p_game_id))
      AND (b.date = TO_CHAR(p_date, 'YYYY-MM-DD') OR b.date = p_date::TEXT)
      AND b.slot = p_slot
      AND b.category = 'activity'
      AND b.status IN ('Confirmed', 'Pending');

    v_remaining := v_game.capacity_per_slot - v_booked_units;
    IF v_remaining < 1 THEN
      RAISE EXCEPTION 'This slot is no longer available';
    END IF;
  END IF;

  -- 7. Server-side price calculation
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = v_uid AND status IN ('active', 'Active', 'approved', 'Approved')
  ) INTO v_is_member;

  v_base_rate := v_game.price;
  IF p_game_id = 'swimming-pool' THEN
    v_hours := GREATEST(1, COALESCE((p_details->'extras'->>'hours')::INTEGER, (p_details->>'hours')::INTEGER, 1));
    v_subtotal := v_base_rate * v_hours;
  ELSIF p_game_id = 'luxury-gym' THEN
    IF (p_details->'extras'->>'tier') = 'premium' OR (p_details->>'tier') = 'premium' THEN
      v_subtotal := 3000;
    ELSE
      v_subtotal := 2000;
    END IF;
  ELSE
    v_sessions := GREATEST(1, COALESCE((p_details->'extras'->>'sessions')::INTEGER, (p_details->>'sessions')::INTEGER, 1));
    v_subtotal := v_base_rate * v_sessions;
  END IF;

  -- Equipment rental add-on
  IF COALESCE((p_details->>'equipment')::BOOLEAN, false) = true THEN
    v_subtotal := v_subtotal + COALESCE((p_details->>'rentalPrice')::NUMERIC, 50);
  END IF;

  -- Member discount (30%)
  IF v_is_member THEN
    v_discount := ROUND(v_subtotal * 0.30, 2);
  ELSE
    v_discount := 0;
  END IF;
  v_amount := v_subtotal - v_discount;

  -- 8. Generate booking reference code
  v_booking_ref := 'FRCC-ACT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

  -- 9. Insert into public.bookings table
  INSERT INTO public.bookings (
    booking_id,
    user_id,
    game_id,
    category,
    title,
    date,
    slot,
    players,
    details,
    subtotal,
    discount,
    amount,
    payment_method,
    is_member,
    status,
    user_name,
    mobile,
    email,
    created_at,
    updated_at
  ) VALUES (
    v_booking_ref,
    v_uid,
    p_game_id,
    'activity',
    v_game.name,
    TO_CHAR(p_date, 'YYYY-MM-DD'),
    p_slot,
    v_players,
    COALESCE(p_details, '{}'::JSONB),
    v_subtotal,
    v_discount,
    v_amount,
    COALESCE(p_payment_method, 'upi'),
    v_is_member,
    CASE WHEN p_payment_method = 'pay_at_venue' THEN 'Pending' ELSE 'Confirmed' END,
    p_user_name,
    p_mobile,
    p_email,
    NOW(),
    NOW()
  ) RETURNING * INTO v_new_booking;

  -- 10. Record payment in public.payments
  v_payment_id := 'PAY-' || LPAD(FLOOR(RANDOM() * 90000 + 10000)::TEXT, 5, '0');
  INSERT INTO public.payments (
    payment_id,
    booking_id,
    user_id,
    method,
    amount,
    status,
    created_at
  ) VALUES (
    v_payment_id,
    v_booking_ref,
    v_uid,
    COALESCE(p_payment_method, 'upi'),
    v_amount,
    CASE WHEN p_payment_method = 'pay_at_venue' THEN 'Pending' ELSE 'Success' END,
    NOW()
  );

  RETURN v_new_booking;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_activity_booking(
  TEXT, DATE, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB
) TO authenticated;

-- ----------------------------------------------------------------------------
-- STEP 6: RPC cancel_activity_booking
--         Frees the slot capacity immediately by marking status = 'Cancelled'.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_activity_booking(
  p_booking_id TEXT
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_booking public.bookings;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required to cancel an activity booking.';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE booking_id = p_booking_id
    AND (user_id = v_uid OR public.is_admin())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND: Booking not found or unauthorized.';
  END IF;

  IF v_booking.status = 'Cancelled' THEN
    RETURN v_booking;
  END IF;

  UPDATE public.bookings
  SET status = 'Cancelled',
      updated_at = NOW()
  WHERE booking_id = p_booking_id
  RETURNING * INTO v_booking;

  -- Update associated payment if pending
  UPDATE public.payments
  SET status = 'Cancelled'
  WHERE booking_id = p_booking_id AND status = 'Pending';

  RETURN v_booking;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_activity_booking(TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- STEP 7: Restrict direct client inserts for category = 'activity'
--         Activity bookings MUST be created via create_activity_booking RPC.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;
CREATE POLICY "Users can insert own bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = (SELECT auth.uid()) OR public.is_admin())
    AND category <> 'activity'
  );

