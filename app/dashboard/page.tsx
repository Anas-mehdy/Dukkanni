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

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {stats ? (
          <>
            <StatCard label="إجمالي المنتجات"  value={stats.products}       icon="📦" href="/dashboard/products" />
            <StatCard label="منتجات متوفرة"     value={stats.activeProducts} icon="✅" href="/dashboard/products" />
            <StatCard label="طلبات قيد الانتظار" value={stats.pendingOrders}  icon="📋" href="/dashboard/orders" />
            <StatCard label="الفئات"            value="—"                    icon="📂" href="/dashboard/categories" />
          </>
        ) : (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: "100px", borderRadius: "var(--radius-lg)" }} />
          ))
        )}
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
    </div>
  );
}
