/**
 * lib/supabase/server.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Supabase Server Client
 *
 * Use this client in:
 *   - Server Components (RSC)
 *   - Route Handlers (app/api/*)
 *   - Server Actions
 *
 * Returns an untyped client to avoid TypeScript inference issues with the
 * Database generic in route handlers. Type safety is enforced by the Zod
 * validation layer and explicit column selects.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Returns a Supabase client configured for server-side use.
 * Reads and writes auth cookies via the Next.js cookies() store.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createClient(): Promise<any> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]);
            });
          } catch {
            // setAll() may throw in Server Components where cookies are read-only.
            // This is safe to ignore — the middleware handles session refresh.
          }
        },
      },
    }
  );
}
