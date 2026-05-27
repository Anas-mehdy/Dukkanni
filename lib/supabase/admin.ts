/**
 * lib/supabase/admin.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Supabase Administrative Client (RLS Bypass)
 *
 * This client utilizes the Supabase Service Role Key to execute privileged
 * queries, allowing the Super Admin dashboard to select and modify all merchants
 * across the platform regardless of merchant Row Level Security (RLS) policies.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.warn(
      "⚠️ [SupabaseAdmin] SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables. Admin operations will fallback to standard client and be restricted by Row Level Security (RLS)."
    );
    // Graceful fallback to the anon key if not set yet, so page loads but only shows own store
    return createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
