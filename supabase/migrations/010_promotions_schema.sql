-- Migration 010: Coupon and Promotions System Schema
-- Adds the promotions table and integrates promotion details into the orders table.

CREATE TABLE IF NOT EXISTS public.promotions (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID          NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name           TEXT          NOT NULL CONSTRAINT promotions_name_length CHECK (char_length(name) BETWEEN 1 AND 120),
  
  -- Coupon code: UPPERCASE alphanumeric string. If NULL, this is an automatic store-wide discount.
  code           TEXT,
  
  discount_type  TEXT          NOT NULL CONSTRAINT promotions_discount_type_values CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL CONSTRAINT promotions_discount_value_positive CHECK (discount_value >= 0),
  
  start_date     TIMESTAMPTZ   NOT NULL,
  end_date       TIMESTAMPTZ   NOT NULL,
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
  
  -- Usage limit: optional. NULL = unlimited.
  max_uses       INTEGER       CONSTRAINT promotions_max_uses_positive CHECK (max_uses IS NULL OR max_uses > 0),
  
  -- Extensibility fields for future features (e.g. Category/Product specific, Buy X Get Y, Free Shipping)
  target_type    TEXT          NOT NULL DEFAULT 'all' CONSTRAINT promotions_target_type_values CHECK (target_type IN ('all', 'category', 'product', 'shipping')),
  target_id      UUID,         -- References category_id or product_id if target_type is category or product
  
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  
  -- Coupon code must be unique per store (case-insensitive check is enforced by UPPERCASE storage in code)
  CONSTRAINT promotions_code_store_unique UNIQUE (store_id, code),
  CONSTRAINT promotions_dates_check CHECK (start_date <= end_date)
);

COMMENT ON TABLE  public.promotions                IS 'Promotions and coupon codes scoped to a store.';
COMMENT ON COLUMN public.promotions.code           IS 'Coupon code. If NULL, discount applies automatically store-wide.';
COMMENT ON COLUMN public.promotions.max_uses       IS 'Optional limit on total coupon redemptions.';

-- Modify orders table to record applied coupon/promotion details
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CONSTRAINT orders_discount_amount_positive CHECK (discount_amount >= 0);

COMMENT ON COLUMN public.orders.promotion_id       IS 'Reference to the applied promotion or coupon.';
COMMENT ON COLUMN public.orders.coupon_code        IS 'Snapshot of the coupon code applied (in case promotion is deleted).';
COMMENT ON COLUMN public.orders.discount_amount    IS 'Snapshot of the discount amount subtracted from the order total.';

-- Index for analytics and RLS query efficiency
CREATE INDEX IF NOT EXISTS idx_orders_promotion_id 
  ON public.orders(promotion_id) 
  WHERE promotion_id IS NOT NULL;

-- Enable RLS and define security policies
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Merchant has full CRUD on promotions for their own store
CREATE POLICY "promotions_merchant_all"
  ON public.promotions
  FOR ALL
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );

-- Public (anonymous customers) can SELECT active promotions for active stores
CREATE POLICY "promotions_public_read_active"
  ON public.promotions
  FOR SELECT
  TO anon
  USING (
    is_active = TRUE
    AND store_id IN (
      SELECT id FROM public.stores WHERE is_active = TRUE
    )
  );
