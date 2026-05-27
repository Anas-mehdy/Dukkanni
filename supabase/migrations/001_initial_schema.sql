-- =============================================================================
-- Dukkanni — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- =============================================================================
-- Run this in your Supabase SQL Editor or via `supabase db push`.
-- Requires: Supabase project with auth.users table (built-in).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
-- gen_random_uuid() is available by default in Supabase (pg 14+),
-- but we enable pgcrypto as a safety net for older instances.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- TABLE: stores
-- The tenant root. One row per merchant account.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.stores (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Public-facing URL segment: dukkanni.com/[slug]
  slug          TEXT        NOT NULL
                            CONSTRAINT stores_slug_length
                              CHECK (char_length(slug) BETWEEN 4 AND 48)
                            CONSTRAINT stores_slug_format
                              CHECK (slug ~ '^[a-z0-9][a-z0-9\-]*[a-z0-9]$'),

  name          TEXT        NOT NULL
                            CONSTRAINT stores_name_length CHECK (char_length(name) BETWEEN 1 AND 80),

  -- E.164 normalized phone: +905321234567
  -- Sanitization is enforced in application code before insert.
  whatsapp_e164 TEXT        NOT NULL
                            CONSTRAINT stores_phone_format
                              CHECK (whatsapp_e164 ~ '^\+[1-9]\d{6,14}$'),

  logo_url      TEXT,
  currency_code CHAR(3)     NOT NULL DEFAULT 'TRY',
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.stores                IS 'Tenant root. One store per merchant Supabase Auth account.';
COMMENT ON COLUMN public.stores.slug           IS 'URL-safe identifier. Used in: dukkanni.com/[slug].';
COMMENT ON COLUMN public.stores.whatsapp_e164  IS 'Normalized E.164 phone number. Validated by sanitizePhone() in app code.';
COMMENT ON COLUMN public.stores.currency_code  IS 'ISO 4217 currency code. Default TRY for Turkey.';


-- =============================================================================
-- TABLE: categories
-- Logical groupings of products within a store.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID        NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL
                         CONSTRAINT categories_name_length CHECK (char_length(name) BETWEEN 1 AND 60),
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.categories            IS 'Product categories scoped to a store.';
COMMENT ON COLUMN public.categories.sort_order IS 'Ascending display order on the storefront.';


-- =============================================================================
-- TABLE: products
-- Individual items for sale. Always scoped to a store.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID          NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID          REFERENCES public.categories(id) ON DELETE SET NULL,

  -- 60-char cap prevents WhatsApp message truncation (see whatsapp.ts).
  name        TEXT          NOT NULL
                            CONSTRAINT products_name_length
                              CHECK (char_length(name) BETWEEN 1 AND 60),

  price       NUMERIC(10,2) NOT NULL DEFAULT 0
                            CONSTRAINT products_price_positive CHECK (price >= 0),

  image_url   TEXT,         -- Supabase Storage public URL (WebP via Transform API)
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order  SMALLINT      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.products              IS 'Products for sale. Scoped to a store. Soft-deleted via is_active flag.';
COMMENT ON COLUMN public.products.name         IS 'Max 60 chars to prevent WhatsApp pre-fill URL truncation.';
COMMENT ON COLUMN public.products.image_url    IS 'Supabase Storage URL. Served via Transform API as WebP 400px.';


-- =============================================================================
-- TABLE: orders
-- An order header. Append-only — data columns are never updated after insert.
-- Only fulfillment_status and payment_status are mutable post-insert.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id           UUID          NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name      TEXT          NOT NULL
                                   CONSTRAINT orders_customer_name_length
                                     CHECK (char_length(customer_name) BETWEEN 1 AND 80),

  -- Snapshot of currency at order time (store may change currency later)
  total_amount       NUMERIC(10,2) NOT NULL CONSTRAINT orders_total_positive CHECK (total_amount >= 0),
  currency_code      CHAR(3)       NOT NULL,

  -- Lifecycle flags — only these two columns should ever be UPDATE-d
  payment_status     TEXT          NOT NULL DEFAULT 'cod_pending'
                                   CONSTRAINT orders_payment_status_values
                                     CHECK (payment_status IN ('cod_pending', 'paid', 'refunded')),

  fulfillment_status TEXT          NOT NULL DEFAULT 'pending'
                                   CONSTRAINT orders_fulfillment_status_values
                                     CHECK (fulfillment_status IN ('pending', 'delivered', 'cancelled')),

  -- Timestamp recorded server-side after the WhatsApp redirect URL is built.
  -- NULL = order was saved but customer did not complete WhatsApp redirect.
  whatsapp_sent_at   TIMESTAMPTZ,

  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.orders                      IS 'Order header. Append-only. Only status columns are mutable.';
COMMENT ON COLUMN public.orders.whatsapp_sent_at     IS 'Set after the wa.me redirect fires. NULL = order abandoned pre-redirect.';
COMMENT ON COLUMN public.orders.currency_code        IS 'Snapshot of store currency at the moment the order was placed.';


-- =============================================================================
-- TABLE: order_items
-- Line items for each order. Fully snapshotted — no FK dependency on
-- product name/price so historic orders survive product edits.
-- store_id is DENORMALIZED here for flat RLS and zero-JOIN analytics queries.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID          NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,

  -- Denormalized: populated server-side only (never from client body).
  store_id     UUID          NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,

  -- Nullable FK — product may be deleted after order is placed.
  -- All display data comes from the snapshot columns below.
  product_id   UUID          REFERENCES public.products(id) ON DELETE SET NULL,

  -- Immutable snapshots captured at checkout time
  product_name TEXT          NOT NULL
                             CONSTRAINT order_items_product_name_length
                               CHECK (char_length(product_name) BETWEEN 1 AND 60),
  unit_price   NUMERIC(10,2) NOT NULL CONSTRAINT order_items_price_positive CHECK (unit_price >= 0),
  quantity     SMALLINT      NOT NULL CONSTRAINT order_items_quantity_positive CHECK (quantity > 0)
);

COMMENT ON TABLE  public.order_items              IS 'Order line items. Fully snapshotted — survives product edits/deletes.';
COMMENT ON COLUMN public.order_items.store_id     IS 'Denormalized for flat RLS. Always set server-side, never from client.';
COMMENT ON COLUMN public.order_items.product_name IS 'Snapshot of product name at order time.';
COMMENT ON COLUMN public.order_items.unit_price   IS 'Snapshot of unit price at order time.';


-- =============================================================================
-- INDEXES
-- Ordered by query hotness (most frequent → first).
-- =============================================================================

-- stores: slug lookup is the absolute hottest path (every page view)
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_slug
  ON public.stores(slug);

-- stores: dashboard load — merchant fetches their own store
CREATE INDEX IF NOT EXISTS idx_stores_owner_id
  ON public.stores(owner_id);

-- categories: storefront product grouping
CREATE INDEX IF NOT EXISTS idx_categories_store_sort
  ON public.categories(store_id, sort_order ASC);

-- products: storefront listing — active products per store, ordered
CREATE INDEX IF NOT EXISTS idx_products_store_active_sort
  ON public.products(store_id, is_active, sort_order ASC);

-- products: filter by category (category page / section)
CREATE INDEX IF NOT EXISTS idx_products_store_category
  ON public.products(store_id, category_id)
  WHERE category_id IS NOT NULL;

-- orders: dashboard list — all pending orders for a store, newest first
CREATE INDEX IF NOT EXISTS idx_orders_store_status_date
  ON public.orders(store_id, fulfillment_status, created_at DESC);

-- orders: daily aggregation (Analytics Layer 1) — today's pending orders
-- Partial index on pending only — the set that matters for fulfillment
CREATE INDEX IF NOT EXISTS idx_orders_store_pending_date
  ON public.orders(store_id, created_at DESC)
  WHERE fulfillment_status = 'pending';

-- order_items: analytics join from order → items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON public.order_items(order_id);

-- order_items: Analytics Layer 1 — aggregate quantities by store
CREATE INDEX IF NOT EXISTS idx_order_items_store_id
  ON public.order_items(store_id);


-- =============================================================================
-- UPDATED_AT TRIGGER
-- Automatically maintains the updated_at column for mutable tables.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stores_updated_at ON public.stores;
CREATE TRIGGER trg_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
-- NOTE: orders intentionally has NO updated_at trigger.
-- Only fulfillment_status / payment_status should change,
-- and created_at alone is sufficient for ordering.


-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Rule: store_id is ALWAYS derived from auth.uid() — never from request body.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- stores
-- ---------------------------------------------------------------------------
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Merchant can read/update/delete ONLY their own store
CREATE POLICY "stores_merchant_all"
  ON public.stores
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Public: anyone can read basic info for active stores (needed for storefront SSR)
CREATE POLICY "stores_public_read_active"
  ON public.stores
  FOR SELECT
  TO anon
  USING (is_active = TRUE);


-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Merchant manages their own store's categories
CREATE POLICY "categories_merchant_all"
  ON public.categories
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

-- Public: storefront reads active store categories
CREATE POLICY "categories_public_read"
  ON public.categories
  FOR SELECT
  TO anon
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE is_active = TRUE
    )
  );


-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Merchant manages all their products (including inactive ones)
CREATE POLICY "products_merchant_all"
  ON public.products
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

-- Public: storefront reads only ACTIVE products from ACTIVE stores
CREATE POLICY "products_public_read_active"
  ON public.products
  FOR SELECT
  TO anon
  USING (
    is_active = TRUE
    AND store_id IN (
      SELECT id FROM public.stores WHERE is_active = TRUE
    )
  );


-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Merchant reads and updates orders for their store
CREATE POLICY "orders_merchant_read_update"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "orders_merchant_update_status"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  )
  -- Only allow updating the two lifecycle columns
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );

-- Public (anon): customers can INSERT orders only.
-- store_id must be a valid, active store — enforced by FK + CHECK.
CREATE POLICY "orders_public_insert"
  ON public.orders
  FOR INSERT
  TO anon
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE is_active = TRUE
    )
  );


-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Merchant reads all items for their store's orders
CREATE POLICY "order_items_merchant_read"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );

-- Public (anon): customers can INSERT items — store_id validated server-side.
CREATE POLICY "order_items_public_insert"
  ON public.order_items
  FOR INSERT
  TO anon
  WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores WHERE is_active = TRUE
    )
  );


-- =============================================================================
-- RESERVED SLUGS
-- Block system-level, brand, and commonly squatted slugs.
-- Any attempt to INSERT/UPDATE a store with these slugs will fail the
-- stores_slug_reserved CHECK constraint.
-- =============================================================================
ALTER TABLE public.stores
  ADD CONSTRAINT stores_slug_reserved CHECK (
    slug NOT IN (
      'admin', 'api', 'auth', 'dashboard', 'login', 'register',
      'signup', 'logout', 'settings', 'account', 'billing',
      'help', 'support', 'terms', 'privacy', 'about', 'contact',
      'dukkanni', 'www', 'mail', 'app', 'store', 'shop',
      'demo', 'test', 'dev', 'staging', 'prod', 'static',
      'assets', 'images', 'media', 'cdn', 'health', 'status'
    )
  );


-- =============================================================================
-- ANALYTICS HELPER VIEW
-- Layer 1: Daily product aggregation for the fulfillment center.
-- Sums total quantity of each product across all pending orders today.
-- Merchant-scoped via RLS on the underlying tables.
-- =============================================================================
CREATE OR REPLACE VIEW public.v_daily_fulfillment AS
SELECT
  oi.store_id,
  oi.product_id,
  oi.product_name,
  oi.unit_price,
  SUM(oi.quantity)::INT AS total_quantity,
  SUM(oi.quantity * oi.unit_price)::NUMERIC(12,2) AS total_value,
  COUNT(DISTINCT o.id)::INT AS order_count
FROM public.order_items oi
JOIN public.orders o
  ON o.id = oi.order_id
WHERE
  o.fulfillment_status = 'pending'
  AND o.created_at >= CURRENT_DATE          -- today (UTC)
  AND o.created_at <  CURRENT_DATE + 1      -- strict upper bound
GROUP BY
  oi.store_id,
  oi.product_id,
  oi.product_name,
  oi.unit_price
ORDER BY
  total_quantity DESC;

COMMENT ON VIEW public.v_daily_fulfillment IS
  'Analytics Layer 1: total quantities per product for today''s pending orders. Merchant-scoped via RLS on order_items.';
