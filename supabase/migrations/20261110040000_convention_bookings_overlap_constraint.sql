-- Final migration: enforce non-overlapping active bookings per hall at the database level.
-- Prerequisites:
--   1. Run supabase/migrations/20261110030000_hall_bookings_hold_and_rpcs.sql first (populates
--      start_at / end_at in Asia/Kolkata timestamptz via trigger & backfill).
--   2. Run supabase/prechecks/hall_overlaps.sql (SELECT-only) and clean up any pre-existing
--      overlapping active bookings or invalid time ranges manually before applying this constraint.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.convention_bookings
  DROP CONSTRAINT IF EXISTS convention_bookings_no_overlap_excl;

ALTER TABLE public.convention_bookings
  ADD CONSTRAINT convention_bookings_no_overlap_excl
  EXCLUDE USING gist (
    hall_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (LOWER(status) IN ('held', 'confirmed'));

