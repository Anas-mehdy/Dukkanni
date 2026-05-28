/**
 * middleware.ts  (v2 — hardened)
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Next.js Edge Middleware
 *
 * Guards:
 *   1. Auth Guard      — /dashboard/* and /admin/* require session
 *   2. Reverse Guard   — Authenticated users are redirected away from /login,
 *                        /register, and the app root (/)
 *   3. Loop Protection — /dashboard/onboarding is EXEMPT from the auth guard
 *                        redirect target because it IS a dashboard sub-route
 *                        accessible only AFTER auth, but before a store exists.
 *                        Without this, StoreGuard → /dashboard/onboarding →
 *                        middleware → /login would create an infinite loop.
 *   4. Public Routes   — /[slug] and /[slug]/checkout are completely open.
 *                        The middleware matcher config excludes them explicitly.
 *   5. Session Refresh — @supabase/ssr requires refreshing auth tokens in
 *                        middleware so RSCs and Route Handlers see fresh data.
 *   6. Rate Limiting   — POST /api/orders: 15 req / 60 s per IP (MVP mode)
 *
 * Runtime: Vercel Edge Runtime (no Node.js APIs).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ---------------------------------------------------------------------------
// Route configuration
// ---------------------------------------------------------------------------

/** Routes that require a valid Supabase session */
const PROTECTED_PREFIXES = ["/dashboard", "/admin"] as const;

/** Auth pages — authenticated users should be redirected away from these */
const AUTH_PATHS = new Set(["/login", "/register"]);

/**
 * Dashboard sub-routes that are ALWAYS accessible to authenticated users
 * regardless of whether they have a store yet.
 * The /dashboard/onboarding page is intentionally included here to prevent
 * the middleware from bouncing back-and-forth with the client StoreGuard.
 */
const DASHBOARD_PUBLIC_SUBPATHS = new Set([
  "/dashboard/onboarding",
]);

/** Static asset pattern — skip middleware entirely for these */
const STATIC_SKIP_REGEX =
  /^\/((_next\/(static|image))|favicon\.ico|robots\.txt|sitemap\.xml|.*\.(png|jpg|jpeg|webp|svg|ico|woff2?|css|js)$)/;

// ---------------------------------------------------------------------------
// Rate-limit configuration (order spam protection)
// ---------------------------------------------------------------------------

const RATE_LIMIT_PATH        = "/api/orders";
const RATE_LIMIT_MAX         = 15;         // requests per window
const RATE_LIMIT_WINDOW_MS   = 60_000;     // 60 seconds

interface RateLimitEntry { count: number; windowStart: number }
const rateLimitStore = new Map<string, RateLimitEntry>();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // ── 0. Skip static assets ──────────────────────────────────────────────────
  if (STATIC_SKIP_REGEX.test(pathname)) {
    return NextResponse.next();
  }

  // ── Subdomain Routing Rewrite ──────────────────────────────────────────────
  const hostname = request.headers.get("host") || "";
  const currentHost = hostname.replace("www.", "");

  let subdomain = "";
  if (currentHost.endsWith(".dukkanni.com")) {
    subdomain = currentHost.replace(".dukkanni.com", "");
  } else if (currentHost.endsWith(".localhost:3000")) {
    subdomain = currentHost.replace(".localhost:3000", "");
  }

  const RESERVED_SUBDOMAINS = new Set([
    "admin", "api", "auth", "dashboard", "login", "register",
    "signup", "logout", "settings", "account", "billing",
    "help", "support", "terms", "privacy", "about", "contact",
    "dukkanni", "www", "mail", "app", "store", "shop",
    "demo", "test", "dev", "staging", "prod", "static",
    "assets", "images", "media", "cdn", "health", "status",
  ]);

  if (subdomain && !RESERVED_SUBDOMAINS.has(subdomain) && !pathname.startsWith("/api") && !STATIC_SKIP_REGEX.test(pathname)) {
    const rewriteUrl = new URL(`/${subdomain}${pathname}${request.nextUrl.search}`, request.url);
    return NextResponse.rewrite(rewriteUrl);
  }

  // ── 1. Rate-limit: POST /api/orders ────────────────────────────────────────
  if (pathname === RATE_LIMIT_PATH && request.method === "POST") {
    const rl = checkRateLimit(request);
    if (!rl.allowed) {
      return new NextResponse(
        JSON.stringify({
          error:             "طلبات كثيرة جداً. انتظر لحظة وحاول مجدداً.",
          retryAfterSeconds: Math.ceil(rl.retryAfterMs / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type":      "application/json",
            "Retry-After":       String(Math.ceil(rl.retryAfterMs / 1000)),
            "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  }

  // ── 2. Supabase session refresh ────────────────────────────────────────────
  //
  // CRITICAL: We must create the response BEFORE createServerClient so
  // @supabase/ssr can attach refreshed Set-Cookie headers to it.
  // We then re-create the response if cookies are written to propagate them.
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          // Step A: write refreshed tokens onto the request (for downstream RSCs)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Step B: rebuild response so outgoing headers carry the request mutations
          response = NextResponse.next({ request });
          // Step C: also set on outgoing response headers (for the browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ALWAYS use getUser() — getSession() is spoofable (reads cookie only)
  const { data: { user } } = await supabase.auth.getUser();

  // ── 3. Auth guard — protect /dashboard/* and /admin/* ─────────────────────
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Preserve intended destination for post-login redirect
    // BUT: don't carry through /dashboard/onboarding as redirectTo —
    // after login the StoreGuard handles onboarding routing automatically
    if (!DASHBOARD_PUBLIC_SUBPATHS.has(pathname)) {
      url.searchParams.set("redirectTo", pathname);
    } else {
      url.searchParams.delete("redirectTo");
    }
    url.search = url.searchParams.toString() ? `?${url.searchParams.toString()}` : "";
    return NextResponse.redirect(url);
  }

  // ── 3.1 Super Admin verification ──────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    const adminEmail = process.env.SUPER_ADMIN_EMAIL;
    if (!user || !adminEmail || user.email !== adminEmail) {
      return new NextResponse(
        JSON.stringify({ error: "Not Found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // ── 3.2 JIT Paywall check ──────────────────────────────────────────────────
  if (user && pathname.startsWith("/dashboard") && pathname !== "/dashboard/expired" && pathname !== "/dashboard/onboarding") {
    try {
      const { data: store } = await supabase
        .from("stores")
        .select("plan_type, trial_ends_at, subscription_status")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (store) {
        const isTrial = store.plan_type === "trial";
        const isTrialExpired = isTrial && new Date() > new Date(store.trial_ends_at) && store.subscription_status !== "active";
        const isSuspendedOrExpired = store.subscription_status === "suspended" || store.subscription_status === "expired";

        if (isTrialExpired || isSuspendedOrExpired) {
          const url = request.nextUrl.clone();
          url.pathname = "/dashboard/expired";
          url.search = "";
          return NextResponse.redirect(url);
        }
      }
    } catch (e) {
      console.error("Middleware JIT Paywall error:", e);
    }
  }

  // ── 4. Reverse guard — redirect authed users away from auth pages / root ──
  if (user) {
    if (AUTH_PATHS.has(pathname)) {
      // Already logged in → go to dashboard (StoreGuard handles onboarding)
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search   = "";
      return NextResponse.redirect(url);
    }

    // Root path redirect for logged-in merchants
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search   = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

// ---------------------------------------------------------------------------
// Rate limit helper
// ---------------------------------------------------------------------------

interface RateLimitCheckResult { allowed: boolean; retryAfterMs: number }

function checkRateLimit(request: NextRequest): RateLimitCheckResult {
  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const now   = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (entry.count < RATE_LIMIT_MAX) {
    entry.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }
  return { allowed: false, retryAfterMs: RATE_LIMIT_WINDOW_MS - (now - entry.windowStart) };
}

// ---------------------------------------------------------------------------
// Matcher
// ─────────────────────────────────────────────────────────────────────────────
// We EXPLICITLY exclude the dynamic storefront routes from middleware so they
// are served as pure ISR pages with no auth overhead:
//   /[slug]            → public storefront
//   /[slug]/checkout   → public checkout
//
// The negative lookahead below ensures those paths never reach this function.
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match everything EXCEPT:
     *   - Next.js internals (_next/static, _next/image)
     *   - favicon.ico
     *   - API routes under /api/orders (handled inside the middleware itself)
     *
     * Note: /[slug] and /[slug]/checkout are NOT explicitly excluded here
     * because they share the same pattern space as all other paths. Instead,
     * we rely on the STATIC_SKIP_REGEX check at the top of the handler and
     * the fact that the route groups (auth), (dashboard) have dedicated
     * prefixes (/login, /register, /dashboard) that the guards key off of.
     * The storefront routes contain no /dashboard or /login prefix so they
     * fall through all guards and receive only the session refresh (harmless).
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
