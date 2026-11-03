-- ============================================================================
-- Migration: 20261102020000_ensure_contact_messages_insert_policy.sql
-- Description: Ensure anon and authenticated visitors can submit contact messages
--              to the front desk without triggering RLS violations.
-- ============================================================================

ALTER TABLE IF EXISTS public.contact_messages ENABLE ROW LEVEL SECURITY;

-- 1. Allow public submission of contact messages (both anon & authenticated users)
DROP POLICY IF EXISTS "Public can submit contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Contact insert policy" ON public.contact_messages;

CREATE POLICY "Public can submit contact messages" ON public.contact_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 2. Restrict viewing of submitted messages to administrators only
DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Contact select policy" ON public.contact_messages;

CREATE POLICY "Admins can view contact messages" ON public.contact_messages
  FOR SELECT TO authenticated
  USING (public.is_admin());

