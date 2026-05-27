/**
 * lib/supabase/client.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Supabase Browser Client
 *
 * Use this client in:
 *   - Client Components ("use client")
 *   - Custom hooks (useCart, useOrders, etc.)
 *
 * Creates a singleton instance per browser tab to avoid multiple
 * GoTrueClient instances warning from @supabase/auth-js.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Returns a Supabase client configured for use in browser (client) contexts.
 * Safe to call multiple times — @supabase/ssr handles singleton internally.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
