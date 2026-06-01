-- Migration 007: Platform Funnel Events for Registration Analytics
-- =============================================================================

-- 1. Create platform_funnel_events table
CREATE TABLE IF NOT EXISTS public.platform_funnel_events (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID         NOT NULL,
  event_name  TEXT         NOT NULL CONSTRAINT platform_funnel_event_name_check CHECK (
    event_name IN ('register_viewed', 'step1_started', 'step1_completed', 'step2_started', 'register_success')
  ),
  metadata    JSONB,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.platform_funnel_events ENABLE ROW LEVEL SECURITY;

-- 3. Define Secure RLS Policies
-- Public can INSERT analytics anonymously (required for landing/registration flow tracking)
CREATE POLICY "platform_funnel_events_public_insert"
  ON public.platform_funnel_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated select policy
CREATE POLICY "platform_funnel_events_authenticated_read"
  ON public.platform_funnel_events
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. High-Performance Database Indexes
CREATE INDEX IF NOT EXISTS idx_platform_funnel_events_name_created
  ON public.platform_funnel_events(event_name, created_at);

CREATE INDEX IF NOT EXISTS idx_platform_funnel_events_session
  ON public.platform_funnel_events(session_id);

-- 5. Optimized RPC aggregator function to fetch COUNT(DISTINCT session_id) securely
CREATE OR REPLACE FUNCTION public.get_unique_funnel_count(target_event TEXT)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT session_id) 
    FROM public.platform_funnel_events 
    WHERE event_name = target_event
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
