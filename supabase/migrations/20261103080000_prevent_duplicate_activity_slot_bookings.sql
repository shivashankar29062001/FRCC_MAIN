-- ============================================================================
-- Migration: 20261103080000_prevent_duplicate_activity_slot_bookings.sql
-- Description:
--   1. Ensures game_id is populated on all activity bookings.
--   2. De-duplicates historical active duplicates by marking them Cancelled.
--   3. Adds a partial unique index on (game_id, date, slot) for active bookings
--      so Postgres physically rejects duplicate slot reservations.
--   4. Re-creates create_activity_booking RPC with atomic FOR UPDATE row locking,
--      transaction-level advisory locking, availability pre-check, and exception
--      handling on unique_violation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Backfill game_id on public.bookings
-- ----------------------------------------------------------------------------
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS game_id TEXT;

UPDATE public.bookings
SET game_id = COALESCE(
  game_id,
  details->>'gameId',
  details->>'game',
  LOWER(REPLACE(title, ' ', '-'))
)
WHERE category = 'activity' AND game_id IS NULL;

-- ----------------------------------------------------------------------------
-- STEP 2: Cancel any pre-existing duplicate active bookings before index creation
-- ----------------------------------------------------------------------------
WITH ranked_duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY game_id, date, slot
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.bookings
  WHERE category = 'activity'
    AND status IN ('Confirmed', 'Pending', 'confirmed', 'pending')
    AND game_id IS NOT NULL
    AND slot IS NOT NULL
)
UPDATE public.bookings
SET status = 'Cancelled',
    cancelled_at = COALESCE(cancelled_at, NOW())
WHERE id IN (
  SELECT id FROM ranked_duplicates WHERE rn > 1
);

-- ----------------------------------------------------------------------------
-- STEP 3: Create partial unique index on (game_id, date, slot)
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_activity_slot_booking
ON public.bookings (game_id, date, slot)
WHERE category = 'activity'
  AND status IN ('Confirmed', 'Pending', 'confirmed', 'pending')
  AND game_id IS NOT NULL
  AND slot IS NOT NULL;

-- ----------------------------------------------------------------------------
-- STEP 4: Atomic create_activity_booking RPC with row lock & constraint protection
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
  v_date_str TEXT;
BEGIN
  -- 1. Identify user (authenticated caller or fallback)
  v_uid := auth.uid();
  v_date_str := p_date::TEXT;

  -- 2. Validate game and acquire row-level lock FOR UPDATE
  SELECT * INTO v_game
  FROM public.activity_games
  WHERE id = p_game_id AND is_active = true
  FOR UPDATE;

  IF FOUND THEN
    v_base_rate := v_game.price;
    v_title := v_game.name;
  ELSE
    v_title := COALESCE(p_details->>'gameName', INITCAP(REPLACE(p_game_id, '-', ' ')));
  END IF;

  -- 3. Acquire transaction-level advisory lock on (game_id, date, slot)
  PERFORM pg_advisory_xact_lock(hashtext(p_game_id), hashtext(v_date_str || ':' || p_slot));

  -- 4. Atomic availability check: Reject if an active booking already occupies this slot
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE (game_id = p_game_id OR (category = 'activity' AND LOWER(REPLACE(title, ' ', '-')) = p_game_id))
      AND (date = v_date_str OR date = TO_CHAR(p_date, 'YYYY-MM-DD'))
      AND slot = p_slot
      AND category = 'activity'
      AND status IN ('Confirmed', 'Pending', 'confirmed', 'pending')
  ) THEN
    RAISE EXCEPTION 'This slot is no longer available';
  END IF;

  -- 5. Membership check
  IF v_uid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.memberships
      WHERE user_id = v_uid AND status IN ('active', 'Active', 'approved', 'Approved')
    ) INTO v_is_member;
  END IF;

  -- 6. Price calculation
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

  -- 7. Generate unique booking reference
  v_booking_ref := 'FRCC-ACT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

  -- 8. Atomic insert with unique_violation guard
  BEGIN
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
      v_date_str,
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
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'This slot is no longer available';
  END;

  -- 9. Insert payment record if non-venue payment and user is authenticated
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
      NULL;
    END;
  END IF;

  RETURN v_new_booking;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_activity_booking(TEXT, DATE, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';

