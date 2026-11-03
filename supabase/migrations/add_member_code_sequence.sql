-- ============================================================================
-- Migration: add_member_code_sequence.sql
-- Description: Creates id_counters table, next_member_code() function,
--              set_member_code() trigger on public.memberships, and unique constraint.
-- Sequence format: FRCCIND0001, FRCCIND0002, FRCCIND0003, ...
-- Note: Adapted for this project's table 'public.memberships' and columns
--       'member_code' and 'member_id'.
-- DO NOT RUN AUTOMATICALLY - Run manually in Supabase SQL Editor.
-- ============================================================================

-- 1. Counter table for sequential IDs
CREATE TABLE IF NOT EXISTS public.id_counters (
  id TEXT PRIMARY KEY,
  counter BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize counter for FRCCIND prefix if not already present
INSERT INTO public.id_counters (id, counter, updated_at)
VALUES ('FRCCIND', 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Sequence generator function: returns FRCCIND0001, FRCCIND0002, ...
CREATE OR REPLACE FUNCTION public.next_member_code(
  prefix TEXT DEFAULT 'FRCCIND',
  padding INT DEFAULT 4
)
RETURNS TEXT AS $$
DECLARE
  next_val BIGINT;
  new_code TEXT;
BEGIN
  INSERT INTO public.id_counters (id, counter, updated_at)
  VALUES (prefix, 1, NOW())
  ON CONFLICT (id) DO UPDATE
    SET counter = public.id_counters.counter + 1,
        updated_at = NOW()
  RETURNING counter INTO next_val;

  new_code := prefix || LPAD(next_val::TEXT, padding, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure member_code column exists on public.memberships
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS member_code TEXT;

-- 4. Unique constraint on member_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'memberships_member_code_unique'
  ) THEN
    ALTER TABLE public.memberships ADD CONSTRAINT memberships_member_code_unique UNIQUE (member_code);
  END IF;
END $$;

-- 5. Trigger function to automatically assign sequential member_code on insert
CREATE OR REPLACE FUNCTION public.set_member_code()
RETURNS TRIGGER AS $$
BEGIN
  -- If member_code is not supplied by the insert, generate sequential code
  IF NEW.member_code IS NULL OR TRIM(NEW.member_code) = '' THEN
    NEW.member_code := public.next_member_code('FRCCIND', 4);
  END IF;

  -- Ensure member_id is also set for backwards compatibility if table requires member_id
  IF NEW.member_id IS NULL OR TRIM(NEW.member_id) = '' THEN
    NEW.member_id := NEW.member_code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach trigger to public.memberships
DROP TRIGGER IF EXISTS trg_set_member_code ON public.memberships;

CREATE TRIGGER trg_set_member_code
BEFORE INSERT ON public.memberships
FOR EACH ROW
EXECUTE FUNCTION public.set_member_code();

-- 7. Sync existing records: populate member_code from member_id for existing rows without altering old IDs
UPDATE public.memberships
SET member_code = member_id
WHERE member_code IS NULL AND member_id IS NOT NULL;
