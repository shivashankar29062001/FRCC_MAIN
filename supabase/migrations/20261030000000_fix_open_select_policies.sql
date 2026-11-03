-- ============================================================================
-- Migration: 20261030000000_fix_open_select_policies.sql
-- Description: Completely eliminates cross-user data leakage by enforcing strict
--              owner-or-admin Row Level Security (RLS) on all user data tables:
--              bookings, payments, stay_bookings, table_bookings,
--              parking_bookings, convention_bookings, memberships,
--              member_profiles, member_children, notifications, support_tickets.
--
-- Safety & Idempotency:
--   - Safe to execute multiple times (DROP POLICY IF EXISTS + CREATE POLICY).
--   - Scans and drops any open SELECT/ALL policy with USING (true) or open roles.
--   - Strictly preserves public read access on catalog/lookup tables
--     (room_types, dining_venues, convention_halls, coupons, events, etc.).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- STEP 1: Verify and ensure public.is_admin() helper function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- STEP 2: Enable Row Level Security (RLS) on all user data tables
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stay_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.table_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parking_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.convention_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.member_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_tickets ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- STEP 3: Dynamically purge any existing open SELECT or ALL policies with USING (true)
--         across all user-specific data tables.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
  target_tables TEXT[] := ARRAY[
    'bookings',
    'payments',
    'stay_bookings',
    'table_bookings',
    'parking_bookings',
    'convention_bookings',
    'memberships',
    'member_profiles',
    'member_children',
    'notifications',
    'support_tickets'
  ];
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY(target_tables)
      AND (
        qual = 'true'
        OR qual IS NULL
        OR policyname ILIKE '%public%'
        OR policyname ILIKE '%open%'
        OR policyname ILIKE '%allow all%'
        OR policyname ILIKE '%select all%'
        OR policyname ILIKE '%read all%'
        OR 'anon' = ANY(roles)
        OR 'public' = ANY(roles)
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 4: Explicitly drop any known named policies on target tables
-- ----------------------------------------------------------------------------

-- bookings
DROP POLICY IF EXISTS "Bookings select policy" ON public.bookings;
DROP POLICY IF EXISTS "Bookings insert policy" ON public.bookings;
DROP POLICY IF EXISTS "Bookings update policy" ON public.bookings;
DROP POLICY IF EXISTS "Bookings delete policy" ON public.bookings;
DROP POLICY IF EXISTS "Users can select own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete own bookings" ON public.bookings;

-- payments
DROP POLICY IF EXISTS "Payments select policy" ON public.payments;
DROP POLICY IF EXISTS "Users view own payments" ON public.payments;
DROP POLICY IF EXISTS "Payments insert policy" ON public.payments;
DROP POLICY IF EXISTS "System insert payments" ON public.payments;
DROP POLICY IF EXISTS "Users can select own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON public.payments;

-- stay_bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON public.stay_bookings;
DROP POLICY IF EXISTS "Users can insert bookings" ON public.stay_bookings;
DROP POLICY IF EXISTS "Users can select own stay_bookings" ON public.stay_bookings;
DROP POLICY IF EXISTS "Users can insert own stay_bookings" ON public.stay_bookings;
DROP POLICY IF EXISTS "Users can update own stay_bookings" ON public.stay_bookings;
DROP POLICY IF EXISTS "Users can delete own stay_bookings" ON public.stay_bookings;

-- table_bookings
DROP POLICY IF EXISTS "Users can select own table bookings" ON public.table_bookings;
DROP POLICY IF EXISTS "Users can select own table_bookings" ON public.table_bookings;
DROP POLICY IF EXISTS "Users can insert own table_bookings" ON public.table_bookings;
DROP POLICY IF EXISTS "Users can update own table_bookings" ON public.table_bookings;
DROP POLICY IF EXISTS "Users can delete own table_bookings" ON public.table_bookings;

-- parking_bookings
DROP POLICY IF EXISTS "Users view own parking bookings" ON public.parking_bookings;
DROP POLICY IF EXISTS "Users insert parking bookings" ON public.parking_bookings;
DROP POLICY IF EXISTS "Users can select own parking_bookings" ON public.parking_bookings;
DROP POLICY IF EXISTS "Users can insert own parking_bookings" ON public.parking_bookings;
DROP POLICY IF EXISTS "Users can update own parking_bookings" ON public.parking_bookings;
DROP POLICY IF EXISTS "Users can delete own parking_bookings" ON public.parking_bookings;

-- convention_bookings
DROP POLICY IF EXISTS "Users view own convention bookings" ON public.convention_bookings;
DROP POLICY IF EXISTS "Users insert convention bookings" ON public.convention_bookings;
DROP POLICY IF EXISTS "Users can select own convention_bookings" ON public.convention_bookings;
DROP POLICY IF EXISTS "Users can insert own convention_bookings" ON public.convention_bookings;
DROP POLICY IF EXISTS "Users can update own convention_bookings" ON public.convention_bookings;
DROP POLICY IF EXISTS "Users can delete own convention_bookings" ON public.convention_bookings;

-- memberships
DROP POLICY IF EXISTS "Memberships viewable by owner or anon" ON public.memberships;
DROP POLICY IF EXISTS "Memberships updateable by owner" ON public.memberships;
DROP POLICY IF EXISTS "Memberships insertable by authenticated or anon" ON public.memberships;
DROP POLICY IF EXISTS "Users can select own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can insert own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can update own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can delete own memberships" ON public.memberships;

-- member_profiles
DROP POLICY IF EXISTS "Allow anon full access on member_profiles" ON public.member_profiles;
DROP POLICY IF EXISTS "Allow authenticated full access on member_profiles" ON public.member_profiles;
DROP POLICY IF EXISTS "Users can select own member_profile" ON public.member_profiles;
DROP POLICY IF EXISTS "Users can insert own member_profile" ON public.member_profiles;
DROP POLICY IF EXISTS "Users can update own member_profile" ON public.member_profiles;
DROP POLICY IF EXISTS "Users can delete own member_profile" ON public.member_profiles;

-- member_children
DROP POLICY IF EXISTS "Allow anon full access on member_children" ON public.member_children;
DROP POLICY IF EXISTS "Allow authenticated full access on member_children" ON public.member_children;
DROP POLICY IF EXISTS "Users can select own member_children" ON public.member_children;
DROP POLICY IF EXISTS "Users can insert own member_children" ON public.member_children;
DROP POLICY IF EXISTS "Users can update own member_children" ON public.member_children;
DROP POLICY IF EXISTS "Users can delete own member_children" ON public.member_children;

-- notifications
DROP POLICY IF EXISTS "Notifications select policy" ON public.notifications;
DROP POLICY IF EXISTS "Notifications insert policy" ON public.notifications;
DROP POLICY IF EXISTS "Notifications update policy" ON public.notifications;
DROP POLICY IF EXISTS "Users can select own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

-- support_tickets
DROP POLICY IF EXISTS "Tickets select policy" ON public.support_tickets;
DROP POLICY IF EXISTS "Tickets insert policy" ON public.support_tickets;
DROP POLICY IF EXISTS "Tickets update policy" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can select own support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can insert own support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can update own support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can delete own support_tickets" ON public.support_tickets;

-- ----------------------------------------------------------------------------
-- STEP 5: Re-create owner-or-admin policies for all user-owned tables
--         Strict condition: user_id = (SELECT auth.uid()) OR public.is_admin()
-- ----------------------------------------------------------------------------

-- Table: bookings (Activities & Multi-module)
CREATE POLICY "Users can select own bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can insert own bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can delete own bookings" ON public.bookings
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- Table: payments
CREATE POLICY "Users can select own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can insert own payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can update own payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can delete own payments" ON public.payments
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- Table: stay_bookings
CREATE POLICY "Users can select own stay_bookings" ON public.stay_bookings
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can insert own stay_bookings" ON public.stay_bookings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can update own stay_bookings" ON public.stay_bookings
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can delete own stay_bookings" ON public.stay_bookings
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- Table: table_bookings
CREATE POLICY "Users can select own table_bookings" ON public.table_bookings
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can insert own table_bookings" ON public.table_bookings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can update own table_bookings" ON public.table_bookings
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can delete own table_bookings" ON public.table_bookings
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- Table: parking_bookings
CREATE POLICY "Users can select own parking_bookings" ON public.parking_bookings
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can insert own parking_bookings" ON public.parking_bookings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can update own parking_bookings" ON public.parking_bookings
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can delete own parking_bookings" ON public.parking_bookings
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- Table: convention_bookings
CREATE POLICY "Users can select own convention_bookings" ON public.convention_bookings
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can insert own convention_bookings" ON public.convention_bookings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can update own convention_bookings" ON public.convention_bookings
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can delete own convention_bookings" ON public.convention_bookings
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- Table: memberships
CREATE POLICY "Users can select own memberships" ON public.memberships
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can insert own memberships" ON public.memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can update own memberships" ON public.memberships
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can delete own memberships" ON public.memberships
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- Table: member_profiles
CREATE POLICY "Users can select own member_profile" ON public.member_profiles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can insert own member_profile" ON public.member_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can update own member_profile" ON public.member_profiles
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can delete own member_profile" ON public.member_profiles
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- Table: member_children
CREATE POLICY "Users can select own member_children" ON public.member_children
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can insert own member_children" ON public.member_children
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can update own member_children" ON public.member_children
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can delete own member_children" ON public.member_children
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- Table: notifications
CREATE POLICY "Users can select own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can insert own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- Table: support_tickets
CREATE POLICY "Users can select own support_tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can insert own support_tickets" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can update own support_tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can delete own support_tickets" ON public.support_tickets
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- ----------------------------------------------------------------------------
-- STEP 6: Notice on non-user catalog tables (INTENTIONALLY UNTOUCHED):
--   - public.room_types (hotel room catalog - public catalog)
--   - public.dining_venues (dining venues catalog - public catalog)
--   - public.convention_halls (hall catalog - public catalog)
--   - public.convention_venues (venues catalog - public catalog)
--   - public.coupons (discount coupons catalog - public read)
--   - public.events (public events catalog)
--   - public.membership_plans (public plans catalog)
-- ----------------------------------------------------------------------------

COMMIT;

