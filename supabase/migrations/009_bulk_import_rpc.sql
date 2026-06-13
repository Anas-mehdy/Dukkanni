-- Migration 009: Bulk Import RPC function for transaction-safe product imports

CREATE OR REPLACE FUNCTION public.import_products_and_categories(
  p_store_id UUID,
  p_categories TEXT[],
  p_products JSONB
) RETURNS VOID AS $$
DECLARE
  v_category_name TEXT;
  v_category_id UUID;
  v_product RECORD;
BEGIN
  -- 1. Insert missing categories
  IF p_categories IS NOT NULL THEN
    FOREACH v_category_name IN ARRAY p_categories LOOP
      IF v_category_name IS NOT NULL AND TRIM(v_category_name) <> '' THEN
        -- Check if category exists (case-insensitive check)
        SELECT id INTO v_category_id 
        FROM public.categories 
        WHERE store_id = p_store_id AND LOWER(TRIM(name)) = LOWER(TRIM(v_category_name));
        
        -- If not exists, insert it
        IF v_category_id IS NULL THEN
          INSERT INTO public.categories (store_id, name, sort_order)
          VALUES (p_store_id, TRIM(v_category_name), 0);
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- 2. Insert products
  FOR v_product IN SELECT * FROM jsonb_to_recordset(p_products) AS x(
    name TEXT,
    price NUMERIC,
    category_name TEXT,
    image_url TEXT,
    options JSONB
  ) LOOP
    -- Resolve category_id by name (case-insensitive)
    IF v_product.category_name IS NOT NULL AND TRIM(v_product.category_name) <> '' THEN
      SELECT id INTO v_category_id 
      FROM public.categories 
      WHERE store_id = p_store_id AND LOWER(TRIM(name)) = LOWER(TRIM(v_product.category_name));
    ELSE
      v_category_id := NULL;
    END IF;

    -- Insert product
    INSERT INTO public.products (
      store_id,
      category_id,
      name,
      price,
      image_url,
      options,
      is_active,
      is_available,
      sort_order
    ) VALUES (
      p_store_id,
      v_category_id,
      TRIM(v_product.name),
      v_product.price,
      NULLIF(TRIM(v_product.image_url), ''),
      COALESCE(v_product.options, '[]'::jsonb),
      TRUE,
      TRUE,
      0
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
