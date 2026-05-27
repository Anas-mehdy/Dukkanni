"use client";

/**
 * app/(dashboard)/orders/analytics/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Merchant Analytics & Sales Reporting Center
 *
 * 100% Mobile-first dashboard for sales stats, product rankings, and CSV export.
 * Powered by pure React + Tailwind CSS with Cairo typography (Arabic).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { getCurrencySymbol } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

type TimeHorizon = "today" | "week" | "month";

interface ReportsData {
  metrics: {
    totalRevenue: number;
    totalOrdersCount: number;
    totalCompletedFulfillments: number;
    deliveryRate: number;
    currencyCode: string;
  };
  topProducts: Array<{
    id: string | null;
    name: string;
    quantity: number;
    revenue: number;
    imageUrl: string | null;
  }>;
  orders: Array<{
    id: string;
    customerName: string;
    createdAt: string;
    totalAmount: number;
    fulfillmentStatus: string;
    currencyCode: string;
  }>;
}

// ---------------------------------------------------------------------------
// Skeletal loading shimmers
// ---------------------------------------------------------------------------

function AnalyticsSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.625rem" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: "92px", borderRadius: "var(--radius-md)" }} />
        ))}
      </div>

      {/* Exporter Shimmer */}
      <div className="skeleton" style={{ height: "46px", borderRadius: "var(--radius-md)" }} />

      {/* Top Products Shimmer */}
      <div className="skeleton" style={{ height: "240px", borderRadius: "var(--radius-md)" }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Client Dashboard Component
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [range, setRange] = useState<TimeHorizon>("week");
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch reports on filter change
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/reports?range=${range}`)
      .then((res) => {
        if (!res.ok) throw new Error("تعذر تحميل بيانات التقارير.");
        return res.json();
      })
      .then((json) => {
        if (active) {
          setData(json.data ?? null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "حدث خطأ غير متوقع.");
          setLoading(false);
          toast.error("خطأ في جلب تفاصيل التحليلات");
        }
      });

    return () => {
      active = false;
    };
  }, [range, toast]);

  // Derive dynamic currency symbol
  const currencySymbol = useMemo(() => {
    if (!data?.metrics?.currencyCode) return "₺";
    return getCurrencySymbol(data.metrics.currencyCode);
  }, [data]);

  // Find max quantity sold to calibrate horizontal bar percentages
  const maxQty = useMemo(() => {
    if (!data?.topProducts || data.topProducts.length === 0) return 1;
    return Math.max(...data.topProducts.map((p) => p.quantity));
  }, [data]);

  // Client-side CSV/Excel Exporter in Arabic
  const handleCSVExport = () => {
    if (!data?.orders || data.orders.length === 0) {
      toast.warning("لا توجد طلبيات متاحة للتصدير في هذا النطاق الزمني.");
      return;
    }

    // CSV headers in clear Arabic
    const headers = [
      "رقم الطلب",
      "اسم الزبون",
      "تاريخ الطلب",
      "إجمالي الفاتورة",
      "حالة الطلب"
    ];

    // Map order rows
    const rows = data.orders.map((order) => {
      const shortId = order.id.substring(0, 8).toUpperCase();
      const escapedCustomerName = `"${order.customerName.replace(/"/g, '""')}"`;
      
      const localDate = new Date(order.createdAt).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });

      const formattedTotal = `${order.totalAmount} ${getCurrencySymbol(order.currencyCode)}`;

      // Translate system statuses to premium Arabic labels
      let arabicStatus = "قيد الانتظار";
      if (order.fulfillmentStatus === "delivered") {
        arabicStatus = "تم التسليم";
      } else if (order.fulfillmentStatus === "cancelled") {
        arabicStatus = "ملغى";
      }

      return [
        shortId,
        escapedCustomerName,
        localDate,
        formattedTotal,
        arabicStatus
      ];
    });

    // CRITICAL: Insert UTF-8 BOM (\uFEFF) to make Arabic text readable in MS Excel on Windows
    const csvHeaderLine = headers.join(",");
    const csvDataLines = rows.map((r) => r.join(",")).join("\n");
    const csvContent = "\uFEFF" + csvHeaderLine + "\n" + csvDataLines;

    // Trigger local client browser download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    // Arabic filenames representing store sales export
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `تقرير_مبيعات_دكاني_${range}_${dateStamp}.csv`);
    
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("تم تصدير سجل المبيعات بنجاح! 📥");
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", paddingBottom: "2rem" }}>
      
      {/* Top Breadcrumb Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <Link
            href="/dashboard/orders"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.8125rem",
              color: "var(--color-primary)",
              textDecoration: "none",
              fontWeight: 700,
              fontFamily: "var(--font-cairo), sans-serif",
              marginBottom: "4px"
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "rotate(180deg)" }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            العودة للطلبات
          </Link>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, fontFamily: "var(--font-cairo), sans-serif" }}>
            التقارير والمبيعات 📊
          </h1>
        </div>
      </div>

      {/* Date Horizon Pill Filters Selector */}
      <div
        style={{
          display: "flex",
          background: "var(--color-surface-2)",
          borderRadius: "var(--radius-full)",
          padding: "0.25rem",
          marginBottom: "1.25rem",
          position: "sticky",
          top: "calc(var(--header-h) + 10px)",
          zIndex: 40,
          boxShadow: "var(--shadow-md)",
          backdropFilter: "blur(8px)"
        }}
      >
        {(["today", "week", "month"] as const).map((horizon) => {
          const label = horizon === "today" ? "اليوم" : horizon === "week" ? "آخر 7 أيام" : "هذا الشهر";
          const isActive = range === horizon;
          return (
            <button
              key={horizon}
              onClick={() => setRange(horizon)}
              style={{
                flex: 1,
                padding: "0.5rem 0.25rem",
                borderRadius: "var(--radius-full)",
                border: "none",
                background: isActive ? "var(--color-primary)" : "transparent",
                color: isActive ? "#ffffff" : "var(--color-text-muted)",
                fontFamily: "var(--font-cairo), sans-serif",
                fontWeight: isActive ? 800 : 500,
                fontSize: "0.8125rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: isActive ? "0 2px 8px var(--color-primary-glow)" : "none"
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Content Renderer */}
      {loading ? (
        <AnalyticsSkeleton />
      ) : error ? (
        <div
          className="card"
          style={{
            background: "var(--color-danger-muted)",
            borderColor: "var(--color-danger)",
            padding: "1.5rem",
            textAlign: "center"
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚠️</div>
          <p style={{ fontWeight: 700, color: "var(--color-danger)" }}>تعذر تحميل التقارير</p>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "4px" }}>{error}</p>
        </div>
      ) : data ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          
          {/* Macro KPI Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.625rem" }}>
            
            {/* Sales Card */}
            <div
              className="card"
              style={{
                padding: "0.875rem 0.5rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                background: "linear-gradient(135deg, var(--color-primary-muted), var(--color-surface))",
                borderColor: "var(--color-primary-glow)",
                boxShadow: "var(--shadow-glow)"
              }}
            >
              <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--color-primary)", marginBottom: "4px" }}>
                {data.metrics.totalRevenue.toLocaleString("ar", { maximumFractionDigits: 1 })} {currencySymbol}
              </span>
              <span style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", fontWeight: 700 }}>
                إجمالي المبيعات
              </span>
            </div>

            {/* Total Orders Card */}
            <div
              className="card"
              style={{
                padding: "0.875rem 0.5rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center"
              }}
            >
              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "4px" }}>
                {data.metrics.totalOrdersCount}
              </span>
              <span style={{ fontSize: "0.6875rem", color: "var(--color-text-faint)", fontWeight: 700 }}>
                عدد الطلبات
              </span>
            </div>

            {/* Fulfill Rate Card */}
            <div
              className="card"
              style={{
                padding: "0.875rem 0.5rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center"
              }}
            >
              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-success)", marginBottom: "4px" }}>
                {data.metrics.deliveryRate}%
              </span>
              <span style={{ fontSize: "0.6875rem", color: "var(--color-text-faint)", fontWeight: 700 }}>
                نسبة المستلم
              </span>
            </div>

          </div>

          {/* Excel/CSV Exporter Button */}
          <button
            id="export-csv-btn"
            onClick={handleCSVExport}
            className="btn-primary"
            style={{
              width: "100%",
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "0.875rem",
              background: "linear-gradient(135deg, var(--color-success), #16a34a)",
              borderColor: "transparent",
              color: "#ffffff"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            تصدير البيانات إلى Excel / CSV
          </button>

          {/* Top Selling Products List */}
          <div
            className="card"
            style={{
              padding: "1.25rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem"
            }}
          >
            <div>
              <p style={{ fontWeight: 800, fontSize: "0.9375rem", color: "var(--color-text)", fontFamily: "var(--font-cairo), sans-serif" }}>
                المنتجات الأكثر مبيعاً ⭐
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", marginTop: "2px" }}>
                ترتيب الأصناف بحسب الكميات المباعة
              </p>
            </div>

            {data.topProducts.length === 0 ? (
              <div style={{ padding: "2rem 0", textAlign: "center", color: "var(--color-text-muted)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📦</div>
                <p style={{ fontSize: "0.8125rem" }}>لا توجد مبيعات مسجلة في هذه الفترة.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {data.topProducts.map((p, index) => {
                  const percentWidth = Math.max(4, Math.round((p.quantity / maxQty) * 100));
                  return (
                    <div
                      key={p.id || index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem"
                      }}
                    >
                      {/* Product Image Thumbnail */}
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--color-surface-3)",
                          overflow: "hidden",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid var(--color-border)"
                        }}
                      >
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover"
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: "1.25rem" }}>📦</span>
                        )}
                      </div>

                      {/* Product Metrics & Native CSS Progress bar */}
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                        
                        {/* Title and Sales Amount */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "0.875rem",
                              color: "var(--color-text)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              paddingLeft: "4px"
                            }}
                          >
                            {p.name}
                          </span>
                          <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-text-muted)" }}>
                            {p.revenue.toLocaleString("ar")} {currencySymbol}
                          </span>
                        </div>

                        {/* Visual Linear volume bar */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          
                          {/* Native CSS progress track */}
                          <div
                            style={{
                              flex: 1,
                              height: "6px",
                              background: "var(--color-surface-3)",
                              borderRadius: "var(--radius-full)",
                              overflow: "hidden"
                            }}
                          >
                            <div
                              style={{
                                width: `${percentWidth}%`,
                                height: "100%",
                                background: "linear-gradient(90deg, var(--color-primary-muted), var(--color-primary))",
                                borderRadius: "var(--radius-full)",
                                transition: "width 0.4s ease-out"
                              }}
                            />
                          </div>

                          {/* Sold Count Badge */}
                          <span
                            style={{
                              background: "var(--color-primary-muted)",
                              color: "var(--color-primary)",
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              borderRadius: "var(--radius-full)",
                              padding: "0.125rem 0.5rem",
                              minWidth: "36px",
                              textAlign: "center",
                              flexShrink: 0
                            }}
                          >
                            × {p.quantity}
                          </span>

                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      ) : (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
          لا توجد بيانات متاحة
        </div>
      )}
    </div>
  );
}
