-- Migration 006: Add Inventory Status, Announcements, Custom Description, and Analytics tracking
-- =============================================================================

-- 1. Add is_available column to public.products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true;

-- 2. Add announcement_text and description columns to public.stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS announcement_text TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Create public.store_analytics table for background non-blocking tracking
CREATE TABLE IF NOT EXISTS public.store_analytics (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID         NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  event_type TEXT         NOT NULL CONSTRAINT store_analytics_type_check CHECK (event_type IN ('view', 'whatsapp_click')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.store_analytics ENABLE ROW LEVEL SECURITY;

-- 5. Define Secure RLS Policies
-- Public can INSERT analytics anonymously (required for customer tracking)
CREATE POLICY "store_analytics_public_insert"
  ON public.store_analytics
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Merchants can only SELECT their own store's analytics
CREATE POLICY "store_analytics_merchant_read"
  ON public.store_analytics
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
    )
  );

-- 6. High-Performance Database Indexes
CREATE INDEX IF NOT EXISTS idx_store_analytics_store_created 
  ON public.store_analytics(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_store_analytics_event_type 
  ON public.store_analytics(event_type);
