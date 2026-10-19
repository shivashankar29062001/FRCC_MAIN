-- ---------------------------------------------------------------------------
-- supabase/migrations/20261018030000_create_stays_and_coupons.sql
-- Combined stays and test coupons migrations
-- ---------------------------------------------------------------------------

-- 1. room_types table
CREATE TABLE IF NOT EXISTS public.room_types (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL DEFAULT 'vijayawada',
  category TEXT NOT NULL CHECK (category IN ('normal', 'suite')),
  name TEXT NOT NULL,
  description TEXT,
  bed_type TEXT,
  view TEXT,
  size_sqft INTEGER,
  max_guests INTEGER NOT NULL DEFAULT 2,
  rooms_total INTEGER NOT NULL DEFAULT 10,
  price_per_night INTEGER NOT NULL,
  amenities JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true
);

-- 2. stay_bookings table
CREATE TABLE IF NOT EXISTS public.stay_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_request_id TEXT UNIQUE,
  booking_ref TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  room_type_id TEXT REFERENCES public.room_types(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER NOT NULL,
  rooms INTEGER NOT NULL DEFAULT 1,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  guest_name TEXT NOT NULL,
  guest_mobile TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  special_request TEXT,
  price_per_night INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  member_discount INTEGER NOT NULL DEFAULT 0,
  coupon_code TEXT,
  coupon_discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'upi',
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  hold_expires_at TIMESTAMPTZ,
  is_test BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stay_bookings_dates ON public.stay_bookings (room_type_id, check_in, check_out, status);
CREATE INDEX IF NOT EXISTS idx_stay_bookings_user ON public.stay_bookings (user_id);

-- 3. Coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  percent_off INTEGER NOT NULL DEFAULT 100,
  max_uses INTEGER NOT NULL DEFAULT 50,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  active BOOLEAN NOT NULL DEFAULT true,
  is_test BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stay_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'room_types' AND policyname = 'Public can view room types') THEN
    CREATE POLICY "Public can view room types" ON public.room_types FOR SELECT USING (active = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stay_bookings' AND policyname = 'Users can view own bookings') THEN
    CREATE POLICY "Users can view own bookings" ON public.stay_bookings FOR SELECT USING (auth.uid() = user_id OR is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stay_bookings' AND policyname = 'Users can insert bookings') THEN
    CREATE POLICY "Users can insert bookings" ON public.stay_bookings FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'Coupons select policy') THEN
    CREATE POLICY "Coupons select policy" ON public.coupons FOR SELECT USING (true);
  END IF;
END $$;
