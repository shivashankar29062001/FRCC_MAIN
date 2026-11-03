-- FRCC Initial Database Schema
-- Generated and Applied to Supabase Project: dkvirykibcsnfmgzsfes

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Linked with Supabase auth.users)
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by anyone or owner') THEN
    CREATE POLICY "Public profiles are viewable by anyone or owner" ON public.profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile') THEN
    CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
    CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  uid_code TEXT;
BEGIN
  uid_code := 'FRCC-U-' || UPPER(SUBSTRING(NEW.id::text, 1, 6));
  INSERT INTO public.profiles (id, user_id_code, name, email, phone, is_member)
  VALUES (
    NEW.id,
    uid_code,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Member'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''),
    COALESCE((NEW.raw_user_meta_data->>'is_member')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. MEMBERSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  member_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT,
  email TEXT,
  plan_name TEXT NOT NULL,
  plan_price NUMERIC DEFAULT 0,
  payment_method TEXT,
  status TEXT DEFAULT 'Active',
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 years'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'memberships' AND policyname = 'Memberships viewable by owner or anon') THEN
    CREATE POLICY "Memberships viewable by owner or anon" ON public.memberships FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'memberships' AND policyname = 'Memberships insertable by authenticated or anon') THEN
    CREATE POLICY "Memberships insertable by authenticated or anon" ON public.memberships FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'memberships' AND policyname = 'Memberships updateable by owner') THEN
    CREATE POLICY "Memberships updateable by owner" ON public.memberships FOR UPDATE USING (true);
  END IF;
END $$;

-- 3. BOOKINGS TABLE (Activities, Stay, Halls, Parking)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT,
  slot TEXT,
  checkin TEXT,
  checkout TEXT,
  area_name TEXT,
  guests TEXT,
  players INTEGER DEFAULT 1,
  details JSONB DEFAULT '{}'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  payment_method TEXT,
  is_member BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'Confirmed',
  user_name TEXT,
  mobile TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Bookings select policy') THEN
    CREATE POLICY "Bookings select policy" ON public.bookings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Bookings insert policy') THEN
    CREATE POLICY "Bookings insert policy" ON public.bookings FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Bookings update policy') THEN
    CREATE POLICY "Bookings update policy" ON public.bookings FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Bookings delete policy') THEN
    CREATE POLICY "Bookings delete policy" ON public.bookings FOR DELETE USING (true);
  END IF;
END $$;

-- 4. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT UNIQUE NOT NULL,
  booking_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  method TEXT,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Success',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Payments select policy') THEN
    CREATE POLICY "Payments select policy" ON public.payments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Payments insert policy') THEN
    CREATE POLICY "Payments insert policy" ON public.payments FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 5. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  category TEXT NOT NULL,
  priority TEXT DEFAULT 'Normal',
  subject TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'Tickets select policy') THEN
    CREATE POLICY "Tickets select policy" ON public.support_tickets FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'Tickets insert policy') THEN
    CREATE POLICY "Tickets insert policy" ON public.support_tickets FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'Tickets update policy') THEN
    CREATE POLICY "Tickets update policy" ON public.support_tickets FOR UPDATE USING (true);
  END IF;
END $$;

-- 6. CONTACT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'Unread',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contact_messages' AND policyname = 'Contact select policy') THEN
    CREATE POLICY "Contact select policy" ON public.contact_messages FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contact_messages' AND policyname = 'Contact insert policy') THEN
    CREATE POLICY "Contact insert policy" ON public.contact_messages FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 7. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Notifications select policy') THEN
    CREATE POLICY "Notifications select policy" ON public.notifications FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Notifications insert policy') THEN
    CREATE POLICY "Notifications insert policy" ON public.notifications FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Notifications update policy') THEN
    CREATE POLICY "Notifications update policy" ON public.notifications FOR UPDATE USING (true);
  END IF;
END $$;

-- Initial notifications
INSERT INTO public.notifications (title, body, type, user_id)
SELECT 'Welcome to FRCC', 'Complete your membership to unlock exclusive member privileges and 30% savings.', 'info', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.notifications WHERE title = 'Welcome to FRCC');

INSERT INTO public.notifications (title, body, type, user_id)
SELECT 'Weekend Gala at Convention Hall', 'Open house this Saturday at the Grand Ballroom. Reserve your visit.', 'event', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.notifications WHERE title = 'Weekend Gala at Convention Hall');
