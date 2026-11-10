-- ============================================================================
-- Migration: 20261110030000_hall_bookings_hold_and_rpcs.sql
-- Description:
--   1. Adds hold/timestamp/payment metadata columns to convention_bookings.
--   2. Keeps start_at & end_at (Asia/Kolkata) synchronized via trigger.
--   3. Ensures all convention_halls (VH33..VH42-NAC & VH43..VH52) are seeded
--      with authoritative capacity and pricing rules.
--   4. Locks down convention_bookings with owner-only SELECT RLS (no direct
--      client INSERT, UPDATE, or DELETE).
--   5. Adds SECURITY DEFINER RPCs:
--        - get_hall_availability(p_hall_id, p_date)
--        - create_hall_booking(...)
--        - confirm_hall_booking(...)
--        - expire_hall_hold(p_booking_id)
--        - mark_hall_booking_paid(p_booking_id)
--      and updates cancel_hall_booking(p_booking_id) to set status = 'cancelled'.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Ensure convention_venues & convention_halls support server-side pricing
-- ----------------------------------------------------------------------------
INSERT INTO public.convention_venues (id, name, city, area, address, phone, email)
VALUES
  ('VG13', 'Hyderabad Club', 'Hyderabad', 'City Centre', 'Road No. 1, Banjara Hills, Hyderabad, Telangana – 500034', '+91 73967 44556', 'hyderabad.club@frcc.club'),
  ('VG14', 'Vijayawada Club', 'Vijayawada', 'City Centre', 'D.No. 24-29-210A, Durgapuram, Gulabithota Road, Vijayawada, AP – 520003', '+91 78936 16262', 'vijayawada.club@frcc.club')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.convention_halls
  ADD COLUMN IF NOT EXISTS pricing_unit TEXT DEFAULT 'per-hour',
  ADD COLUMN IF NOT EXISTS price_per_plate NUMERIC(10, 2);

INSERT INTO public.convention_halls (id, venue_id, name, capacity, price_per_hour, pricing_unit, price_per_plate)
VALUES
  -- Hyderabad Club (conventionData.js IDs)
  ('VH33',     'VG13', 'Board Room (AC)',           100,   2000,  'per-hour',  NULL),
  ('VH33-NAC', 'VG13', 'Board Room (Non-AC)',       100,   2000,  'per-hour',  NULL),
  ('VH34',     'VG13', 'Meeting Room (AC)',         200,   3000,  'per-hour',  NULL),
  ('VH34-NAC', 'VG13', 'Meeting Room (Non-AC)',     200,   3000,  'per-hour',  NULL),
  ('VH35',     'VG13', 'Conference Room (AC)',      300,   6000,  'per-hour',  NULL),
  ('VH35-NAC', 'VG13', 'Conference Room (Non-AC)',  300,   6000,  'per-hour',  NULL),
  ('VH36',     'VG13', 'Convention Hall (AC)',      10000, 1500,  'per-plate', 1500),
  ('VH36-NAC', 'VG13', 'Convention Hall (Non-AC)',  10000, 1500,  'per-plate', 1500),
  ('VH37',     'VG13', 'Banquet Hall (AC)',         1500,  18000, 'per-hour',  NULL),
  ('VH37-NAC', 'VG13', 'Banquet Hall (Non-AC)',     1500,  18000, 'per-hour',  NULL),
  -- Vijayawada Club (conventionData.js IDs)
  ('VH38',     'VG14', 'Board Room (AC)',           100,   2000,  'per-hour',  NULL),
  ('VH38-NAC', 'VG14', 'Board Room (Non-AC)',       100,   2000,  'per-hour',  NULL),
  ('VH39',     'VG14', 'Meeting Room (AC)',         200,   3000,  'per-hour',  NULL),
  ('VH39-NAC', 'VG14', 'Meeting Room (Non-AC)',     200,   3000,  'per-hour',  NULL),
  ('VH40',     'VG14', 'Conference Room (AC)',      300,   6000,  'per-hour',  NULL),
  ('VH40-NAC', 'VG14', 'Conference Room (Non-AC)',  300,   6000,  'per-hour',  NULL),
  ('VH41',     'VG14', 'Convention Hall (AC)',      10000, 1500,  'per-plate', 1500),
  ('VH41-NAC', 'VG14', 'Convention Hall (Non-AC)',  10000, 1500,  'per-plate', 1500),
  ('VH42',     'VG14', 'Banquet Hall (AC)',         1500,  18000, 'per-hour',  NULL),
  ('VH42-NAC', 'VG14', 'Banquet Hall (Non-AC)',     1500,  18000, 'per-hour',  NULL),
  -- Express catalog Non-AC IDs (supported if Express /api/halls serves them)
  ('VH43',     'VG13', 'Board Room (Non-AC)',       100,   1500,  'per-hour',  NULL),
  ('VH44',     'VG13', 'Meeting Room (Non-AC)',     200,   2250,  'per-hour',  NULL),
  ('VH45',     'VG13', 'Conference Room (Non-AC)',  300,   4500,  'per-hour',  NULL),
  ('VH46',     'VG13', 'Convention Room (Non-AC)',  10000, 18750, 'per-hour',  NULL),
  ('VH47',     'VG13', 'Banquet Hall (Non-AC)',     1500,  13500, 'per-hour',  NULL),
  ('VH48',     'VG14', 'Board Room (Non-AC)',       100,   1500,  'per-hour',  NULL),
  ('VH49',     'VG14', 'Meeting Room (Non-AC)',     200,   2250,  'per-hour',  NULL),
  ('VH50',     'VG14', 'Conference Room (Non-AC)',  300,   4500,  'per-hour',  NULL),
  ('VH51',     'VG14', 'Convention Room (Non-AC)',  10000, 18750, 'per-hour',  NULL),
  ('VH52',     'VG14', 'Banquet Hall (Non-AC)',     1500,  13500, 'per-hour',  NULL)
ON CONFLICT (id) DO UPDATE SET
  venue_id        = EXCLUDED.venue_id,
  name            = EXCLUDED.name,
  capacity        = EXCLUDED.capacity,
  price_per_hour  = EXCLUDED.price_per_hour,
  pricing_unit    = EXCLUDED.pricing_unit,
  price_per_plate = EXCLUDED.price_per_plate;

-- ----------------------------------------------------------------------------
-- STEP 2: Add missing columns to public.convention_bookings (reuse existing)
-- ----------------------------------------------------------------------------
ALTER TABLE public.convention_bookings
  ADD COLUMN IF NOT EXISTS cancelled_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_percent     NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_amount      NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_status      TEXT DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS cooling            TEXT DEFAULT 'AC',
  ADD COLUMN IF NOT EXISTS hold_expires_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS venue_name         TEXT,
  ADD COLUMN IF NOT EXISTS city_name          TEXT,
  ADD COLUMN IF NOT EXISTS area_name          TEXT,
  ADD COLUMN IF NOT EXISTS payment_status     TEXT,
  ADD COLUMN IF NOT EXISTS masked_instrument  TEXT,
  ADD COLUMN IF NOT EXISTS emi_tenure         INTEGER,
  ADD COLUMN IF NOT EXISTS emi_monthly_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS gstin              TEXT,
  ADD COLUMN IF NOT EXISTS utr_number         TEXT,
  ADD COLUMN IF NOT EXISTS refund_method      TEXT;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'convention_bookings_refund_status_chk'
  ) THEN
    ALTER TABLE public.convention_bookings
      ADD CONSTRAINT convention_bookings_refund_status_chk
      CHECK (refund_status IN ('NONE', 'PENDING', 'PROCESSED', 'NOT_APPLICABLE'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'convention_bookings_guests_bounds_chk'
  ) THEN
    ALTER TABLE public.convention_bookings
      ADD CONSTRAINT convention_bookings_guests_bounds_chk
      CHECK (guests >= 30 AND guests <= 10000) NOT VALID;
  END IF;
END $$;

-- Drop old table-level status check constraints (excluding refund_status)
ALTER TABLE public.convention_bookings
  DROP CONSTRAINT IF EXISTS convention_bookings_status_check,
  DROP CONSTRAINT IF EXISTS convention_bookings_status_chk;

DO $$
DECLARE
  v_con RECORD;
BEGIN
  FOR v_con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.convention_bookings'::regclass
      AND contype = 'c'
      AND conname <> 'convention_bookings_refund_status_chk'
      AND pg_get_constraintdef(oid) ~* '\ystatus\y'
      AND pg_get_constraintdef(oid) NOT ILIKE '%refund_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.convention_bookings DROP CONSTRAINT IF EXISTS %I', v_con.conname);
  END LOOP;
END $$;

ALTER TABLE public.convention_bookings
  ADD CONSTRAINT convention_bookings_status_chk
  CHECK (LOWER(status) IN ('held', 'confirmed', 'pending_verification', 'cancelled', 'expired', 'completed')) NOT VALID;

-- Replace the legacy conflict trigger with a clean timestamp sync trigger
DROP TRIGGER IF EXISTS trg_prevent_hall_double_booking ON public.convention_bookings;

CREATE OR REPLACE FUNCTION public.sync_convention_booking_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.date IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.start_at := (NEW.date::date + NEW.start_time::time) AT TIME ZONE 'Asia/Kolkata';
  END IF;
  IF NEW.date IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    NEW.end_at := (NEW.date::date + NEW.end_time::time) AT TIME ZONE 'Asia/Kolkata';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_convention_bookings_sync_timestamps ON public.convention_bookings;
CREATE TRIGGER trg_convention_bookings_sync_timestamps
  BEFORE INSERT OR UPDATE ON public.convention_bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_convention_booking_timestamps();

-- Backfill newly added start_at/end_at columns where NULL (does not delete or change status)
UPDATE public.convention_bookings
SET start_at = (date::date + start_time::time) AT TIME ZONE 'Asia/Kolkata',
    end_at   = (date::date + end_time::time) AT TIME ZONE 'Asia/Kolkata'
WHERE (start_at IS NULL OR end_at IS NULL)
  AND date IS NOT NULL
  AND start_time IS NOT NULL
  AND end_time IS NOT NULL;

-- ----------------------------------------------------------------------------
-- STEP 3: Enforce owner-only RLS on public.convention_bookings
--         (Clients cannot directly insert, update, or delete rows; must use RPCs)
-- ----------------------------------------------------------------------------
ALTER TABLE public.convention_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own convention bookings" ON public.convention_bookings;
DROP POLICY IF EXISTS "Users insert convention bookings" ON public.convention_bookings;
DROP POLICY IF EXISTS "Users can select own convention_bookings" ON public.convention_bookings;
DROP POLICY IF EXISTS "Users can insert own convention_bookings" ON public.convention_bookings;
DROP POLICY IF EXISTS "Users can update own convention_bookings" ON public.convention_bookings;
DROP POLICY IF EXISTS "Users can delete own convention_bookings" ON public.convention_bookings;
DROP POLICY IF EXISTS "Admins manage convention_bookings" ON public.convention_bookings;

CREATE POLICY "Users can select own convention_bookings" ON public.convention_bookings
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Admins manage convention_bookings" ON public.convention_bookings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

REVOKE ALL ON public.convention_bookings FROM anon;
GRANT SELECT ON public.convention_bookings TO authenticated;

-- ----------------------------------------------------------------------------
-- STEP 4: RPC get_hall_availability(p_hall_id, p_date)
--         Returns only booked time intervals + is_mine boolean (NO PII).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_hall_availability(
  p_hall_id TEXT,
  p_date DATE
)
RETURNS TABLE (
  start_time TEXT,
  end_time TEXT,
  status TEXT,
  is_mine BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := auth.uid();

  RETURN QUERY
  SELECT
    TO_CHAR(('2000-01-01'::date + b.start_time::time), 'HH24:MI') AS start_time,
    TO_CHAR(('2000-01-01'::date + b.end_time::time), 'HH24:MI')   AS end_time,
    LOWER(b.status)                                               AS status,
    (v_uid IS NOT NULL AND b.user_id = v_uid)                     AS is_mine
  FROM public.convention_bookings b
  WHERE b.hall_id = p_hall_id
    AND b.date::date = p_date
    AND (
      LOWER(b.status) IN ('confirmed', 'pending_verification')
      OR (
        LOWER(b.status) = 'held'
        AND b.hold_expires_at IS NOT NULL
        AND b.hold_expires_at > NOW()
      )
    )
  ORDER BY b.start_time::time ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_hall_availability(TEXT, DATE) TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- STEP 5: RPC create_hall_booking(...)
--         Requires auth.uid(), validates inputs & capacity, calculates price
--         server-side, takes advisory lock on hall_id, expires stale holds,
--         checks overlaps (SLOT_TAKEN / ALREADY_BOOKED_BY_YOU), and creates row
--         with status = 'held' and hold_expires_at = NOW() + INTERVAL '10 minutes'.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_hall_booking(
  p_hall_id TEXT,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_guests INTEGER,
  p_event_type TEXT,
  p_organizer_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_event_details TEXT DEFAULT '',
  p_special_requests TEXT DEFAULT '',
  p_venue_name TEXT DEFAULT NULL,
  p_city_name TEXT DEFAULT NULL,
  p_area_name TEXT DEFAULT NULL,
  p_cooling TEXT DEFAULT NULL,
  p_held_booking_id TEXT DEFAULT NULL
)
RETURNS public.convention_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_ist_now TIMESTAMP;
  v_start_at TIMESTAMPTZ;
  v_end_at TIMESTAMPTZ;
  v_phone TEXT;
  v_hall RECORD;
  v_hours NUMERIC;
  v_hall_charge NUMERIC(10, 2);
  v_gst NUMERIC(10, 2);
  v_total NUMERIC(10, 2);
  v_conflict_uid UUID;
  v_booking_id TEXT;
  v_hold_expires TIMESTAMPTZ;
  v_cooling TEXT;
  v_result public.convention_bookings;
BEGIN
  -- 1. Require authenticated user
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required to book a convention hall.';
  END IF;

  -- 2. Validate date and time range in Asia/Kolkata
  v_ist_now := NOW() AT TIME ZONE 'Asia/Kolkata';
  IF p_date IS NULL OR p_date < v_ist_now::DATE THEN
    RAISE EXCEPTION 'INVALID_DATE: Booking date cannot be in the past.';
  END IF;

  IF p_start_time IS NULL OR p_end_time IS NULL OR p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'INVALID_TIME_RANGE: End time must be after start time.';
  END IF;

  IF p_date = v_ist_now::DATE AND p_start_time <= v_ist_now::TIME THEN
    RAISE EXCEPTION 'INVALID_TIME_RANGE: Selected start time has already passed today.';
  END IF;

  v_start_at := (p_date + p_start_time) AT TIME ZONE 'Asia/Kolkata';
  v_end_at   := (p_date + p_end_time) AT TIME ZONE 'Asia/Kolkata';

  -- 3. Validate organizer, event type, email, and 10-digit Indian mobile
  IF TRIM(COALESCE(p_event_type, '')) = '' THEN
    RAISE EXCEPTION 'INVALID_INPUT: Event type is required.';
  END IF;

  IF TRIM(COALESCE(p_organizer_name, '')) = '' THEN
    RAISE EXCEPTION 'INVALID_INPUT: Organizer name is required.';
  END IF;

  IF TRIM(COALESCE(p_email, '')) !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'INVALID_EMAIL: Enter a valid email address.';
  END IF;

  v_phone := REGEXP_REPLACE(COALESCE(p_phone, ''), '\D', '', 'g');
  IF LENGTH(v_phone) = 12 AND LEFT(v_phone, 2) = '91' THEN
    v_phone := SUBSTRING(v_phone FROM 3);
  ELSIF LENGTH(v_phone) = 11 AND LEFT(v_phone, 1) = '0' THEN
    v_phone := SUBSTRING(v_phone FROM 2);
  END IF;
  IF v_phone !~ '^[6-9][0-9]{9}$' THEN
    RAISE EXCEPTION 'INVALID_MOBILE: Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
  END IF;

  -- 4. Validate hall existence and capacity
  SELECT
    h.*,
    v.name AS joined_venue_name,
    v.city AS joined_city_name,
    v.area AS joined_area_name
  INTO v_hall
  FROM public.convention_halls h
  LEFT JOIN public.convention_venues v ON v.id = h.venue_id
  WHERE h.id = p_hall_id
    AND COALESCE(h.is_active, true) = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'HALL_NOT_FOUND: Selected hall (%) does not exist or is inactive.', p_hall_id;
  END IF;

  IF p_guests IS NULL OR p_guests < 30 OR p_guests > v_hall.capacity THEN
    RAISE EXCEPTION 'INVALID_GUESTS: Guest count must be between 30 and % for %.', v_hall.capacity, v_hall.name;
  END IF;

  -- 5. Server-side amount calculation
  v_hours := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600.0;
  IF COALESCE(v_hall.pricing_unit, 'per-hour') = 'per-plate' AND COALESCE(v_hall.price_per_plate, 0) > 0 THEN
    v_hall_charge := ROUND(p_guests * v_hall.price_per_plate, 0);
  ELSE
    v_hall_charge := ROUND(v_hours * v_hall.price_per_hour, 0);
  END IF;
  v_gst   := ROUND(v_hall_charge * 0.18, 0);
  v_total := v_hall_charge + v_gst;

  v_cooling := COALESCE(
    NULLIF(TRIM(COALESCE(p_cooling, '')), ''),
    CASE WHEN v_hall.id LIKE '%-NAC' OR UPPER(v_hall.name) LIKE '%NON-AC%' THEN 'NON_AC' ELSE 'AC' END
  );

  -- Release caller's previous uncommitted held draft if different slot/hall was picked
  IF NULLIF(TRIM(COALESCE(p_held_booking_id, '')), '') IS NOT NULL THEN
    UPDATE public.convention_bookings
    SET status = 'expired',
        updated_at = NOW()
    WHERE id = p_held_booking_id
      AND user_id = v_uid
      AND LOWER(status) = 'held';
  END IF;

  -- 6. Acquire transaction-level advisory lock on hall_id
  PERFORM pg_advisory_xact_lock(hashtext('hall:' || p_hall_id));

  -- 7. Mark stale held bookings for this hall as expired
  UPDATE public.convention_bookings
  SET status = 'expired',
      updated_at = NOW()
  WHERE hall_id = p_hall_id
    AND LOWER(status) = 'held'
    AND hold_expires_at IS NOT NULL
    AND hold_expires_at <= NOW();

  -- 8. Check for overlapping active bookings
  SELECT b.user_id INTO v_conflict_uid
  FROM public.convention_bookings b
  WHERE b.hall_id = p_hall_id
    AND LOWER(b.status) IN ('held', 'confirmed', 'pending_verification')
    AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange(v_start_at, v_end_at, '[)')
  ORDER BY (b.user_id = v_uid) DESC, b.created_at ASC
  LIMIT 1;

  IF FOUND THEN
    IF v_conflict_uid = v_uid THEN
      RAISE EXCEPTION 'ALREADY_BOOKED_BY_YOU: You already have a booking for this hall at this date and time.';
    ELSE
      RAISE EXCEPTION 'SLOT_TAKEN: This hall is already booked for this date and time. Please choose another time or hall.';
    END IF;
  END IF;

  -- 9. Insert held booking (10-minute payment window)
  v_booking_id := 'FRCC-H-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8));
  v_hold_expires := NOW() + INTERVAL '10 minutes';

  BEGIN
    INSERT INTO public.convention_bookings (
      id,
      user_id,
      hall_id,
      hall_name,
      venue_name,
      city_name,
      area_name,
      cooling,
      date,
      start_time,
      end_time,
      start_at,
      end_at,
      guests,
      event_type,
      event_details,
      organizer_name,
      phone,
      email,
      special_requests,
      hall_charge,
      gst,
      convenience_fee,
      amount,
      amount_paid,
      balance_due,
      payment_status,
      status,
      hold_expires_at,
      created_at,
      updated_at
    ) VALUES (
      v_booking_id,
      v_uid,
      v_hall.id,
      v_hall.name,
      COALESCE(NULLIF(TRIM(COALESCE(p_venue_name, '')), ''), v_hall.joined_venue_name, 'FRCC Club'),
      COALESCE(NULLIF(TRIM(COALESCE(p_city_name, '')), ''), v_hall.joined_city_name, ''),
      COALESCE(NULLIF(TRIM(COALESCE(p_area_name, '')), ''), v_hall.joined_area_name, 'City Centre'),
      v_cooling,
      p_date,
      p_start_time,
      p_end_time,
      v_start_at,
      v_end_at,
      p_guests,
      TRIM(p_event_type),
      COALESCE(p_event_details, ''),
      TRIM(p_organizer_name),
      v_phone,
      LOWER(TRIM(p_email)),
      COALESCE(p_special_requests, ''),
      v_hall_charge,
      v_gst,
      0,
      v_total,
      0,
      v_total,
      'HELD',
      'held',
      v_hold_expires,
      NOW(),
      NOW()
    )
    RETURNING * INTO v_result;
  EXCEPTION
    WHEN exclusion_violation THEN
      RAISE EXCEPTION 'SLOT_TAKEN: This hall was just booked by someone else.';
  END;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_hall_booking(
  TEXT, DATE, TIME, TIME, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

-- ----------------------------------------------------------------------------
-- STEP 6: RPC confirm_hall_booking(...)
--         Confirms an active 'held' booking after payment succeeds.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_hall_booking(
  p_booking_id TEXT,
  p_payment_method TEXT DEFAULT 'UPI_ID',
  p_amount_paid NUMERIC DEFAULT NULL,
  p_transaction_ref TEXT DEFAULT NULL,
  p_masked_instrument TEXT DEFAULT NULL,
  p_emi_tenure INTEGER DEFAULT NULL,
  p_emi_monthly_amount NUMERIC DEFAULT NULL,
  p_gstin TEXT DEFAULT NULL,
  p_utr_number TEXT DEFAULT NULL
)
RETURNS public.convention_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_row public.convention_bookings;
  v_method TEXT;
  v_fee NUMERIC(10, 2);
  v_total NUMERIC(10, 2);
  v_paid NUMERIC(10, 2);
  v_balance NUMERIC(10, 2);
  v_pay_status TEXT;
  v_conflict_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required to confirm booking.';
  END IF;

  SELECT * INTO v_row
  FROM public.convention_bookings
  WHERE id = p_booking_id
    AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND: Held hall booking not found or unauthorized.';
  END IF;

  -- Lock the hall id to serialize with other concurrent operations
  PERFORM pg_advisory_xact_lock(hashtext('hall:' || v_row.hall_id));

  -- Mark stale held bookings for this hall expired
  UPDATE public.convention_bookings
  SET status = 'expired',
      updated_at = NOW()
  WHERE hall_id = v_row.hall_id
    AND LOWER(status) = 'held'
    AND hold_expires_at IS NOT NULL
    AND hold_expires_at <= NOW();

  -- Refresh target row after cleanup
  SELECT * INTO v_row
  FROM public.convention_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  -- Idempotent confirmation if already confirmed with same transaction_ref
  IF LOWER(v_row.status) = 'confirmed' THEN
    IF p_transaction_ref IS NOT NULL AND v_row.transaction_ref = p_transaction_ref THEN
      RETURN v_row;
    END IF;
    RETURN v_row;
  END IF;

  IF LOWER(v_row.status) = 'expired' OR (LOWER(v_row.status) = 'held' AND v_row.hold_expires_at IS NOT NULL AND v_row.hold_expires_at <= NOW()) THEN
    RAISE EXCEPTION 'HOLD_EXPIRED: Your 10-minute slot hold has expired. Please choose your date and time again.';
  END IF;

  IF LOWER(v_row.status) <> 'held' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Booking % cannot be confirmed from status %.', v_row.id, v_row.status;
  END IF;

  -- Double-check no other active booking overlaps
  SELECT b.user_id INTO v_conflict_uid
  FROM public.convention_bookings b
  WHERE b.hall_id = v_row.hall_id
    AND b.id <> v_row.id
    AND LOWER(b.status) IN ('held', 'confirmed', 'pending_verification')
    AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange(v_row.start_at, v_row.end_at, '[)')
  ORDER BY (b.user_id = v_uid) DESC
  LIMIT 1;

  IF FOUND THEN
    IF v_conflict_uid = v_uid THEN
      RAISE EXCEPTION 'ALREADY_BOOKED_BY_YOU: You already have a booking for this hall at this date and time.';
    ELSE
      RAISE EXCEPTION 'SLOT_TAKEN: This time was just booked by someone else.';
    END IF;
  END IF;

  -- Server-side fee & payment totals calculation
  v_method := UPPER(COALESCE(NULLIF(TRIM(p_payment_method), ''), 'UPI_ID'));
  v_fee := CASE WHEN v_method = 'WALLET' THEN 9 ELSE 0 END;
  v_total := v_row.hall_charge + v_row.gst + v_fee;

  IF v_method IN ('BANK_TRANSFER', 'CORPORATE_INVOICE') THEN
    v_paid := 0;
    v_balance := v_total;
    v_pay_status := 'PENDING_VERIFICATION';
  ELSIF v_method = 'ADVANCE_PAY_AT_VENUE' THEN
    v_paid := LEAST(v_total, GREATEST(ROUND(v_total * 0.25, 0), ROUND(COALESCE(p_amount_paid, v_total * 0.25), 0)));
    v_balance := GREATEST(0, v_total - v_paid);
    v_pay_status := CASE WHEN v_balance > 0 THEN 'PARTIAL' ELSE 'PAID' END;
  ELSE
    v_paid := v_total;
    v_balance := 0;
    v_pay_status := 'PAID';
  END IF;

  BEGIN
    UPDATE public.convention_bookings
    SET status             = 'confirmed',
        hold_expires_at    = NULL,
        convenience_fee    = v_fee,
        amount             = v_total,
        amount_paid        = v_paid,
        balance_due        = v_balance,
        payment_method     = v_method,
        payment_status     = v_pay_status,
        payment_id         = COALESCE(NULLIF(TRIM(COALESCE(p_transaction_ref, '')), ''), payment_id),
        transaction_ref    = COALESCE(NULLIF(TRIM(COALESCE(p_transaction_ref, '')), ''), 'TXN-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8))),
        masked_instrument  = COALESCE(p_masked_instrument, masked_instrument),
        emi_tenure         = p_emi_tenure,
        emi_monthly_amount = p_emi_monthly_amount,
        gstin              = p_gstin,
        utr_number         = p_utr_number,
        updated_at         = NOW()
    WHERE id = v_row.id
    RETURNING * INTO v_row;
  EXCEPTION
    WHEN exclusion_violation THEN
      RAISE EXCEPTION 'SLOT_TAKEN: This time was just booked by someone else.';
  END;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_hall_booking(
  TEXT, TEXT, NUMERIC, TEXT, TEXT, INTEGER, NUMERIC, TEXT, TEXT
) TO authenticated;

-- ----------------------------------------------------------------------------
-- STEP 7: RPC expire_hall_hold(p_booking_id)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_hall_hold(
  p_booking_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'UNAUTHORIZED');
  END IF;

  UPDATE public.convention_bookings
  SET status = 'expired',
      updated_at = NOW()
  WHERE id = p_booking_id
    AND user_id = v_uid
    AND LOWER(status) = 'held';

  RETURN jsonb_build_object('ok', FOUND, 'booking_id', p_booking_id, 'status', 'expired');
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_hall_hold(TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- STEP 8: RPC mark_hall_booking_paid(p_booking_id)
--         Marks a PENDING_VERIFICATION offline payment as PAID
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_hall_booking_paid(
  p_booking_id TEXT
)
RETURNS public.convention_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_row public.convention_bookings;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
  END IF;

  SELECT * INTO v_row
  FROM public.convention_bookings
  WHERE id = p_booking_id
    AND (user_id = v_uid OR public.is_admin())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND: Hall booking % not found or unauthorized.', p_booking_id;
  END IF;

  IF COALESCE(UPPER(v_row.payment_status), '') <> 'PENDING_VERIFICATION'
     AND UPPER(v_row.status) <> 'PENDING_VERIFICATION' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Booking % is not pending verification.', p_booking_id;
  END IF;

  UPDATE public.convention_bookings
  SET status         = 'confirmed',
      payment_status = 'PAID',
      amount_paid    = amount,
      balance_due    = 0,
      updated_at     = NOW()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_hall_booking_paid(TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- STEP 9: Update cancel_hall_booking(p_booking_id) to set status = 'cancelled'
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_hall_booking(
  p_booking_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_row public.convention_bookings;
  v_event_start TIMESTAMPTZ;
  v_hours_until NUMERIC;
  v_refund_percent NUMERIC(5, 2);
  v_refund_amount NUMERIC(10, 2);
  v_refund_status TEXT;
  v_now TIMESTAMPTZ;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required to cancel a hall reservation.';
  END IF;

  SELECT * INTO v_row
  FROM public.convention_bookings
  WHERE id = p_booking_id
    AND (user_id = v_uid OR public.is_admin())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND: Hall booking % not found or unauthorized.', p_booking_id;
  END IF;

  IF LOWER(v_row.status) = 'cancelled' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Booking is already cancelled.';
  END IF;

  IF LOWER(v_row.status) IN ('completed', 'expired') THEN
    RAISE EXCEPTION 'INVALID_STATUS: This booking cannot be cancelled.';
  END IF;

  v_now := NOW();

  -- If still held before payment, cancel immediately with zero refund
  IF LOWER(v_row.status) = 'held' THEN
    UPDATE public.convention_bookings
    SET status = 'cancelled',
        cancelled_at = v_now,
        refund_percent = 0,
        refund_amount = 0,
        refund_status = 'NOT_APPLICABLE',
        balance_due = 0,
        updated_at = v_now
    WHERE id = v_row.id
    RETURNING * INTO v_row;

    RETURN jsonb_build_object(
      'success', true,
      'booking_type', 'hall',
      'booking_id', v_row.id,
      'status', v_row.status,
      'hours_until_start', 0,
      'refund_percent', 0,
      'refund_amount', 0,
      'refund_status', 'NOT_APPLICABLE',
      'refund_status_text', 'No refund due',
      'refund_timing_note', 'Hold released prior to payment.',
      'cancelled_at', v_row.cancelled_at
    );
  END IF;

  -- Event start timestamp in Asia/Kolkata (+05:30)
  v_event_start := COALESCE(
    v_row.start_at,
    (v_row.date::date + v_row.start_time::time) AT TIME ZONE 'Asia/Kolkata'
  );
  v_hours_until := EXTRACT(EPOCH FROM (v_event_start - v_now)) / 3600.0;

  IF v_hours_until <= 0 THEN
    RAISE EXCEPTION 'EVENT_STARTED: Cancellation is not available after the event has started.';
  END IF;

  -- >= 48 hours -> 100% refund; < 48 hours -> 50% refund
  IF v_hours_until >= 48.0 THEN
    v_refund_percent := 100.00;
  ELSE
    v_refund_percent := 50.00;
  END IF;

  v_refund_amount := ROUND((COALESCE(v_row.amount_paid, 0) * v_refund_percent) / 100.00, 2);
  IF v_refund_amount > 0 THEN
    v_refund_status := 'PENDING';
  ELSE
    v_refund_status := 'NOT_APPLICABLE';
  END IF;

  UPDATE public.convention_bookings
  SET status = 'cancelled',
      cancelled_at = v_now,
      refund_percent = v_refund_percent,
      refund_amount = v_refund_amount,
      refund_status = v_refund_status,
      payment_status = CASE WHEN v_refund_amount > 0 THEN 'REFUNDED' ELSE payment_status END,
      balance_due = 0,
      updated_at = v_now
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'success', true,
    'booking_type', 'hall',
    'booking_id', v_row.id,
    'status', v_row.status,
    'hours_until_start', ROUND(v_hours_until, 1),
    'refund_percent', v_row.refund_percent,
    'refund_amount', v_row.refund_amount,
    'refund_status', v_row.refund_status,
    'refund_status_text', CASE WHEN v_row.refund_amount > 0 THEN 'Refund pending' ELSE 'No refund due' END,
    'refund_timing_note', 'Refund will be credited to original payment method as per your payment method timeline',
    'cancelled_at', v_row.cancelled_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_hall_booking(TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

