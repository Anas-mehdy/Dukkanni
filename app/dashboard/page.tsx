"use client";

/**
 * app/(dashboard)/dashboard/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Dashboard Overview / Home Page
 *
 * Shows a quick summary:
 *   - Store link (copyable)
 *   - Active product count
 *   - Pending orders count
 *   - Quick links to catalog and orders
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

interface StoreSummary {
  name:         string;
  slug:         string;
  currency_code: string;
}

interface Stats {
  products:      number;
  activeProducts: number;
  pendingOrders: number;
}

function StatCard({ label, value, icon, href }: { label: string; value: number | string; icon: string; href?: string }) {
  const content = (
    <div
      className="card"
      style={{
        padding:  "1.25rem",
        display:  "flex",
        flexDirection: "column",
        gap:      "0.5rem",
        transition: "border-color 0.15s",
      }}
    >
      <span style={{ fontSize: "1.75rem" }}>{icon}</span>
      <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-text)", lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", fontWeight: 500 }}>
        {label}
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", display: "block" }}>
        {content}
      </Link>
    );
  }
  return content;
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [store, setStore]   = useState<StoreSummary | null>(null);
  const [stats, setStats]   = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<{ views: number; clicks: number } | null>(null);
  const [planUsage, setPlanUsage] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);

  useEffect(() => {
    // Fetch store info
    fetch("/api/store")
      .then((r) => r.json())
      .then((j) => setStore(j.data ?? null))
      .catch(() => {});

    // Fetch product count
    fetch("/api/products")
      .then((r) => r.json())
      .then((j) => {
        const products: Array<{ is_active: boolean }> = j.data ?? [];
        const active = products.filter((p) => p.is_active).length;
        setStats((prev) => ({ ...prev!, products: products.length, activeProducts: active, pendingOrders: prev?.pendingOrders ?? 0 }));
      })
      .catch(() => {});

    // Fetch pending orders count
    fetch("/api/orders?status=pending&count=true")
      .then((r) => r.json())
      .then((j) => setStats((prev) => ({ ...prev!, pendingOrders: j.data?.count ?? 0 })))
      .catch(() => {});

    // Fetch store analytics
    fetch("/api/store/analytics")
      .then((r) => r.json())
      .then((j) => setAnalytics(j.data ?? null))
      .catch(() => {});

    // Fetch plan usage
    fetch("/api/store/plan-usage")
      .then((r) => r.json())
      .then((j) => setPlanUsage(j.data ?? null))
      .catch(() => {});
  }, []);

  const storeUrl = useMemo(() => {
    if (!store) return null;
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://dukkanni.com";
    if (base.includes("localhost")) {
      return `http://${store.slug}.localhost:3000`;
    }
    const cleanBase = base.replace(/^https?:\/\//, "").replace(/^www\./, "");
    return `https://${store.slug}.${cleanBase}`;
  }, [store]);

  const handleCopyLink = async () => {
    if (!storeUrl) return;
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      toast.success("تم نسخ رابط المتجر ✓");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذّر نسخ الرابط");
    }
  };

  const handleDownloadQRCode = async () => {
    if (!store || !storeUrl) return;
    setGeneratingQR(true);
    try {
      const QRCode = await import("qrcode");
      
      // Render QR code to an offscreen canvas
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, storeUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: "#0f0f14",  // match dark theme bg color
          light: "#ffffff",
        },
      });

      // Trigger automatic PNG download
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${store.slug}-qrcode.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast.success("تم تحميل كود الـ QR بنجاح ✓");
    } catch (err) {
      console.error(err);
      toast.error("فشل تحميل كود الـ QR");
    } finally {
      setGeneratingQR(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>

      {/* Welcome */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
          مرحباً 👋
        </h1>
        {store && (
          <p style={{ fontSize: "0.9375rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
            متجر {store.name}
          </p>
        )}
      </div>

      {/* Store link card */}
      {store && storeUrl ? (
        <div
          className="card"
          style={{
            padding:    "1rem",
            marginBottom: "1.25rem",
            background: "linear-gradient(135deg, var(--color-primary-muted), var(--color-surface))",
            borderColor: "var(--color-primary)",
          }}
        >
          <p style={{ fontSize: "0.8125rem", color: "var(--color-primary)", fontWeight: 700, marginBottom: "0.5rem" }}>
            🔗 رابط متجرك العام
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <code
              style={{
                background: "var(--color-surface-3)",
                padding:    "0.5rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                fontSize:   "0.8125rem",
                color:      "var(--color-text)",
                overflow:   "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                direction:  "ltr",
                textAlign:  "left",
              }}
            >
              {storeUrl}
            </code>
            
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                id="copy-store-link"
                onClick={handleCopyLink}
                className="btn-primary"
                style={{ flex: 1, minHeight: "38px", padding: "0 0.875rem", fontSize: "0.8125rem" }}
              >
                {copied ? "✓ تم نسخ الرابط" : "نسخ رابط المتجر"}
              </button>
              <button
                onClick={handleDownloadQRCode}
                disabled={generatingQR}
                className="btn-ghost"
                style={{
                  flex: 1,
                  minHeight: "38px",
                  padding: "0 0.875rem",
                  fontSize: "0.8125rem",
                  background: "var(--color-surface-2)",
                  color: "var(--color-text)",
                  borderColor: "var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                📲 {generatingQR ? "جاري التحميل..." : "تحميل كود الـ QR"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="skeleton" style={{ height: "88px", marginBottom: "1.25rem", borderRadius: "var(--radius-lg)" }} />
      )}

      {/* Plan Usage Card */}
      {planUsage ? (() => {
        const { planTier, limits, usage } = planUsage;
        
        const productsPercent = limits.maxProducts === -1 ? 0 : Math.min(100, (usage.products / limits.maxProducts) * 100);
        const categoriesPercent = limits.maxCategories === -1 ? 0 : Math.min(100, (usage.categories / limits.maxCategories) * 100);
        const ordersPercent = limits.maxOrdersPerMonth === -1 ? 0 : Math.min(100, (usage.orders / limits.maxOrdersPerMonth) * 100);

        const isProductsWarning = limits.maxProducts !== -1 && (usage.products / limits.maxProducts) >= 0.8;
        const isCategoriesWarning = limits.maxCategories !== -1 && (usage.categories / limits.maxCategories) >= 0.8;
        const isOrdersWarning = limits.maxOrdersPerMonth !== -1 && (usage.orders / limits.maxOrdersPerMonth) >= 0.8;

        const isWarning = isProductsWarning || isCategoriesWarning || isOrdersWarning;
        
        return (
          <div
            className="card"
            style={{
              padding: "1.25rem",
              marginBottom: "1.25rem",
              borderColor: isWarning ? "var(--color-warning)" : "var(--color-border)",
              boxShadow: isWarning ? "0 0 12px var(--color-warning-muted)" : "none",
              background: isWarning ? "linear-gradient(135deg, var(--color-warning-muted), var(--color-surface))" : "var(--color-surface)",
              transition: "all 0.2s ease-in-out",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.9375rem", fontWeight: 800, color: "var(--color-text)" }}>
                📊 استهلاك خطة الاشتراك ({limits.nameAr})
              </span>
              {isWarning && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-warning)",
                    fontWeight: 800,
                    background: "rgba(245, 158, 11, 0.1)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  ⚠️ قارب على النفاد
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {/* Products Usage */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginBottom: "0.25rem" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>إجمالي المنتجات المضافة</span>
                  <strong style={{ color: isProductsWarning ? "var(--color-warning)" : "var(--color-text)" }}>
                    {usage.products} / {limits.maxProducts === -1 ? "∞" : limits.maxProducts} (منتج مستخدم)
                  </strong>
                </div>
                {limits.maxProducts !== -1 && (
                  <div style={{ height: "6px", width: "100%", background: "var(--color-surface-3)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${productsPercent}%`, background: isProductsWarning ? "var(--color-warning)" : "var(--color-primary)", borderRadius: "3px" }} />
                  </div>
                )}
              </div>

              {/* Categories Usage */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginBottom: "0.25rem" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>إجمالي الفئات المضافة</span>
                  <strong style={{ color: isCategoriesWarning ? "var(--color-warning)" : "var(--color-text)" }}>
                    {usage.categories} / {limits.maxCategories === -1 ? "∞" : limits.maxCategories} (فئة مستخدمة)
                  </strong>
                </div>
                {limits.maxCategories !== -1 && (
                  <div style={{ height: "6px", width: "100%", background: "var(--color-surface-3)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${categoriesPercent}%`, background: isCategoriesWarning ? "var(--color-warning)" : "var(--color-primary)", borderRadius: "3px" }} />
                  </div>
                )}
              </div>

              {/* Orders Usage */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginBottom: "0.25rem" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>طلبات الشهر الحالي</span>
                  <strong style={{ color: isOrdersWarning ? "var(--color-warning)" : "var(--color-text)" }}>
                    {usage.orders} / {limits.maxOrdersPerMonth === -1 ? "∞" : limits.maxOrdersPerMonth} (طلب مستخدم)
                  </strong>
                </div>
                {limits.maxOrdersPerMonth !== -1 && (
                  <div style={{ height: "6px", width: "100%", background: "var(--color-surface-3)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${ordersPercent}%`, background: isOrdersWarning ? "var(--color-warning)" : "var(--color-primary)", borderRadius: "3px" }} />
                  </div>
                )}
              </div>
            </div>

            {/* Upgrade CTA */}
            {planTier !== "pro" && (
              <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
                <Link
                  href="/pricing"
                  className="btn-primary"
                  style={{
                    textDecoration: "none",
                    fontSize: "0.8125rem",
                    padding: "0.5rem 1rem",
                    minHeight: "36px",
                    fontWeight: 800,
                  }}
                >
                  ترقية الباقة 🚀
                </Link>
              </div>
            )}
          </div>
        );
      })() : (
        <div className="skeleton" style={{ height: "180px", marginBottom: "1.25rem", borderRadius: "var(--radius-lg)" }} />
      )}

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {stats ? (
          <>
            <StatCard label="إجمالي المنتجات"  value={stats.products}       icon="📦" href="/dashboard/products" />
            <StatCard label="منتجات نشطة/ظاهرة" value={stats.activeProducts} icon="✅" href="/dashboard/products" />
            <StatCard label="طلبات قيد الانتظار" value={stats.pendingOrders}  icon="📋" href="/dashboard/orders" />
            <StatCard label="الفئات"            value="—"                    icon="📂" href="/dashboard/categories" />
          </>
        ) : (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: "100px", borderRadius: "var(--radius-lg)" }} />
          ))
        )}
      </div>

      {/* Current Month Analytics Section */}
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "0.625rem" }}>
          📊 إحصائيات الشهر الحالي (30 يوم)
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <StatCard
            label="إجمالي زوار المتجر"
            value={analytics ? analytics.views : 0}
            icon="👁️"
          />
          <StatCard
            label="الطلبات المكتملة"
            value={analytics ? analytics.clicks : 0}
            icon="📈"
          />
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-muted)" }}>إجراءات سريعة</p>
        <Link href="/dashboard/products/new" className="btn-primary" style={{ textDecoration: "none", textAlign: "center", width: "100%" }}>
          + إضافة منتج جديد
        </Link>
        <Link href="/dashboard/orders" className="btn-ghost" style={{ textDecoration: "none", textAlign: "center", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          عرض الطلبات
        </Link>
      </div>

      {/* WhatsApp Support Button */}
      <a
        href="https://wa.me/905350215375?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D9%81%D9%8A%20%D8%A5%D8%B9%D8%AF%D8%A7%D8%AF%20%D9%85%D8%AA%D8%AC%D8%B1%D9%8A%20%D8%B9%D9%84%D9%89%20Dukkanni"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.625rem",
          marginTop: "1rem",
          background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
          color: "#fff",
          fontWeight: 800,
          fontSize: "0.9rem",
          padding: "0.875rem 1rem",
          borderRadius: "var(--radius-lg)",
          textDecoration: "none",
          boxShadow: "0 4px 20px rgba(37, 211, 102, 0.35)",
          direction: "rtl",
          transition: "opacity 0.2s ease, transform 0.2s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.opacity = "0.9";
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ width: "1.2rem", height: "1.2rem", flexShrink: 0 }}
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        هل تحتاج مساعدة في إعداد متجرك؟ تواصل معنا
      </a>
    </div>

  );
}
