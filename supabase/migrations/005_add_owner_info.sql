-- Migration 005: Add owner_email and owner_name to stores table for administrative reporting

-- 1. Add owner_email and owner_name columns
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS owner_name TEXT;

-- 2. Populate existing stores from auth.users
UPDATE public.stores s
SET owner_email = u.email,
    owner_name = COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
WHERE s.owner_id = u.id;

-- 3. Add PostgreSQL comments
COMMENT ON COLUMN public.stores.owner_email IS 'Cached email address of the store owner for administrative visibility.';
COMMENT ON COLUMN public.stores.owner_name IS 'Cached full name of the store owner.';
