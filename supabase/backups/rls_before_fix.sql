-- ============================================================================
-- Supabase RLS Rollback Backup
-- File: /supabase/backups/rls_before_fix.sql
-- Exact current RLS flags and policy definitions before lockdown
-- Generated: 2026-10-27
-- ============================================================================

-- RLS flags on all 24 public tables
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

-- Current Policy Definitions (42 policies)

-- admins
CREATE POLICY "Admins can view admins list" ON public.admins
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = auth.uid()) OR (SELECT (EXISTS (SELECT 1 FROM admins admins_1 WHERE (admins_1.user_id = auth.uid()))) AS "exists")));

-- bookings
CREATE POLICY "Bookings delete policy" ON public.bookings
  AS PERMISSIVE FOR DELETE TO public
  USING (true);

CREATE POLICY "Bookings insert policy" ON public.bookings
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Bookings select policy" ON public.bookings
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Bookings update policy" ON public.bookings
  AS PERMISSIVE FOR UPDATE TO public
  USING (true);

-- contact_messages
CREATE POLICY "Contact insert policy" ON public.contact_messages
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Contact select policy" ON public.contact_messages
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

-- convention_bookings
CREATE POLICY "Users insert convention bookings" ON public.convention_bookings
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Users view own convention bookings" ON public.convention_bookings
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

-- convention_halls
CREATE POLICY "Public read convention halls" ON public.convention_halls
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

-- convention_venues
CREATE POLICY "Public read convention venues" ON public.convention_venues
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

-- coupons
CREATE POLICY "Coupons select policy" ON public.coupons
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

-- dining_venues
CREATE POLICY "Venues readable by everyone" ON public.dining_venues
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

-- events
CREATE POLICY "Admins can delete events" ON public.events
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert events" ON public.events
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can select all events" ON public.events
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update events" ON public.events
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Public can view active events" ON public.events
  AS PERMISSIVE FOR SELECT TO public
  USING ((active = true));

-- member_children
CREATE POLICY "Allow anon full access on member_children" ON public.member_children
  AS PERMISSIVE FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on member_children" ON public.member_children
  AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- member_profiles
CREATE POLICY "Allow anon full access on member_profiles" ON public.member_profiles
  AS PERMISSIVE FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on member_profiles" ON public.member_profiles
  AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- memberships
CREATE POLICY "Memberships insertable by authenticated or anon" ON public.memberships
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Memberships updateable by owner" ON public.memberships
  AS PERMISSIVE FOR UPDATE TO public
  USING (true);

CREATE POLICY "Memberships viewable by owner or anon" ON public.memberships
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

-- notifications
CREATE POLICY "Notifications insert policy" ON public.notifications
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Notifications select policy" ON public.notifications
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Notifications update policy" ON public.notifications
  AS PERMISSIVE FOR UPDATE TO public
  USING (true);

-- parking_bookings
CREATE POLICY "Users insert parking bookings" ON public.parking_bookings
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Users view own parking bookings" ON public.parking_bookings
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

-- parking_locations
CREATE POLICY "Public read parking locations" ON public.parking_locations
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

-- parking_slots
CREATE POLICY "Public read parking slots" ON public.parking_slots
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

-- payments
CREATE POLICY "Payments insert policy" ON public.payments
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Payments select policy" ON public.payments
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "System insert payments" ON public.payments
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Users view own payments" ON public.payments
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

-- profiles
CREATE POLICY "Public profiles are viewable by anyone or owner" ON public.profiles
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "Users can update their own profile" ON public.profiles
  AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = id));

-- room_types
CREATE POLICY "Public can view room types" ON public.room_types
  AS PERMISSIVE FOR SELECT TO public
  USING ((active = true));

-- stay_bookings
CREATE POLICY "Users can insert bookings" ON public.stay_bookings
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((auth.uid() = user_id) OR (user_id IS NULL)));

CREATE POLICY "Users can view own bookings" ON public.stay_bookings
  AS PERMISSIVE FOR SELECT TO public
  USING (((auth.uid() = user_id) OR is_admin()));

-- support_tickets
CREATE POLICY "Tickets insert policy" ON public.support_tickets
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Tickets select policy" ON public.support_tickets
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Tickets update policy" ON public.support_tickets
  AS PERMISSIVE FOR UPDATE TO public
  USING (true);

-- table_bookings
CREATE POLICY "Users can select own table bookings" ON public.table_bookings
  AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));
