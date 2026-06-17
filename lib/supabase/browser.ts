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
 * Configured as a singleton to avoid multiple GoTrueClient instances
 * and ensure synchronized auth session states across all components.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createBrowserClient } from "@supabase/ssr";

let clientInstance: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient(): any {
  if (!clientInstance) {
    clientInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return clientInstance;
}
