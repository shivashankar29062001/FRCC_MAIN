-- TODO-REMOVE-TEST-COUPON
-- Test coupon schema & seed for FRCC Membership join flow

-- 1. Create coupons table
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

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Allow reading coupons for validation
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'Coupons select policy') THEN
    CREATE POLICY "Coupons select policy" ON public.coupons FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'Coupons update policy') THEN
    CREATE POLICY "Coupons update policy" ON public.coupons FOR UPDATE USING (true);
  END IF;
END $$;

-- 2. Add coupon audit columns to memberships table if not present
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

-- 3. Atomic coupon redemption function
CREATE OR REPLACE FUNCTION public.redeem_membership_coupon(
  p_code TEXT
) RETURNS JSONB AS $$
DECLARE
  v_coupon RECORD;
BEGIN
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_code));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid coupon code.');
  END IF;

  IF NOT v_coupon.active THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This coupon is no longer active.');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This coupon has expired.');
  END IF;

  IF v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This coupon has reached its maximum uses.');
  END IF;

  -- Increment atomically
  UPDATE public.coupons
  SET used_count = used_count + 1
  WHERE id = v_coupon.id;

  RETURN jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'percent_off', v_coupon.percent_off,
    'is_test', v_coupon.is_test
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Seed test coupon FRCC-TEST-100 (100% off, 50 uses, expires in 30 days)
INSERT INTO public.coupons (code, percent_off, max_uses, used_count, expires_at, active, is_test)
VALUES ('FRCC-TEST-100', 100, 50, 0, NOW() + INTERVAL '30 days', true, true)
ON CONFLICT (code) DO UPDATE SET
  active = true,
  percent_off = 100,
  max_uses = 50,
  is_test = true;
