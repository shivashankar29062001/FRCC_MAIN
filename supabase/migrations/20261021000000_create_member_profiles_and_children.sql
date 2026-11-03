-- ============================================================================
-- Migration: 20261021000000_create_member_profiles_and_children.sql
-- Description: Creates member_profiles, member_children, and member-photos bucket
-- ============================================================================

-- 1. Member Profiles Table
CREATE TABLE IF NOT EXISTS public.member_profiles (
  user_id UUID PRIMARY KEY,
  marital_status TEXT,
  spouse_name TEXT,
  spouse_dob TEXT,
  spouse_mobile TEXT,
  occupation_type TEXT,
  employer_name TEXT,
  designation TEXT,
  work_city TEXT,
  work_email TEXT,
  business_name TEXT,
  business_nature TEXT,
  profession TEXT,
  organisation TEXT,
  photo_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Member Children Table
CREATE TABLE IF NOT EXISTS public.member_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  dob TEXT,
  gender TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_children_user_id ON public.member_children(user_id);

-- 3. Row Level Security & Permissions
ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_children ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.member_profiles TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.member_children TO authenticated, anon, service_role;

-- Policies for member_profiles
DROP POLICY IF EXISTS "Allow authenticated full access on member_profiles" ON public.member_profiles;
CREATE POLICY "Allow authenticated full access on member_profiles"
  ON public.member_profiles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon full access on member_profiles" ON public.member_profiles;
CREATE POLICY "Allow anon full access on member_profiles"
  ON public.member_profiles FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Policies for member_children
DROP POLICY IF EXISTS "Allow authenticated full access on member_children" ON public.member_children;
CREATE POLICY "Allow authenticated full access on member_children"
  ON public.member_children FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon full access on member_children" ON public.member_children;
CREATE POLICY "Allow anon full access on member_children"
  ON public.member_children FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- 4. Storage Bucket for Passport Photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'member-photos',
  'member-photos',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

-- Storage policies for member-photos bucket
DROP POLICY IF EXISTS "Allow authenticated full access on member-photos" ON storage.objects;
CREATE POLICY "Allow authenticated full access on member-photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'member-photos')
  WITH CHECK (bucket_id = 'member-photos');

DROP POLICY IF EXISTS "Allow anon full access on member-photos" ON storage.objects;
CREATE POLICY "Allow anon full access on member-photos"
  ON storage.objects FOR ALL
  TO anon
  USING (bucket_id = 'member-photos')
  WITH CHECK (bucket_id = 'member-photos');

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
