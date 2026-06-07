-- Migration 008: Add Pricing Plans and limits to stores

-- 1. Create public.plans table
CREATE TABLE IF NOT EXISTS public.plans (
  id                     TEXT        PRIMARY KEY,
  name                   TEXT        NOT NULL,
  name_ar                TEXT        NOT NULL,
  price                  NUMERIC     NOT NULL,
  max_products           INTEGER     NOT NULL, -- -1 denotes unlimited
  max_categories         INTEGER     NOT NULL, -- -1 denotes unlimited
  max_images_per_product INTEGER     NOT NULL, -- -1 denotes unlimited
  max_orders_per_month   INTEGER     NOT NULL, -- -1 denotes unlimited
  remove_branding        BOOLEAN     NOT NULL DEFAULT FALSE
);

-- Comment on table and columns
COMMENT ON TABLE public.plans IS 'Global pricing plans definitions and limits.';
COMMENT ON COLUMN public.plans.id IS 'Plan identifier: free, starter, or pro.';
COMMENT ON COLUMN public.plans.max_products IS 'Maximum number of products allowed. -1 is unlimited.';
COMMENT ON COLUMN public.plans.max_categories IS 'Maximum number of categories allowed. -1 is unlimited.';
COMMENT ON COLUMN public.plans.max_images_per_product IS 'Maximum number of images allowed per product. -1 is unlimited.';
COMMENT ON COLUMN public.plans.max_orders_per_month IS 'Maximum number of orders allowed per month. -1 is unlimited.';

-- 2. Insert plans metadata
INSERT INTO public.plans (id, name, name_ar, price, max_products, max_categories, max_images_per_product, max_orders_per_month, remove_branding)
VALUES
  ('free', 'Free', 'المجانية', 0, 15, 3, 2, 100, FALSE),
  ('starter', 'Starter', 'البداية', 5, 100, 15, 4, 500, FALSE),
  ('pro', 'Pro', 'الاحترافية', 15, -1, -1, -1, -1, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  price = EXCLUDED.price,
  max_products = EXCLUDED.max_products,
  max_categories = EXCLUDED.max_categories,
  max_images_per_product = EXCLUDED.max_images_per_product,
  max_orders_per_month = EXCLUDED.max_orders_per_month,
  remove_branding = EXCLUDED.remove_branding;

-- 3. Add plan_tier column to public.stores table referencing public.plans
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS plan_tier TEXT REFERENCES public.plans(id) DEFAULT 'free';

-- Update any null plan_tier values to 'free' (safety check)
UPDATE public.stores SET plan_tier = 'free' WHERE plan_tier IS NULL;

-- Make plan_tier NOT NULL
ALTER TABLE public.stores ALTER COLUMN plan_tier SET NOT NULL;

-- Comment on column
COMMENT ON COLUMN public.stores.plan_tier IS 'Pricing plan tier reference: free, starter, or pro.';
