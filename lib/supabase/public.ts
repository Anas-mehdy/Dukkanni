/**
 * lib/supabase/public.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Public (un-authed) Supabase Client
 *
 * Use this client for:
 *   - ISR / Server Component pages that MUST NOT call cookies()
 *   - API route handlers that serve public (unauthenticated) requests
 *
 * Returns an untyped client — type safety enforced by Zod + explicit selects.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPublicClient(): any {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
