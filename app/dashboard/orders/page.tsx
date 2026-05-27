"use client";

/**
 * app/dashboard/orders/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Merchant Fulfillment Command Center
 *
 * TWO OPERATIONAL LAYERS:
 *
 * LAYER 1 — Daily Aggregation (تجميع الطلبيات الإجمالي)
 *   Groups all PENDING order items by product_name, sums quantities.
 *   "Mark All Delivered" bulk action archives all pending in one call.
 *
 * LAYER 2 — Customer Breakdown (تفاصيل طلبات الزبائن)
 *   Chronological accordion list: name, time, total, itemized breakdown.
 *   Individual "تم الشحن" (deep-link WhatsApp) and "تم التسليم" (internal) actions.
 *
 * Real-time updates via useOrders() hook (Supabase postgres_changes).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useOrders, type OrderWithItems } from "@/hooks/useOrders";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { getCurrencySymbol } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ar", {
    hour:   "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number, symbol: string): string {
  return `${amount.toLocaleString("ar")} ${symbol}`;
}

// ---------------------------------------------------------------------------
// Aggregated product totals across all pending orders
// ---------------------------------------------------------------------------

interface AggregatedItem {
  productName: string;
  totalQty:    number;
}

function aggregatePending(pendingOrders: OrderWithItems[]): AggregatedItem[] {
  const map = new Map<string, number>();
  pendingOrders.forEach((order) => {
    (order.items ?? []).forEach((item) => {
      map.set(
        item.product_name,
        (map.get(item.product_name) ?? 0) + item.quantity
      );
    });
  });
  return Array.from(map.entries())
    .map(([productName, totalQty]) => ({ productName, totalQty }))
    .sort((a, b) => b.totalQty - a.totalQty);
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function OrdersSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.625rem", marginBottom: "0.5rem" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: "100px", borderRadius: "var(--radius-md)" }} />
        ))}
      </div>
      {/* Aggregation section */}
      <div className="skeleton" style={{ height: "180px", borderRadius: "var(--radius-md)" }} />
      {/* Order cards */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton" style={{ height: "72px", borderRadius: "var(--radius-md)" }} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order status metadata styling
// ---------------------------------------------------------------------------

const STATUS_META = {
  pending: {
    color: "var(--color-warning)",
    bg: "var(--color-warning-muted)",
    text: "قيد الانتظار",
    dotShadow: "0 0 0 3px var(--color-warning-muted)",
  },
  shipped: {
    color: "var(--color-primary)",
    bg: "var(--color-primary-muted)",
    text: "تم الشحن 🚀",
    dotShadow: "0 0 0 3px var(--color-primary-glow)",
  },
  delivered: {
    color: "var(--color-success)",
    bg: "var(--color-success-muted)",
    text: "مُسلَّم ✓",
    dotShadow: "0 0 0 3px var(--color-success-muted)",
  },
  cancelled: {
    color: "var(--color-danger)",
    bg: "var(--color-danger-muted)",
    text: "ملغي ✕",
    dotShadow: "0 0 0 3px var(--color-danger-muted)",
  },
};

// ---------------------------------------------------------------------------
// Order accordion card
// ---------------------------------------------------------------------------

function OrderCard({
  order,
  expanded,
  onToggle,
  onFulfill,
  onShip,
  currencySymbol,
  fulfilling,
  shipping,
  onPrint,
}: {
  order:          OrderWithItems;
  expanded:       boolean;
  onToggle:       () => void;
  onFulfill:      () => void;
  onShip:         () => void;
  currencySymbol: string;
  fulfilling:     boolean;
  shipping:       boolean;
  onPrint:        () => void;
}) {
  const isPending = order.fulfillment_status === "pending";
  const isShipped = order.fulfillment_status === "shipped";
  const itemCount = (order.items ?? []).reduce((s, i) => s + i.quantity, 0);

  return (
    <div
      id={`order-${order.id}`}
      style={{
        background:   "var(--color-surface)",
        border:       `1.5px solid ${
          isPending
            ? "var(--color-border)"
            : isShipped
            ? "var(--color-primary-glow)"
            : "var(--color-success)"
        }`,
        borderRadius: "var(--radius-md)",
        overflow:     "hidden",
        transition:   "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      {/* ── Card header (always visible) ── */}
      <div
        style={{
          display:    "flex",
          alignItems: "center",
          gap:        "0.75rem",
          padding:    "0.875rem 1rem",
        }}
      >
        {/* Status dot */}
        <div
          style={{
            width:        "10px",
            height:       "10px",
            borderRadius: "50%",
            background:   STATUS_META[order.fulfillment_status]?.color ?? "var(--color-text-faint)",
            flexShrink:   0,
            boxShadow:    STATUS_META[order.fulfillment_status]?.dotShadow ?? "none",
          }}
        />

        {/* Customer info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontWeight:   700,
              fontSize:     "0.9375rem",
              color:        "var(--color-text)",
              overflow:     "hidden",
              textOverflow: "ellipsis",
              whiteSpace:   "nowrap",
            }}
          >
            {order.customer_name}
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", marginTop: "1px" }}>
            {formatTime(order.created_at)} · {itemCount} منتج
          </p>
        </div>

        {/* Total amount */}
        <p style={{ fontWeight: 800, fontSize: "0.9375rem", color: "var(--color-primary)", flexShrink: 0, marginLeft: "0.5rem" }}>
          {formatAmount(order.total_amount, currencySymbol)}
        </p>

        {/* Status badge in header */}
        <span
          style={{
            flexShrink:   0,
            padding:      "0.25rem 0.625rem",
            background:   STATUS_META[order.fulfillment_status]?.bg ?? "var(--color-surface-3)",
            color:        STATUS_META[order.fulfillment_status]?.color ?? "var(--color-text-muted)",
            borderRadius: "var(--radius-full)",
            fontSize:     "0.6875rem",
            fontWeight:   700,
            marginLeft:   "0.5rem",
          }}
        >
          {STATUS_META[order.fulfillment_status]?.text ?? order.fulfillment_status}
        </span>

        {/* Expand toggle */}
        <button
          onClick={onToggle}
          aria-label={expanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}
          className="print-hidden"
          style={{
            flexShrink:   0,
            width:        "28px",
            height:       "28px",
            borderRadius: "50%",
            background:   "var(--color-surface-2)",
            border:       "none",
            cursor:       "pointer",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            color:        "var(--color-text-muted)",
            transition:   "transform 0.2s",
            transform:    expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>

      {/* ── Expanded item breakdown ── */}
      {expanded && (
        <div
          style={{
            borderTop:  "1px solid var(--color-border)",
            background: "var(--color-surface-2)",
            padding:    "0.75rem 1rem",
          }}
        >
          {/* ── Customer CRM Box ── */}
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-md)",
              padding: "0.75rem 1rem",
              marginBottom: "0.875rem",
              border: "1px solid var(--color-border)",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", fontWeight: 600 }}>📞 رقم الهاتف:</span>
                <a
                  href={`tel:${order.customer_phone}`}
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: "var(--color-primary)",
                    textDecoration: "none",
                    fontFamily: "monospace",
                  }}
                  dir="ltr"
                >
                  {order.customer_phone}
                </a>
              </div>
              <a
                href={`https://wa.me/${order.customer_phone.replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: "0.75rem",
                  color: "#25D366",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  background: "rgba(37,211,102,0.1)",
                  padding: "0.25rem 0.625rem",
                  borderRadius: "var(--radius-full)",
                  transition: "background 0.2s",
                }}
              >
                💬 تواصل عبر الواتساب
              </a>
            </div>

            {order.tracking_url && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", borderTop: "1px dashed var(--color-border)", paddingTop: "0.5rem", marginTop: "0.25rem" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", fontWeight: 600 }}>📦 رابط تتبع الشحنة:</span>
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--color-primary)",
                    textDecoration: "underline",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "240px",
                  }}
                >
                  {order.tracking_url}
                </a>
              </div>
            )}
          </div>

          {(order.items ?? []).length === 0 ? (
            <p style={{ color: "var(--color-text-faint)", fontSize: "0.8125rem", textAlign: "center" }}>
              لا توجد تفاصيل
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {/* Column headers */}
              <div
                style={{
                  display:             "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap:                 "0.5rem",
                  padding:             "0.25rem 0",
                  fontSize:            "0.6875rem",
                  fontWeight:          700,
                  color:               "var(--color-text-faint)",
                  letterSpacing:       "0.04em",
                  borderBottom:        "1px solid var(--color-border)",
                  marginBottom:        "0.25rem",
                }}
              >
                <span>المنتج</span>
                <span style={{ textAlign: "center" }}>الكمية</span>
                <span style={{ textAlign: "left" }}>السعر</span>
              </div>

              {/* Item rows */}
              {order.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display:             "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap:                 "0.5rem",
                    alignItems:          "center",
                    padding:             "0.25rem 0",
                  }}
                >
                  <span style={{ fontSize: "0.875rem", color: "var(--color-text)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.product_name}
                  </span>
                  <span
                    style={{
                      background:   "var(--color-primary-muted)",
                      color:        "var(--color-primary)",
                      borderRadius: "var(--radius-full)",
                      padding:      "0.125rem 0.5rem",
                      fontSize:     "0.8125rem",
                      fontWeight:   700,
                      textAlign:    "center",
                      whiteSpace:   "nowrap",
                    }}
                  >
                    × {item.quantity}
                  </span>
                  <span
                    style={{
                      fontSize:   "0.8125rem",
                      fontWeight: 700,
                      color:      "var(--color-text-muted)",
                      textAlign:  "left",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {(item.unit_price * item.quantity).toLocaleString("ar")}
                    <span style={{ fontSize: "0.6875rem", marginRight: "2px" }}>{currencySymbol}</span>
                  </span>
                </div>
              ))}

              {/* Print Invoice + Line total */}
              <div
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "space-between",
                  paddingTop:     "0.75rem",
                  borderTop:      "1px dashed var(--color-border)",
                  marginTop:      "0.375rem",
                }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onPrint(); }}
                  className="print-hidden"
                  style={{
                    padding:      "0.4rem 0.875rem",
                    background:   "var(--color-surface-3)",
                    color:        "var(--color-text)",
                    border:       "1.5px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    fontFamily:   "var(--font-cairo), sans-serif",
                    fontWeight:   700,
                    fontSize:     "0.75rem",
                    cursor:       "pointer",
                    transition:   "all 0.15s",
                    display:      "flex",
                    alignItems:   "center",
                    gap:          "0.25rem",
                  }}
                >
                  🖨️ طباعة الفاتورة
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text)" }}>
                    الإجمالي:
                  </span>
                  <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--color-primary)" }}>
                    {formatAmount(order.total_amount, currencySymbol)}
                  </span>
                </div>
              </div>

              {/* ── Order fulfillment buttons inside details ── */}
              {(isPending || isShipped) && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginTop: "0.875rem",
                    paddingTop: "0.75rem",
                    borderTop: "1px solid var(--color-border)",
                  }}
                  className="print-hidden"
                >
                  {isPending && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onShip(); }}
                      disabled={shipping}
                      style={{
                        flex: 1,
                        padding: "0.5rem 0.75rem",
                        background: shipping ? "var(--color-surface-3)" : "var(--color-primary-muted)",
                        color: shipping ? "var(--color-text-faint)" : "var(--color-primary)",
                        border: shipping ? "1.5px solid var(--color-border)" : "1.5px solid var(--color-primary-glow)",
                        borderRadius: "var(--radius-md)",
                        fontFamily: "var(--font-cairo), sans-serif",
                        fontWeight: 700,
                        fontSize: "0.8125rem",
                        cursor: shipping ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.25rem",
                        transition: "all 0.15s",
                      }}
                    >
                      {shipping ? "..." : "شحن الطلبية 🚀"}
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onFulfill(); }}
                    disabled={fulfilling}
                    style={{
                      flex: 1,
                      padding: "0.5rem 0.75rem",
                      background: fulfilling ? "var(--color-surface-3)" : "var(--color-success-muted)",
                      color: fulfilling ? "var(--color-text-faint)" : "var(--color-success)",
                      border: `1.5px solid ${fulfilling ? "var(--color-border)" : "var(--color-success)"}`,
                      borderRadius: "var(--radius-md)",
                      fontFamily: "var(--font-cairo), sans-serif",
                      fontWeight: 700,
                      fontSize: "0.8125rem",
                      cursor: fulfilling ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.25rem",
                      transition: "all 0.15s",
                    }}
                  >
                    {fulfilling ? "..." : "تم التسليم ✓"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Daily Aggregation section
// ---------------------------------------------------------------------------

function DailyAggregation({
  items,
  pendingCount,
  onMarkAll,
  isMarkingAll,
  onPrint,
}: {
  items:        AggregatedItem[];
  pendingCount: number;
  onMarkAll:    () => void;
  isMarkingAll: boolean;
  onPrint:      () => void;
}) {
  if (pendingCount === 0) {
    return (
      <div
        style={{
          background:   "var(--color-success-muted)",
          border:       "1.5px solid var(--color-success)",
          borderRadius: "var(--radius-md)",
          padding:      "1.25rem",
          textAlign:    "center",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{ fontSize: "2.25rem", marginBottom: "0.5rem" }}>🎉</div>
        <p style={{ fontWeight: 700, color: "var(--color-success)", fontSize: "1rem" }}>
          تم تسليم جميع طلبات اليوم!
        </p>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
          لا توجد طلبات معلقة
        </p>
      </div>
    );
  }

  return (
    <div
      className="daily-aggregation-card"
      style={{
        background:   "var(--color-surface)",
        border:       "1.5px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        overflow:     "hidden",
        marginBottom: "1.25rem",
      }}
    >
      {/* Section header */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "0.875rem 1rem",
          background:     "var(--color-surface-2)",
          borderBottom:   "1px solid var(--color-border)",
        }}
      >
        <div>
          <p style={{ fontWeight: 800, fontSize: "0.9375rem", color: "var(--color-text)" }}>
            تجميع الطلبيات الإجمالي 📦
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", marginTop: "1px" }}>
            {pendingCount} طلب معلق — {items.length} صنف مختلف
          </p>
        </div>

        {/* Buttons (Print + Ship) */}
        <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}>
          {/* Print Button */}
          <button
            onClick={onPrint}
            className="print-hidden"
            style={{
              padding:      "0.5rem 0.875rem",
              background:   "var(--color-surface-3)",
              color:        "var(--color-text)",
              border:       "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-full)",
              fontFamily:   "var(--font-cairo), sans-serif",
              fontWeight:   700,
              fontSize:     "0.75rem",
              cursor:       "pointer",
              transition:   "all 0.2s",
              whiteSpace:   "nowrap",
            }}
          >
            🖨️ طباعة
          </button>

          {/* Bulk deliver button */}
          <button
            id="mark-all-delivered-btn"
            onClick={onMarkAll}
            disabled={isMarkingAll}
            style={{
              padding:      "0.5rem 0.875rem",
              background:   isMarkingAll ? "var(--color-surface-3)" : "var(--color-primary)",
              color:        isMarkingAll ? "var(--color-text-faint)" : "#fff",
              border:       "none",
              borderRadius: "var(--radius-full)",
              fontFamily:   "var(--font-cairo), sans-serif",
              fontWeight:   700,
              fontSize:     "0.75rem",
              cursor:       isMarkingAll ? "not-allowed" : "pointer",
              boxShadow:    isMarkingAll ? "none" : "0 2px 8px var(--color-primary-glow)",
              transition:   "all 0.2s",
              flexShrink:   0,
              whiteSpace:   "nowrap",
            }}
          >
            {isMarkingAll ? "جاري التسليم..." : "✓ تم تسليم الجميع"}
          </button>
        </div>
      </div>

      {/* Aggregated products list */}
      <div style={{ padding: "0.5rem 0" }}>
        {items.map(({ productName, totalQty }, idx) => (
          <div
            key={productName}
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              padding:        "0.625rem 1rem",
              borderBottom:   idx < items.length - 1 ? "1px solid var(--color-border)" : "none",
            }}
          >
            <span
              style={{
                flex:         1,
                fontWeight:   600,
                fontSize:     "0.875rem",
                color:        "var(--color-text)",
                overflow:     "hidden",
                textOverflow: "ellipsis",
                whiteSpace:   "nowrap",
                paddingLeft:  "0.5rem",
              }}
            >
              {productName}
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
              {/* Quantity bar (visual progress relative to max) */}
              <div
                style={{
                  width:        "60px",
                  height:       "4px",
                  background:   "var(--color-surface-3)",
                  borderRadius: "var(--radius-full)",
                  overflow:     "hidden",
                }}
              >
                <div
                  style={{
                    width:        `${Math.min(100, (totalQty / Math.max(...items.map((i) => i.totalQty))) * 100)}%`,
                    height:       "100%",
                    background:   "var(--color-primary)",
                    borderRadius: "var(--radius-full)",
                    transition:   "width 0.5s ease",
                  }}
                />
              </div>

              <span
                style={{
                  minWidth:     "48px",
                  textAlign:    "center",
                  background:   "var(--color-primary-muted)",
                  color:        "var(--color-primary)",
                  borderRadius: "var(--radius-full)",
                  padding:      "0.2rem 0.625rem",
                  fontWeight:   800,
                  fontSize:     "0.875rem",
                  whiteSpace:   "nowrap",
                }}
              >
                × {totalQty}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter tabs component
// ---------------------------------------------------------------------------

type FilterTab = "pending" | "shipped" | "delivered" | "all";

function FilterTabs({
  active,
  pendingCount,
  shippedCount,
  deliveredCount,
  onChange,
}: {
  active:         FilterTab;
  pendingCount:   number;
  shippedCount:   number;
  deliveredCount: number;
  onChange:       (t: FilterTab) => void;
}) {
  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: "pending",   label: "قيد الانتظار", count: pendingCount   },
    { id: "shipped",   label: "تم الشحن",     count: shippedCount   },
    { id: "delivered", label: "تم التسليم",  count: deliveredCount },
    { id: "all",       label: "الكل",         count: pendingCount + shippedCount + deliveredCount },
  ];

  return (
    <div
      style={{
        display:       "flex",
        gap:           "0.375rem",
        marginBottom:  "0.875rem",
        background:    "var(--color-surface-2)",
        borderRadius:  "var(--radius-md)",
        padding:       "0.25rem",
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`filter-${tab.id}`}
          onClick={() => onChange(tab.id)}
          style={{
            flex:         1,
            padding:      "0.5rem 0.375rem",
            borderRadius: "var(--radius-sm)",
            border:       "none",
            background:   active === tab.id ? "var(--color-surface)" : "transparent",
            color:        active === tab.id ? "var(--color-text)" : "var(--color-text-faint)",
            fontFamily:   "var(--font-cairo), sans-serif",
            fontWeight:   active === tab.id ? 700 : 500,
            fontSize:     "0.8125rem",
            cursor:       "pointer",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            gap:          "0.375rem",
            transition:   "all 0.15s",
            boxShadow:    active === tab.id ? "var(--shadow-sm)" : "none",
          }}
        >
          {tab.label}
          {tab.count > 0 && (
            <span
              style={{
                background:   active === tab.id ? "var(--color-primary)" : "var(--color-surface-3)",
                color:        active === tab.id ? "#fff" : "var(--color-text-muted)",
                borderRadius: "var(--radius-full)",
                padding:      "0 0.375rem",
                fontSize:     "0.6875rem",
                fontWeight:   800,
                lineHeight:   "1.5",
              }}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page component
// ---------------------------------------------------------------------------

export default function OrdersPage() {
  const {
    orders,
    pendingOrders,
    shippedOrders,
    deliveredOrders,
    loading,
    error,
    storeName,
    markDelivered,
    markShipped,
    markAllDelivered,
  } = useOrders();

  const [filter,      setFilter]      = useState<FilterTab>("pending");
  const [expanded,    setExpanded]    = useState<Set<string>>(new Set());
  const [fulfilling,  setFulfilling]  = useState<Set<string>>(new Set());
  const [markingAll,  setMarkingAll]  = useState(false);

  // Shipping modal state
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [trackingUrl, setTrackingUrl] = useState("");
  const [isShippingSubmit, setIsShippingSubmit] = useState(false);

  // ── Derived: aggregated items across all pending orders ─────────────────
  const aggregated = useMemo(
    () => aggregatePending(pendingOrders),
    [pendingOrders]
  );

  // ── Derived: KPI stats ────────────────────────────────────────────────────
  const totalPendingValue = useMemo(
    () => pendingOrders.reduce((sum, o) => sum + o.total_amount, 0),
    [pendingOrders]
  );

  const distinctProducts = useMemo(() => aggregated.length, [aggregated]);

  // ── Derived: currency symbol (from first order, fallback TRY) ────────────
  const currencySymbol = useMemo(() => {
    const code = orders[0]?.currency_code ?? "TRY";
    return getCurrencySymbol(code);
  }, [orders]);

  // ── Filtered list for Customer Breakdown ─────────────────────────────────
  const filteredOrders = useMemo(() => {
    if (filter === "pending")   return pendingOrders;
    if (filter === "shipped")   return shippedOrders;
    if (filter === "delivered") return deliveredOrders;
    return orders;
  }, [filter, pendingOrders, shippedOrders, deliveredOrders, orders]);

  // ── Accordion toggle ──────────────────────────────────────────────────────
  const toggleExpanded = (orderId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  // ── Individual fulfill (Deliver) ──────────────────────────────────────────
  const handleFulfill = async (orderId: string) => {
    setFulfilling((prev) => new Set([...prev, orderId]));
    await markDelivered(orderId);
    setFulfilling((prev) => {
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
  };

  // ── Individual ship confirmation ──────────────────────────────────────────
  const handleConfirmShip = async () => {
    if (!shippingOrderId) return;
    
    setIsShippingSubmit(true);
    const trackingVal = trackingUrl.trim();
    const success = await markShipped(shippingOrderId, trackingVal || undefined);
    
    if (success) {
      // Find the order details for WhatsApp text generation
      const order = orders.find((o) => o.id === shippingOrderId);
      if (order) {
        const cleanPhone = order.customer_phone.replace(/[^\d]/g, "");
        const customerName = order.customer_name;
        const storeDisplayName = storeName || "متجرنا";
        
        let msgText = `أهلاً ${customerName}، طلبيتك من متجر ${storeDisplayName} تم شحنها الآن وهي في الطريق إليك! 🚀`;
        if (trackingVal) {
          msgText += `\nرابط تعقب الطلب: ${trackingVal}`;
        }
        
        const encodedText = encodeURIComponent(msgText);
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
        
        // Redirect to WhatsApp deep link in new tab
        window.open(waUrl, "_blank");
      }
    }
    
    // Reset states
    setShippingOrderId(null);
    setTrackingUrl("");
    setIsShippingSubmit(false);
  };

  // ── Bulk fulfill ──────────────────────────────────────────────────────────
  const handleMarkAll = async () => {
    setMarkingAll(true);
    await markAllDelivered();
    setMarkingAll(false);
  };

  // ── Printing Handlers ─────────────────────────────────────────────────────
  const handlePrintPickingList = () => {
    document.body.classList.add("print-picking-list-mode");
    window.print();
    document.body.classList.remove("print-picking-list-mode");
  };

  const handlePrintOrder = (orderId: string) => {
    // 1. Inject active print class to the specific order card in the DOM
    const card = document.getElementById(`order-${orderId}`);
    if (card) card.classList.add("order-active-print");

    // 2. Add print-order-mode class to body to hide everything else
    document.body.classList.add("print-order-mode");

    // 3. Open the browser printing dialog
    window.print();

    // 4. Clean up classes immediately after the print dialog closes
    document.body.classList.remove("print-order-mode");
    if (card) card.classList.remove("order-active-print");
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1rem" }}>
          <div className="skeleton" style={{ width: "120px", height: "28px", borderRadius: "var(--radius-sm)", marginBottom: "0.375rem" }} />
          <div className="skeleton" style={{ width: "180px", height: "16px", borderRadius: "var(--radius-sm)" }} />
        </div>
        <OrdersSkeleton />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div
          style={{
            background:   "var(--color-danger-muted)",
            border:       "1.5px solid var(--color-danger)",
            borderRadius: "var(--radius-md)",
            padding:      "1.25rem",
            textAlign:    "center",
          }}
        >
          <p style={{ fontWeight: 700, color: "var(--color-danger)" }}>خطأ في تحميل الطلبات</p>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.375rem" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", paddingBottom: "1.5rem" }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 800 }}>الطلبات اليوم 📋</h1>
            {/* Real-time live indicator */}
            <div
              title="متصل — تحديث فوري"
              style={{
                display:    "flex",
                alignItems: "center",
                gap:        "0.25rem",
                padding:    "0.2rem 0.5rem",
                background: "var(--color-success-muted)",
                borderRadius: "var(--radius-full)",
                fontSize:   "0.625rem",
                fontWeight: 700,
                color:      "var(--color-success)",
              }}
            >
              <span
                style={{
                  width:        "6px",
                  height:       "6px",
                  borderRadius: "50%",
                  background:   "var(--color-success)",
                  animation:    "pulse-dot 1.5s ease-in-out infinite",
                }}
              />
              مباشر
            </div>
          </div>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
            {new Date().toLocaleDateString("ar", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Analytics Navigation Link */}
        <Link
          href="/dashboard/orders/analytics"
          style={{
            padding: "0.45rem 0.875rem",
            background: "var(--color-primary-muted)",
            color: "var(--color-primary)",
            border: "1.5px solid var(--color-primary-glow)",
            borderRadius: "var(--radius-full)",
            fontFamily: "var(--font-cairo), sans-serif",
            fontWeight: 700,
            fontSize: "0.75rem",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            transition: "all 0.15s ease",
            boxShadow: "var(--shadow-sm)"
          }}
        >
          التقارير والتحليلات 📊
        </Link>
      </div>

      {/* ── KPI Stats Row ── */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap:                 "0.625rem",
          marginBottom:        "1.25rem",
        }}
      >
        <StatsCard
          value={pendingOrders.length}
          label="زبائن معلقون"
          icon="👥"
          color="warning"
        />
        <StatsCard
          value={`${totalPendingValue.toLocaleString("ar")} ${currencySymbol}`}
          label="إجمالي المعلق"
          icon="💰"
          color="primary"
        />
        <StatsCard
          value={distinctProducts}
          label="أصناف مختلفة"
          icon="📦"
          color="success"
        />
      </div>

      {/* ── LAYER 1: Daily Aggregation ── */}
      <DailyAggregation
        items={aggregated}
        pendingCount={pendingOrders.length}
        onMarkAll={handleMarkAll}
        isMarkingAll={markingAll}
        onPrint={handlePrintPickingList}
      />

      {/* ── LAYER 2: Customer Breakdown ── */}
      <div>
        <p style={{ fontSize: "0.9375rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.75rem" }}>
          تفاصيل طلبات الزبائن
        </p>

        {/* Filter tabs */}
        <FilterTabs
          active={filter}
          pendingCount={pendingOrders.length}
          shippedCount={shippedOrders.length}
          deliveredCount={deliveredOrders.length}
          onChange={setFilter}
        />

        {/* Order list */}
        {filteredOrders.length === 0 ? (
          <div
            style={{
              padding:      "2.5rem 1rem",
              textAlign:    "center",
              background:   "var(--color-surface)",
              borderRadius: "var(--radius-md)",
              border:       "1px solid var(--color-border)",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "0.625rem" }}>
              {filter === "pending" ? "✅" : filter === "shipped" ? "🚀" : "📋"}
            </div>
            <p style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>
              {filter === "pending"   ? "لا توجد طلبات معلقة" :
               filter === "shipped"   ? "لا توجد طلبات مشحونة اليوم" :
               filter === "delivered" ? "لا توجد طلبات مُسلَّمة اليوم" :
               "لا توجد طلبات اليوم بعد"}
            </p>
            {filter === "pending" && orders.length > 0 && (
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-faint)", marginTop: "0.375rem" }}>
                جميع الطلبات مُسلَّمة 🎉
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                expanded={expanded.has(order.id)}
                onToggle={() => toggleExpanded(order.id)}
                onFulfill={() => handleFulfill(order.id)}
                onShip={() => {
                  setShippingOrderId(order.id);
                  setTrackingUrl(order.tracking_url || "");
                }}
                currencySymbol={currencySymbol}
                fulfilling={fulfilling.has(order.id)}
                shipping={shippingOrderId === order.id}
                onPrint={() => handlePrintOrder(order.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Shipping Modal Overlay ── */}
      {shippingOrderId && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 15, 20, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 1000,
            animation: "fade-in 0.2s ease-out",
          }}
          onClick={() => setShippingOrderId(null)}
        >
          <div
            style={{
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-border-light)",
              borderRadius: "var(--radius-lg)",
              width: "100%",
              maxWidth: "420px",
              padding: "1.5rem",
              boxShadow: "var(--shadow-md)",
              animation: "slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              direction: "rtl",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.5rem" }}>
              شحن الطلبية 🚀
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              يرجى إدخال رابط تتبع الشحنة الاختياري لإرساله للزبون عبر الواتساب لتسهيل تتبع شحنته.
            </p>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                htmlFor="modal-tracking-url"
                style={{
                  display: "block",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: "var(--color-text-muted)",
                  marginBottom: "0.5rem",
                }}
              >
                رابط تعقب الشحنة الاختياري
              </label>
              <input
                id="modal-tracking-url"
                type="url"
                className="input-base"
                placeholder="https://example.com/track/..."
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                dir="ltr"
                style={{ textAlign: "left" }}
                disabled={isShippingSubmit}
                autoFocus
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => handleConfirmShip()}
                disabled={isShippingSubmit}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  background: isShippingSubmit ? "var(--color-surface-3)" : "var(--color-primary)",
                  color: isShippingSubmit ? "var(--color-text-faint)" : "#fff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontFamily: "var(--font-cairo), sans-serif",
                  fontWeight: 800,
                  fontSize: "0.875rem",
                  cursor: isShippingSubmit ? "not-allowed" : "pointer",
                  boxShadow: isShippingSubmit ? "none" : "0 2px 8px var(--color-primary-glow)",
                  transition: "all 0.15s",
                }}
              >
                {isShippingSubmit ? "جاري الحفظ..." : "تأكيد الشحن وإرسال إشعار 🚀"}
              </button>
              <button
                onClick={() => {
                  setShippingOrderId(null);
                  setTrackingUrl("");
                }}
                disabled={isShippingSubmit}
                style={{
                  padding: "0.75rem 1.25rem",
                  background: "var(--color-surface-3)",
                  color: "var(--color-text-muted)",
                  border: "1.5px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  fontFamily: "var(--font-cairo), sans-serif",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  cursor: isShippingSubmit ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pulse and modal animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
