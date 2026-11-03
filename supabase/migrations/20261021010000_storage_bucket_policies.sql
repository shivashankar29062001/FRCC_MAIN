-- Allow select on member-photos bucket
DROP POLICY IF EXISTS "Allow select on member-photos bucket" ON storage.buckets;
CREATE POLICY "Allow select on member-photos bucket"
  ON storage.buckets FOR SELECT
  TO authenticated, anon
  USING (id = 'member-photos');

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'member-photos',
  'member-photos',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

-- Storage object policies
DROP POLICY IF EXISTS "Allow all insert on member-photos" ON storage.objects;
CREATE POLICY "Allow all insert on member-photos"
  ON storage.objects FOR INSERT
  TO authenticated, anon
  WITH CHECK (bucket_id = 'member-photos');

DROP POLICY IF EXISTS "Allow all select on member-photos" ON storage.objects;
CREATE POLICY "Allow all select on member-photos"
  ON storage.objects FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'member-photos');

DROP POLICY IF EXISTS "Allow all update on member-photos" ON storage.objects;
CREATE POLICY "Allow all update on member-photos"
  ON storage.objects FOR UPDATE
  TO authenticated, anon
  USING (bucket_id = 'member-photos')
  WITH CHECK (bucket_id = 'member-photos');
