-- Migration: 20261102000000_ensure_phone_and_update_signup_trigger.sql
-- Purpose:
-- 1. Ensure the 'phone' column exists on the public.profiles table.
-- 2. Update the handle_new_user() trigger function to extract 'name' and 'phone' / 'mobile'
--    from the Supabase auth user raw_user_meta_data upon signup.
-- Note: Does NOT modify any RLS policies. Do not run directly; apply via Supabase migration CLI.

-- 1. Ensure 'phone' column exists on public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Update the user registration trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  uid_code TEXT;
  extracted_name TEXT;
  extracted_phone TEXT;
BEGIN
  uid_code := 'FRCC-U-' || UPPER(SUBSTRING(NEW.id::text, 1, 6));

  -- Prefer explicit metadata name/full_name, fall back to email prefix, then 'Member'
  extracted_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(NEW.email, '@', 1),
    'Member'
  );

  -- Extract 10-digit phone number from user metadata (supports 'phone' or 'mobile') or auth.users phone
  extracted_phone := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'mobile'), ''),
    NULLIF(TRIM(NEW.phone), ''),
    ''
  );

  -- Insert profile or update name & phone on conflict without disrupting existing member status
  INSERT INTO public.profiles (id, user_id_code, name, email, phone, is_member)
  VALUES (
    NEW.id,
    uid_code,
    extracted_name,
    NEW.email,
    extracted_phone,
    COALESCE((NEW.raw_user_meta_data->>'is_member')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-bind the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

