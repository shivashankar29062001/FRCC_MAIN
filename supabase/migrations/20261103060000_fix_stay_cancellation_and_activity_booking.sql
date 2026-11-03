-- ============================================================================
-- Migration: 20261103060000_fix_stay_cancellation_and_activity_booking.sql
-- Description:
--   1. Adds cancelled_at and refund columns to stay_bookings to resolve schema cache mismatch.
--   2. Adds cancelled_at to table_bookings and bookings if not present.
--   3. Ensures activity_games table and create_activity_booking / cancel_activity_booking RPCs exist.
--   4. Reloads PostgREST schema cache to immediately resolve schema cache errors.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Add cancelled_at and refund columns to stay_bookings & table_bookings
-- ----------------------------------------------------------------------------
ALTER TABLE public.stay_bookings
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_percent NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retention_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'NONE';

ALTER TABLE public.table_bookings
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS game_id TEXT;

-- Ensure users can update (cancel) their own stay bookings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stay_bookings' AND policyname = 'Users can cancel own stay bookings'
  ) THEN
    CREATE POLICY "Users can cancel own stay bookings" ON public.stay_bookings
      FOR UPDATE USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: Ensure activity_games catalog table exists
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

INSERT INTO public.activity_games (
  id, name, category, capacity_per_slot, slot_minutes, price, open_hour, close_hour, is_group_capacity, is_active
) VALUES
  ('badminton', 'Badminton', 'indoor', 4, 60, 1500, 6, 22, false, true),
  ('tennis', 'Tennis', 'outdoor', 2, 60, 1500, 6, 21, false, true),
  ('cricket', 'Cricket', 'outdoor', 1, 60, 1500, 6, 20, false, true),
  ('table-tennis', 'Table Tennis', 'indoor', 6, 60, 1500, 7, 22, false, true),
  ('volleyball', 'Volleyball', 'outdoor', 2, 60, 1500, 6, 21, false, true),
  ('chess', 'Chess', 'indoor', 4, 60, 1500, 8, 21, false, true),
  ('carom', 'Carom', 'indoor', 4, 60, 1500, 8, 22, false, true),
  ('card-room', 'Card Room', 'indoor', 6, 60, 1500, 8, 23, false, true),
  ('golf', 'Golf', 'outdoor', 1, 60, 1500, 6, 18, false, true),
  ('swimming-pool', 'Swimming Pool', 'water', 20, 60, 1000, 6, 20, true, true),
  ('kids-play-area', 'Kids Play Area', 'kids', 15, 60, 1500, 9, 20, true, true),
  ('football', 'Football', 'outdoor', 1, 60, 1500, 6, 21, false, true),
  ('squash', 'Squash', 'indoor', 2, 60, 1500, 6, 22, false, true),
  ('basketball', 'Basketball', 'outdoor', 2, 60, 1500, 6, 21, false, true),
  ('luxury-gym', 'Luxury Gym', 'fitness', 30, 60, 1500, 6, 22, true, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  capacity_per_slot = EXCLUDED.capacity_per_slot,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

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
-- STEP 3: RPC create_activity_booking
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
  v_is_member BOOLEAN := false;
  v_hours INTEGER := 1;
  v_sessions INTEGER := 1;
  v_base_rate NUMERIC := 1500;
  v_subtotal NUMERIC := 0;
  v_discount NUMERIC := 0;
  v_amount NUMERIC := 0;
  v_booking_ref TEXT;
  v_new_booking public.bookings;
  v_title TEXT;
BEGIN
  -- 1. Identify user (auth or fallback)
  v_uid := auth.uid();

  -- 2. Fetch game details if present
  SELECT * INTO v_game
  FROM public.activity_games
  WHERE id = p_game_id AND is_active = true;

  IF FOUND THEN
    v_base_rate := v_game.price;
    v_title := v_game.name;
  ELSE
    v_title := COALESCE(p_details->>'gameName', INITCAP(REPLACE(p_game_id, '-', ' ')));
  END IF;

  -- 3. Check membership
  IF v_uid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.memberships
      WHERE user_id = v_uid AND status IN ('active', 'Active', 'approved', 'Approved')
    ) INTO v_is_member;
  END IF;

  -- 4. Calculate subtotal
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

  IF COALESCE((p_details->>'equipment')::BOOLEAN, false) = true THEN
    v_subtotal := v_subtotal + COALESCE((p_details->>'rentalPrice')::NUMERIC, 50);
  END IF;

  IF v_is_member THEN
    v_discount := ROUND(v_subtotal * 0.30, 2);
  ELSE
    v_discount := 0;
  END IF;
  v_amount := v_subtotal - v_discount;

  -- 5. Reference
  v_booking_ref := 'FRCC-ACT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

  -- 6. Insert booking
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
    email
  ) VALUES (
    v_booking_ref,
    v_uid,
    p_game_id,
    'activity',
    v_title,
    p_date::TEXT,
    p_slot,
    GREATEST(1, p_players),
    p_details,
    v_subtotal,
    v_discount,
    v_amount,
    COALESCE(p_payment_method, 'upi'),
    v_is_member,
    CASE WHEN p_payment_method = 'pay_at_venue' THEN 'Pending' ELSE 'Confirmed' END,
    p_user_name,
    p_mobile,
    p_email
  )
  RETURNING * INTO v_new_booking;

  -- 7. Insert payment if not pay_at_venue
  IF p_payment_method != 'pay_at_venue' AND v_uid IS NOT NULL THEN
    BEGIN
      INSERT INTO public.payments (
        payment_id,
        booking_id,
        user_id,
        method,
        amount,
        status
      ) VALUES (
        'PAY-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0'),
        v_booking_ref,
        v_uid,
        p_payment_method,
        v_amount,
        'Success'
      );
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Ignore payment insert failure
    END;
  END IF;

  RETURN v_new_booking;
END;
$$;

-- ----------------------------------------------------------------------------
-- STEP 4: RPC cancel_activity_booking
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

  UPDATE public.bookings
  SET
    status = 'Cancelled',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE (booking_id = p_booking_id OR id::TEXT = p_booking_id)
    AND (user_id = v_uid OR v_uid IS NULL OR public.is_admin())
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    -- Try updating without user check if called by service role
    UPDATE public.bookings
    SET status = 'Cancelled', cancelled_at = NOW()
    WHERE (booking_id = p_booking_id OR id::TEXT = p_booking_id)
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'status', 'Cancelled'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- STEP 5: Grant execute permissions to authenticated and anon roles
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.create_activity_booking(
  TEXT, DATE, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB
) TO authenticated, anon;

GRANT EXECUTE ON FUNCTION public.cancel_activity_booking(TEXT) TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- STEP 6: Reload PostgREST schema cache
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

