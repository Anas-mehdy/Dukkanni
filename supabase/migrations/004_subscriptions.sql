-- Migration 004: Add multi-tenant billing and subscriptions columns to stores table

-- 1. Add plan_type TEXT with default 'trial' and check constraint
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'trial' NOT NULL;
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_plan_type_values;
ALTER TABLE public.stores ADD CONSTRAINT stores_plan_type_values 
  CHECK (plan_type IN ('trial', 'monthly', 'yearly'));

-- 2. Add subscription_status TEXT with default 'active' and check constraint
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' NOT NULL;
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_subscription_status_values;
ALTER TABLE public.stores ADD CONSTRAINT stores_subscription_status_values
  CHECK (subscription_status IN ('active', 'expired', 'suspended'));

-- 3. Add trial_ends_at TIMESTAMPTZ with default now() + 7 days
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '7 days') NOT NULL;

-- 4. Add optional subscription_ends_at TIMESTAMPTZ
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- 5. Add PostgreSQL comments
COMMENT ON COLUMN public.stores.plan_type IS 'Billing tier: trial, monthly, or yearly.';
COMMENT ON COLUMN public.stores.subscription_status IS 'Active subscription lifecycle status: active, expired, or suspended.';
COMMENT ON COLUMN public.stores.trial_ends_at IS 'The timestamp when the merchant trial period expires.';
COMMENT ON COLUMN public.stores.subscription_ends_at IS 'The timestamp when the paid subscription ends.';
