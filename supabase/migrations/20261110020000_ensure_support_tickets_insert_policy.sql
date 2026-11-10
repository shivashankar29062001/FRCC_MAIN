-- ============================================================================
-- Migration: 20261110020000_ensure_support_tickets_insert_policy.sql
-- Description: Allow anon and authenticated visitors to submit support tickets
--              to the front desk without triggering RLS violations.
-- ============================================================================

ALTER TABLE IF EXISTS public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 1. Allow public submission of support tickets (both anon & authenticated users)
DROP POLICY IF EXISTS "Users can insert own support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Tickets insert policy" ON public.support_tickets;
DROP POLICY IF EXISTS "Public can submit support tickets" ON public.support_tickets;

CREATE POLICY "Public can submit support tickets" ON public.support_tickets
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 2. Ensure users can view their own tickets and admins can view all tickets
DROP POLICY IF EXISTS "Users can select own support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Tickets select policy" ON public.support_tickets;

CREATE POLICY "Users can select own support_tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

