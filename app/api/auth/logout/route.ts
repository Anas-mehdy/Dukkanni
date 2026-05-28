/**
 * app/api/auth/logout/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Secure Logout Endpoint
 *
 * POST /api/auth/logout
 *
 * Signs out the authenticated user via Supabase Auth and clears all
 * session cookies, then redirects to /login.
 *
 * Using a Route Handler (not a Server Action) because:
 *   - It works cleanly from both client-side fetch() and <form> submit.
 *   - Gives us full cookie-clear control via @supabase/ssr.
 *   - Is callable from the nav bar without the overhead of a full page reload.
 *
 * Client usage (from nav button):
 *   const res = await fetch("/api/auth/logout", { method: "POST" });
 *   router.replace(res.url); // follows the redirect to /login
 *   // — OR — simply:
 *   await fetch("/api/auth/logout", { method: "POST" });
 *   router.replace("/login");
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Signs out server-side and instructs @supabase/ssr to clear all
  // auth cookies via Set-Cookie headers on the response.
  await supabase.auth.signOut();

  // Redirect to /login — dynamically constructed from request.url to match production domain
  return Response.redirect(
    new URL("/login", request.url),
    302
  );
}
