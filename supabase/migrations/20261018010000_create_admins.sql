-- FRCC Admins Table and is_admin() Helper Function
-- Enables role-based access control and admin security policies in Supabase

CREATE TABLE IF NOT EXISTS public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Allow admins to view the admins table, or allow authenticated users to check their own admin status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admins' AND policyname = 'Admins can view admins list') THEN
    CREATE POLICY "Admins can view admins list" ON public.admins
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid() OR (SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())));
  END IF;
END $$;

-- Security definer function to check if the requesting user is an administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  );
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
