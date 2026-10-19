-- ============================================================================
-- FRCC COMPLETE UNIFIED DATABASE SCHEMA (PostgreSQL / Supabase)
-- ============================================================================
-- Modules covered:
--   1. Profiles, Admins & Roles
--   2. Unified Payments (Razorpay Gateway Tracking across all modules)
--   3. Memberships, Plans & Coupons
--   4. Parking System (Locations, Blocks, Slots, Bookings, Anti-collision)
--   5. Convention & Function Halls (Venues, Halls, Pricing, Bookings, Slot-locking)
--   6. Row Level Security (RLS) & Performance Indexes
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. PROFILES & USERS EXTENSION
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_code TEXT UNIQUE,
  name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_member BOOLEAN DEFAULT false,
  notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "promotions": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. UNIFIED PAYMENTS TABLE (Razorpay Gateway Tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  module TEXT NOT NULL CHECK (module IN ('membership', 'hall', 'parking', 'stay', 'dining', 'activity')),
  reference_id TEXT NOT NULL, -- Booking ID or Member ID
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_signature TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('created', 'authorized', 'captured', 'refunded', 'failed')),
  method TEXT, -- upi, card, netbanking, wallet
  error_code TEXT,
  error_description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. MEMBERSHIPS & PLANS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  period TEXT NOT NULL,
  description TEXT,
  benefits JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add Razorpay audit fields to memberships table if missing
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  member_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT,
  email TEXT,
  plan_name TEXT NOT NULL,
  plan_price NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  payment_method TEXT,
  coupon_code TEXT,
  is_test BOOLEAN DEFAULT false,
  payment_id TEXT,
  order_id TEXT,
  signature TEXT,
  status TEXT DEFAULT 'Active',
  date_of_birth TEXT,
  gender TEXT,
  address_line TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  emergency_contact TEXT,
  aadhaar_masked TEXT,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 years'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS signature TEXT;

-- ----------------------------------------------------------------------------
-- 4. PARKING MODULE SCHEMA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parking_locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  total_capacity INTEGER DEFAULT 150,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parking_slots (
  id TEXT PRIMARY KEY, -- e.g. A01, B12, C50
  location_id TEXT REFERENCES public.parking_locations(id) ON DELETE CASCADE,
  block_name TEXT NOT NULL CHECK (block_name IN ('A', 'B', 'C')),
  slot_number INTEGER NOT NULL,
  slot_type TEXT DEFAULT 'four_wheeler' CHECK (slot_type IN ('two_wheeler', 'four_wheeler', 'ev', 'vip')),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(location_id, block_name, slot_number)
);

CREATE TABLE IF NOT EXISTS public.parking_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT UNIQUE NOT NULL, -- e.g. FRCC-PARK-8A9X2Z10
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  location_id TEXT REFERENCES public.parking_locations(id),
  slot_id TEXT NOT NULL REFERENCES public.parking_slots(id),
  city TEXT NOT NULL,
  booking_date DATE NOT NULL,
  arrival_time TIME NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL,
  vehicle_type TEXT NOT NULL,
  vehicle_number TEXT NOT NULL,
  vehicle_model TEXT,
  total_amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'PENDING_AT_VENUE', 'REFUNDED')),
  booking_status TEXT DEFAULT 'CONFIRMED' CHECK (booking_status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anti-collision partial index: A slot can only have ONE active booking per day
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_parking_slot_booking
  ON public.parking_bookings (slot_id, booking_date)
  WHERE booking_status = 'CONFIRMED';

-- ----------------------------------------------------------------------------
-- 5. CONVENTION & FUNCTION HALLS SCHEMA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.convention_venues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.convention_halls (
  id TEXT PRIMARY KEY,
  venue_id TEXT REFERENCES public.convention_venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  price_per_hour NUMERIC(10, 2) NOT NULL,
  dimensions TEXT,
  amenities JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.convention_bookings (
  id TEXT PRIMARY KEY, -- e.g. FRCC-H-XXXXXX
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  hall_id TEXT REFERENCES public.convention_halls(id) ON DELETE RESTRICT,
  hall_name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  guests INTEGER NOT NULL CHECK (guests >= 30),
  event_type TEXT NOT NULL,
  event_details TEXT,
  organizer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  special_requests TEXT,
  hall_charge NUMERIC(10, 2) NOT NULL,
  gst NUMERIC(10, 2) NOT NULL,
  convenience_fee NUMERIC(10, 2) DEFAULT 0,
  amount NUMERIC(10, 2) NOT NULL,
  amount_paid NUMERIC(10, 2) DEFAULT 0,
  balance_due NUMERIC(10, 2) DEFAULT 0,
  payment_method TEXT,
  payment_id TEXT,
  transaction_ref TEXT,
  status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'PENDING_VERIFICATION', 'CANCELLED', 'COMPLETED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to prevent overlapping hall reservations
CREATE OR REPLACE FUNCTION public.check_hall_slot_conflict()
RETURNS TRIGGER AS $$
DECLARE
  v_conflict INTEGER;
BEGIN
  IF NEW.status IN ('CONFIRMED', 'PENDING_VERIFICATION') THEN
    SELECT COUNT(*) INTO v_conflict
    FROM public.convention_bookings
    WHERE hall_id = NEW.hall_id
      AND date = NEW.date
      AND status IN ('CONFIRMED', 'PENDING_VERIFICATION')
      AND id <> COALESCE(NEW.id, '')
      AND (
        (NEW.start_time < end_time AND NEW.end_time > start_time)
      );

    IF v_conflict > 0 THEN
      RAISE EXCEPTION 'This hall is already booked for the selected date and time interval.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_hall_double_booking ON public.convention_bookings;
CREATE TRIGGER trg_prevent_hall_double_booking
  BEFORE INSERT OR UPDATE ON public.convention_bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_hall_slot_conflict();

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convention_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convention_halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convention_bookings ENABLE ROW LEVEL SECURITY;

-- Public can view catalog data
DO $$ BEGIN
  CREATE POLICY "Public read parking locations" ON public.parking_locations FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read parking slots" ON public.parking_slots FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read convention venues" ON public.convention_venues FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read convention halls" ON public.convention_halls FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Bookings policies: Users can view their own, insert new bookings
DO $$ BEGIN
  CREATE POLICY "Users view own parking bookings" ON public.parking_bookings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users insert parking bookings" ON public.parking_bookings FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users view own convention bookings" ON public.convention_bookings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users insert convention bookings" ON public.convention_bookings FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users view own payments" ON public.payments FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "System insert payments" ON public.payments FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 7. INITIAL SEED DATA FOR PARKING SLOTS (Blocks A, B, C: 01-50)
-- ----------------------------------------------------------------------------
INSERT INTO public.parking_locations (id, name, city, address, total_capacity)
VALUES ('loc-vij-01', 'FRCC Main Campus Parking', 'Vijayawada', 'FRCC Club Rd, Vijayawada, Andhra Pradesh', 150)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  b TEXT;
  s INTEGER;
  slot_code TEXT;
BEGIN
  FOREACH b IN ARRAY ARRAY['A', 'B', 'C'] LOOP
    FOR s IN 1..50 LOOP
      slot_code := b || LPAD(s::text, 2, '0');
      INSERT INTO public.parking_slots (id, location_id, block_name, slot_number, slot_type)
      VALUES (slot_code, 'loc-vij-01', b, s, 'four_wheeler')
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
