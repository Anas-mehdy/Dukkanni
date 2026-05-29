/**
 * lib/supabase/browser.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Browser (Client-Side) Supabase Client
 *
 * Use this in:
 *   - Client Components ("use client")
 *   - Custom React hooks
 *   - Anywhere cookies are managed by @supabase/ssr automatically
 *
 * createBrowserClient() is internally deduplicated per URL+key pair,
 * so it is safe to call inside hooks and components without useMemo.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createBrowserClient } from "@supabase/ssr";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient(): any {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
