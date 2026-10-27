-- ============================================================================
-- Migration: 20261027120000_lock_down_user_data.sql
-- Description: Locks down all user-owned data to owner-only & admin/staff.
--              Closes public SELECT, UPDATE, DELETE leaks.
-- ============================================================================

BEGIN;

-- 1. Helper functions for Admin/Staff access
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

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_admin();
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, anon;

-- 2. Availability RPCs for convention halls and parking slots (no PII returned)
CREATE OR REPLACE FUNCTION public.get_booked_parking_slots(p_date text)
RETURNS TABLE (slot_id text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT slot_id
  FROM public.parking_bookings
  WHERE booking_date = p_date::date
    AND booking_status = 'CONFIRMED';
$$;

CREATE OR REPLACE FUNCTION public.get_booked_convention_slots(p_hall_id text, p_date text)
RETURNS TABLE (id text, start_time text, end_time text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id, start_time, end_time
  FROM public.convention_bookings
  WHERE hall_id = p_hall_id
    AND date = p_date::date
    AND status IN ('CONFIRMED', 'PENDING_VERIFICATION');
$$;

GRANT EXECUTE ON FUNCTION public.get_booked_parking_slots(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_booked_convention_slots(text, text) TO authenticated, anon;

-- 3. Enable RLS on all tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convention_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convention_halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convention_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dining_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.id_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stay_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_bookings ENABLE ROW LEVEL SECURITY;

-- 4. Drop wide-open / insecure policies

-- bookings
DROP POLICY IF EXISTS "Bookings select policy" ON public.bookings;
DROP POLICY IF EXISTS "Bookings insert policy" ON public.bookings;
DROP POLICY IF EXISTS "Bookings update policy" ON public.bookings;
DROP POLICY IF EXISTS "Bookings delete policy" ON public.bookings;

-- payments
DROP POLICY IF EXISTS "Payments select policy" ON public.payments;
DROP POLICY IF EXISTS "Users view own payments" ON public.payments;
DROP POLICY IF EXISTS "Payments insert policy" ON public.payments;
DROP POLICY IF EXISTS "System insert payments" ON public.payments;

-- memberships
DROP POLICY IF EXISTS "Memberships viewable by owner or anon" ON public.memberships;
DROP POLICY IF EXISTS "Memberships updateable by owner" ON public.memberships;
DROP POLICY IF EXISTS "Memberships insertable by authenticated or anon" ON public.memberships;

-- member_profiles
DROP POLICY IF EXISTS "Allow anon full access on member_profiles" ON public.member_profiles;
DROP POLICY IF EXISTS "Allow authenticated full access on member_profiles" ON public.member_profiles;

-- member_children
DROP POLICY IF EXISTS "Allow anon full access on member_children" ON public.member_children;
DROP POLICY IF EXISTS "Allow authenticated full access on member_children" ON public.member_children;

-- stay_bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON public.stay_bookings;
DROP POLICY IF EXISTS "Users can insert bookings" ON public.stay_bookings;

-- table_bookings
DROP POLICY IF EXISTS "Users can select own table bookings" ON public.table_bookings;

-- parking_bookings
DROP POLICY IF EXISTS "Users view own parking bookings" ON public.parking_bookings;
DROP POLICY IF EXISTS "Users insert parking bookings" ON public.parking_bookings;

-- convention_bookings
DROP POLICY IF EXISTS "Users view own convention bookings" ON public.convention_bookings;
DROP POLICY IF EXISTS "Users insert convention bookings" ON public.convention_bookings;

-- notifications
DROP POLICY IF EXISTS "Notifications select policy" ON public.notifications;
DROP POLICY IF EXISTS "Notifications insert policy" ON public.notifications;
DROP POLICY IF EXISTS "Notifications update policy" ON public.notifications;

-- support_tickets
DROP POLICY IF EXISTS "Tickets select policy" ON public.support_tickets;
DROP POLICY IF EXISTS "Tickets insert policy" ON public.support_tickets;
DROP POLICY IF EXISTS "Tickets update policy" ON public.support_tickets;

-- contact_messages
DROP POLICY IF EXISTS "Contact select policy" ON public.contact_messages;
DROP POLICY IF EXISTS "Contact insert policy" ON public.contact_messages;

-- profiles
DROP POLICY IF EXISTS "Public profiles are viewable by anyone or owner" ON public.profiles;

-- membership_plans
DROP POLICY IF EXISTS "Public can view membership plans" ON public.membership_plans;

-- 5. Add owner-only and admin policies

-- bookings
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

-- payments
CREATE POLICY "Users can select own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can insert own payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

-- memberships
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

-- member_profiles
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

-- member_children
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

-- stay_bookings
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

-- table_bookings
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

-- parking_bookings
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

-- convention_bookings
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

-- notifications
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

-- support_tickets
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

-- profiles (lockdown SELECT to owner or admin)
CREATE POLICY "Users can view own profile or admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR public.is_admin());

-- contact_messages (public can INSERT, only admin can SELECT)
CREATE POLICY "Public can submit contact messages" ON public.contact_messages
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view contact messages" ON public.contact_messages
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- membership_plans (public can view active plans)
CREATE POLICY "Public can view membership plans" ON public.membership_plans
  FOR SELECT TO public
  USING (active = true OR public.is_admin());

-- 6. Storage Policies: member-photos bucket (owner-only access)
DROP POLICY IF EXISTS "Allow authenticated full access on member-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon full access on member-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow select on member-photos bucket" ON storage.buckets;

CREATE POLICY "Users can view own photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'member-photos' AND ((storage.foldername(name))[1] = (SELECT auth.uid())::text OR public.is_admin()));

CREATE POLICY "Users can upload own photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'member-photos' AND ((storage.foldername(name))[1] = (SELECT auth.uid())::text OR public.is_admin()));

CREATE POLICY "Users can update own photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'member-photos' AND ((storage.foldername(name))[1] = (SELECT auth.uid())::text OR public.is_admin()))
  WITH CHECK (bucket_id = 'member-photos' AND ((storage.foldername(name))[1] = (SELECT auth.uid())::text OR public.is_admin()));

CREATE POLICY "Users can delete own photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'member-photos' AND ((storage.foldername(name))[1] = (SELECT auth.uid())::text OR public.is_admin()));

COMMIT;
