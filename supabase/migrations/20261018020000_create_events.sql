-- ---------------------------------------------------------------------------
-- supabase/migrations/20261018020000_create_events.sql
-- FRCC Events Table, RLS & Storage Schema
-- ---------------------------------------------------------------------------

-- 1. Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('screening', 'workshop', 'meetup', 'cultural')),
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  venue TEXT DEFAULT 'FRCC',
  description TEXT,
  image_url TEXT,
  featured BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for upcoming active events queries
CREATE INDEX IF NOT EXISTS idx_events_date_active ON public.events (event_date, active);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Everyone can select rows where active = true
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Public can view active events') THEN
    CREATE POLICY "Public can view active events" ON public.events
      FOR SELECT
      USING (active = true);
  END IF;

  -- is_admin() can select all rows (including inactive)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Admins can select all events') THEN
    CREATE POLICY "Admins can select all events" ON public.events
      FOR SELECT
      TO authenticated
      USING (is_admin());
  END IF;

  -- is_admin() can insert events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Admins can insert events') THEN
    CREATE POLICY "Admins can insert events" ON public.events
      FOR INSERT
      TO authenticated
      WITH CHECK (is_admin());
  END IF;

  -- is_admin() can update events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Admins can update events') THEN
    CREATE POLICY "Admins can update events" ON public.events
      FOR UPDATE
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  -- is_admin() can delete events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Admins can delete events') THEN
    CREATE POLICY "Admins can delete events" ON public.events
      FOR DELETE
      TO authenticated
      USING (is_admin());
  END IF;
END $$;

-- 4. Storage Bucket: "event-images" (public-read, is_admin() write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies: Public read, is_admin() insert/update/delete
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public can view event images') THEN
    CREATE POLICY "Public can view event images" ON storage.objects
      FOR SELECT
      USING (bucket_id = 'event-images');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Admins can upload event images') THEN
    CREATE POLICY "Admins can upload event images" ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'event-images' AND is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Admins can update event images') THEN
    CREATE POLICY "Admins can update event images" ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'event-images' AND is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Admins can delete event images') THEN
    CREATE POLICY "Admins can delete event images" ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'event-images' AND is_admin());
  END IF;
END $$;
