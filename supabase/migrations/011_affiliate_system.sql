-- Migration 011: Manual Affiliate Tracking System

-- 1. Create affiliate_partners table
CREATE TABLE IF NOT EXISTS public.affiliate_partners (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT          NOT NULL,
  email         TEXT,
  referral_code TEXT          NOT NULL UNIQUE,
  notes         TEXT,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.affiliate_partners IS 'Affiliate partners created manually by the Super Admin.';

-- 2. Create affiliate_referrals table
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id  UUID          REFERENCES public.affiliate_partners(id) ON DELETE SET NULL,
  store_id      UUID          NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  referral_code TEXT          NOT NULL,
  referred_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT affiliate_referrals_store_unique UNIQUE (store_id)
);

COMMENT ON TABLE public.affiliate_referrals IS 'Stores referred by affiliate partners.';

-- 3. Add affiliate fields to stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES public.affiliate_partners(id) ON DELETE SET NULL;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS referral_date TIMESTAMPTZ;

COMMENT ON COLUMN public.stores.affiliate_id IS 'Link to the affiliate partner who referred this store.';
COMMENT ON COLUMN public.stores.referral_code IS 'The referral code used during registration.';
COMMENT ON COLUMN public.stores.referral_date IS 'The date when the referral link was first tracked or registered.';

-- 4. Enable RLS (Row Level Security)
ALTER TABLE public.affiliate_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

-- Note: Since only Super Admin manages these tables, we do not define public policies.
-- Database operations will be performed using the admin client (service_role) which bypasses RLS.
