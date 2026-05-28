-- Migration: Add dynamic product options & variants support via JSONB
-- Path: supabase/migrations/005_product_variants.sql

-- Add nullable 'options' JSONB column to the existing products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb;

-- Comment on column for documentation
COMMENT ON COLUMN public.products.options IS 'Stores optional product variants & custom prices. Structure: Array of { name: string, hasCustomPrice: boolean, values: Array<{ value: string, price: number | null }> }';
