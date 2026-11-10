-- ============================================================================
-- Precheck: supabase/prechecks/hall_overlaps.sql
-- Purpose:  Read-only inspection (SELECT statements only) listing existing
--           active convention_bookings that overlap on the same hall_id.
--           Clean or resolve any reported conflicts BEFORE running
--           supabase/migrations/20261110040000_convention_bookings_overlap_constraint.sql.
-- ============================================================================

-- 1. List every pair of overlapping active bookings for the same hall_id
WITH normalized AS (
  SELECT
    id,
    user_id,
    hall_id,
    hall_name,
    date,
    start_time,
    end_time,
    status,
    organizer_name,
    email,
    phone,
    created_at,
    (date::date + start_time::time) AT TIME ZONE 'Asia/Kolkata' AS computed_start_at,
    (date::date + end_time::time)   AT TIME ZONE 'Asia/Kolkata' AS computed_end_at
  FROM public.convention_bookings
  WHERE LOWER(status) IN ('held', 'confirmed', 'pending_verification')
)
SELECT
  b1.hall_id,
  b1.hall_name,
  b1.date,
  b1.id                 AS booking_1_id,
  b1.user_id            AS booking_1_user_id,
  b1.start_time         AS booking_1_start,
  b1.end_time           AS booking_1_end,
  b1.status             AS booking_1_status,
  b1.created_at         AS booking_1_created_at,
  b2.id                 AS booking_2_id,
  b2.user_id            AS booking_2_user_id,
  b2.start_time         AS booking_2_start,
  b2.end_time           AS booking_2_end,
  b2.status             AS booking_2_status,
  b2.created_at         AS booking_2_created_at
FROM normalized b1
JOIN normalized b2
  ON b1.hall_id = b2.hall_id
 AND b1.id < b2.id
 AND tstzrange(b1.computed_start_at, b1.computed_end_at, '[)')
  && tstzrange(b2.computed_start_at, b2.computed_end_at, '[)')
ORDER BY b1.hall_id, b1.date, b1.start_time, b1.created_at;

-- 2. Summary of active bookings grouped by invalid or reversed time ranges
--    (end_time <= start_time would cause tstzrange(..., '[)') creation to error)
SELECT
  id,
  hall_id,
  hall_name,
  date,
  start_time,
  end_time,
  status,
  created_at
FROM public.convention_bookings
WHERE date IS NULL
   OR start_time IS NULL
   OR end_time IS NULL
   OR end_time::time <= start_time::time
ORDER BY created_at DESC;

