"use client";

/**
 * app/(dashboard)/layout.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Merchant Dashboard Shell
 *
 * Mobile-first layout with:
 *   - Fixed top header (store name + logout)
 *   - Fixed bottom navigation bar (5 tabs)
 *   - Scrollable content area between them
 *   - ToastProvider wrapping all dashboard pages
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ToastProvider } from "@/components/ui/Toast";
import { useTheme } from "@/hooks/useTheme";
import type { ReactNode } from "react";
import SubscriptionBanner from "@/components/dashboard/SubscriptionBanner";

// ---------------------------------------------------------------------------
// Store Guard — silently redirects to onboarding if merchant has no store
// ---------------------------------------------------------------------------

function StoreGuard({ children }: { children: ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip check if already on onboarding
    if (pathname === "/dashboard/onboarding") return;

    fetch("/api/store")
      .then((r) => {
        if (r.status === 404) router.replace("/dashboard/onboarding");
      })
      .catch(() => {}); // Silent fail — don't block if API is unreachable
  }, [pathname, router]);

  return <>{children}</>;
}

const NAV_ITEMS = [
  {
    href:  "/dashboard",
    label: "الرئيسية",
    exact:  true,
    icon:  (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href:  "/dashboard/products",
    label: "المنتجات",
    exact:  false,
    icon:  (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
    ),
  },
  {
    href:  "/dashboard/categories",
    label: "الفئات",
    exact:  false,
    icon:  (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href:  "/dashboard/orders",
    label: "الطلبات",
    exact:  false,
    icon:  (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    href:  "/dashboard/settings",
    label: "الإعدادات",
    exact:  false,
    icon:  (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
] as const;

function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="التنقل الرئيسي"
      style={{
        position:      "fixed",
        bottom:        0,
        left:          0,
        right:         0,
        height:        "var(--bottom-nav-h)",
        background:    "var(--color-surface)",
        borderTop:     "1px solid var(--color-border)",
        display:       "flex",
        alignItems:    "stretch",
        zIndex:        100,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {NAV_ITEMS.map(({ href, label, exact, icon }) => {
        const isActive = exact
          ? pathname === href
          : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex:           1,
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              justifyContent: "center",
              gap:            "3px",
              color:          isActive ? "var(--color-primary)" : "var(--color-text-faint)",
              textDecoration: "none",
              transition:     "color 0.15s",
              padding:        "6px 0",
              position:       "relative",
            }}
          >
            {/* Active indicator dot */}
            {isActive && (
              <span
                style={{
                  position:     "absolute",
                  top:          0,
                  width:        "32px",
                  height:       "2px",
                  background:   "var(--color-primary)",
                  borderRadius: "0 0 2px 2px",
                  boxShadow:    "0 0 8px var(--color-primary-glow)",
                }}
              />
            )}
            {icon(isActive)}
            <span style={{ fontSize: "0.6875rem", fontWeight: isActive ? 700 : 500, fontFamily: "var(--font-cairo), sans-serif" }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function TopHeader() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  };

  return (
    <header
      style={{
        position:       "fixed",
        top:            0,
        left:           0,
        right:          0,
        height:         "var(--header-h)",
        background:     "var(--color-surface)",
        borderBottom:   "1px solid var(--color-border)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        paddingInline:  "1rem",
        zIndex:         100,
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Logo wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <div
          style={{
            width:        "32px",
            height:       "32px",
            borderRadius: "var(--radius-sm)",
            background:   "var(--color-primary)",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            fontSize:     "1.1rem",
          }}
        >
          🏪
        </div>
        <span
          style={{
            fontFamily: "var(--font-cairo), sans-serif",
            fontWeight: 800,
            fontSize:   "1.125rem",
            color:      "var(--color-text)",
            letterSpacing: "-0.02em",
          }}
        >
          دكاني
        </span>
      </div>

      {/* Header Actions (Theme + Logout) */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {/* Sun/Moon Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="تغيير المظهر"
          style={{
            background:   "transparent",
            border:       "none",
            cursor:       "pointer",
            color:        "var(--color-text-muted)",
            display:      "flex",
            alignItems:   "center",
            padding:      "0.5rem",
            borderRadius: "var(--radius-sm)",
            transition:   "color 0.15s",
          }}
        >
          {theme === "light" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          aria-label="تسجيل الخروج"
          style={{
            background:   "transparent",
            border:       "none",
            cursor:       "pointer",
            color:        "var(--color-text-muted)",
            display:      "flex",
            alignItems:   "center",
            gap:          "0.375rem",
            fontSize:     "0.8125rem",
            fontFamily:   "var(--font-cairo), sans-serif",
            padding:      "0.5rem",
            borderRadius: "var(--radius-sm)",
            transition:   "color 0.15s",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          خروج
        </button>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<{
    plan_type: string;
    trial_ends_at: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/store")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setStore(res.data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <ToastProvider>
      <StoreGuard>
        <TopHeader />
        {store && (
          <SubscriptionBanner
            planType={store.plan_type}
            trialEndsAt={store.trial_ends_at}
          />
        )}
        <main className="dashboard-content animate-fade-in" style={{ paddingTop: store?.plan_type === "trial" ? "calc(var(--header-h) + 2.75rem)" : "calc(var(--header-h) + 1rem)" }}>
          {children}
        </main>
        <BottomNav />
      </StoreGuard>
    </ToastProvider>
  );
}
