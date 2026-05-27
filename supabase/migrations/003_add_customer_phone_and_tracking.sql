-- Migration 003: Add Customer Phone, Tracking columns, and Shipped status to orders table

-- 1. Add customer_phone as TEXT, defaulting to empty string first to ensure no constraint violations on existing rows
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT DEFAULT '';
ALTER TABLE public.orders ALTER COLUMN customer_phone DROP DEFAULT;
ALTER TABLE public.orders ALTER COLUMN customer_phone SET NOT NULL;

-- 2. Add optional tracking_url as TEXT
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- 3. Modify orders_fulfillment_status_values constraint to support 'shipped' status
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_fulfillment_status_values;
ALTER TABLE public.orders ADD CONSTRAINT orders_fulfillment_status_values 
  CHECK (fulfillment_status IN ('pending', 'shipped', 'delivered', 'cancelled'));

-- 4. Document the new columns with PostgreSQL comments
COMMENT ON COLUMN public.orders.customer_phone IS 'Normalized E.164 phone number of the customer placing the order.';
COMMENT ON COLUMN public.orders.tracking_url IS 'Optional shipment tracking URL provided by the merchant when shipped.';
