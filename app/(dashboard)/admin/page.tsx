"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Store {
  id: string;
  name: string;
  slug: string;
  whatsapp_e164: string;
  plan_type: "trial" | "monthly" | "yearly";
  subscription_status: "active" | "expired" | "suspended";
  trial_ends_at: string;
  subscription_ends_at: string | null;
  owner_email: string;
  owner_name: string;
  owner_phone: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Fetch all stores and KPIs
  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/subscriptions");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "خطأ غير متوقع");
      }
      setStores(data.data.stores || []);
    } catch (e: any) {
      setError(e.message || "فشل تحميل لوحة تحكم المسؤول");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (storeId: string, action: "monthly" | "yearly" | "suspend") => {
    if (submittingId) return;
    setSubmittingId(`${storeId}-${action}`);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل تنفيذ العملية");
      }
      // Refresh local state
      await fetchData();
    } catch (e: any) {
      alert(e.message || "حدث خطأ ما");
    } finally {
      setSubmittingId(null);
    }
  };

  // KPI calculations
  const totalMerchants = stores.length;

  const activeTrials = stores.filter(
    (s) => s.plan_type === "trial" && s.subscription_status === "active"
  ).length;

  const expiredTrials = stores.filter(
    (s) =>
      (s.plan_type === "trial" && s.subscription_status === "expired") ||
      (s.plan_type === "trial" && new Date() > new Date(s.trial_ends_at))
  ).length;

  const activePaidTiers = stores.filter(
    (s) => ["monthly", "yearly"].includes(s.plan_type) && s.subscription_status === "active"
  ).length;

  const activeMonthly = stores.filter(
    (s) => s.plan_type === "monthly" && s.subscription_status === "active"
  ).length;

  const activeYearly = stores.filter(
    (s) => s.plan_type === "yearly" && s.subscription_status === "active"
  ).length;

  // Monthly Revenue projection: Monthly is $5, Yearly is $50/yr (~ $4.17/mo)
  const projectedRevenue = activeMonthly * 5 + activeYearly * (50 / 12);

  const PLAN_LABELS = {
    trial: "تجريبي ⏳",
    monthly: "شهري 🟢",
    yearly: "سنوي 🔵",
  };

  const STATUS_LABELS = {
    active: "نشط 🟢",
    expired: "منتهي 🔴",
    suspended: "موقوف ⚠️",
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
          <div className="spinner" style={spinnerStyle} />
          <span style={{ marginRight: "0.75rem", fontWeight: 700, fontSize: "1rem" }}>جاري تحميل لوحة التحكم...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={errorBannerStyle}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 800, marginBottom: "0.5rem" }}>عذراً، حدث خطأ</h2>
          <p style={{ fontSize: "0.875rem" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--color-text)", marginBottom: "0.25rem" }}>
          لوحة تحكم المسؤول الخارق ⚡
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
          إدارة الاشتراكات والفوترة للتاجر وتنشيط الباقات يدوياً
        </p>
      </div>

      {/* Section 1: KPI Platform Metrics */}
      <div style={kpiGridStyle}>
        <div style={kpiCardStyle}>
          <span style={kpiTitleStyle}>إجمالي المتاجر 🏪</span>
          <span style={kpiValueStyle}>{totalMerchants}</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiTitleStyle}>فترات تجريبية نشطة ⏳</span>
          <span style={kpiValueStyle}>{activeTrials}</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiTitleStyle}>فترات تجريبية منتهية 🔴</span>
          <span style={kpiValueStyle}>{expiredTrials}</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiTitleStyle}>اشتراكات مدفوعة نشطة 🟢</span>
          <span style={kpiValueStyle}>{activePaidTiers}</span>
        </div>
        <div style={{ ...kpiCardStyle, background: "var(--color-primary-muted)", border: "1.5px solid var(--color-primary)" }}>
          <span style={{ ...kpiTitleStyle, color: "var(--color-primary)" }}>الإيرادات الشهرية المتوقعة 💰</span>
          <span style={{ ...kpiValueStyle, color: "var(--color-primary)" }}>
            ${projectedRevenue.toFixed(2)}
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, marginRight: "0.25rem" }}>/ شهرياً</span>
          </span>
        </div>
      </div>

      {/* Section 2: Merchants List Database Table */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          marginTop: "2.5rem",
        }}
      >
        <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
          <h2 style={{ fontSize: "1.0625rem", fontWeight: 800, color: "var(--color-text)" }}>
            قاعدة بيانات التجار والاشتراكات 📋
          </h2>
        </div>

        {/* Responsive Table Wrap */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-3)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={thStyle}>اسم المتجر / المالك</th>
                <th style={thStyle}>الرابط السريع</th>
                <th style={thStyle}>التواصل والبريد</th>
                <th style={thStyle}>نوع الباقة</th>
                <th style={thStyle}>حالة الاشتراك</th>
                <th style={thStyle}>تاريخ الانتهاء</th>
                <th style={{ ...thStyle, textAlign: "center" }}>الإجراءات الإدارية</th>
              </tr>
            </thead>
            <tbody>
              {stores.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "2rem", textCombineUpright: "center", color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                    لا توجد متاجر مسجلة حالياً في المنصة.
                  </td>
                </tr>
              ) : (
                stores.map((s) => {
                  const isTrialExpired =
                    s.plan_type === "trial" &&
                    new Date() > new Date(s.trial_ends_at) &&
                    s.subscription_status !== "active";

                  const endDate = s.plan_type === "trial" ? s.trial_ends_at : s.subscription_ends_at;

                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: "1px solid var(--color-border)",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--color-surface-2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 800, color: "var(--color-text)", fontSize: "0.875rem" }}>{s.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                          {s.owner_name}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <a
                          href={`/${s.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: "0.8125rem",
                            color: "var(--color-primary)",
                            fontWeight: 700,
                            textDecoration: "underline",
                          }}
                        >
                          /{s.slug} ↗
                        </a>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontSize: "0.8125rem", color: "var(--color-text)", direction: "ltr", display: "inline-block" }}>
                          {s.owner_email}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                          {s.whatsapp_e164}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            padding: "0.25rem 0.5rem",
                            borderRadius: "var(--radius-sm)",
                            background:
                              s.plan_type === "trial"
                                ? "var(--color-warning-muted)"
                                : s.plan_type === "monthly"
                                ? "var(--color-primary-muted)"
                                : "rgba(59, 130, 246, 0.15)",
                            color:
                              s.plan_type === "trial"
                                ? "var(--color-warning)"
                                : s.plan_type === "monthly"
                                ? "var(--color-primary)"
                                : "#3b82f6",
                          }}
                        >
                          {PLAN_LABELS[s.plan_type] || s.plan_type}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            padding: "0.25rem 0.5rem",
                            borderRadius: "var(--radius-sm)",
                            background:
                              isTrialExpired || s.subscription_status === "expired"
                                ? "var(--color-danger-muted)"
                                : s.subscription_status === "suspended"
                                ? "rgba(239, 68, 68, 0.1)"
                                : "var(--color-success-muted)",
                            color:
                              isTrialExpired || s.subscription_status === "expired"
                                ? "var(--color-danger)"
                                : s.subscription_status === "suspended"
                                ? "var(--color-danger)"
                                : "var(--color-success)",
                          }}
                        >
                          {isTrialExpired ? "منتهي (تجريبي) 🔴" : STATUS_LABELS[s.subscription_status] || s.subscription_status}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontSize: "0.8125rem", color: "var(--color-text)", fontWeight: 700 }} dir="ltr">
                          {endDate ? (() => {
                            const d = new Date(endDate);
                            return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                          })() : "غير محدد"}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, paddingBlock: "0.75rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                          {/* Monthly Activation */}
                          <button
                            onClick={() => handleAction(s.id, "monthly")}
                            disabled={!!submittingId}
                            style={{
                              ...actionBtnStyle,
                              background: "var(--color-primary-muted)",
                              color: "var(--color-primary)",
                              border: "1px solid var(--color-primary-glow)",
                            }}
                          >
                            {submittingId === `${s.id}-monthly` ? "⏳..." : "تفعيل شهري 🟢"}
                          </button>

                          {/* Yearly Activation */}
                          <button
                            onClick={() => handleAction(s.id, "yearly")}
                            disabled={!!submittingId}
                            style={{
                              ...actionBtnStyle,
                              background: "rgba(59, 130, 246, 0.1)",
                              color: "#3b82f6",
                              border: "1px solid rgba(59, 130, 246, 0.2)",
                            }}
                          >
                            {submittingId === `${s.id}-yearly` ? "⏳..." : "تفعيل سنوي 🔵"}
                          </button>

                          {/* Account Suspension */}
                          <button
                            onClick={() => handleAction(s.id, "suspend")}
                            disabled={!!submittingId || s.subscription_status === "suspended"}
                            style={{
                              ...actionBtnStyle,
                              background: "rgba(239, 68, 68, 0.1)",
                              color: "var(--color-danger)",
                              border: "1px solid rgba(239, 68, 68, 0.2)",
                              opacity: s.subscription_status === "suspended" ? 0.5 : 1,
                              cursor: s.subscription_status === "suspended" ? "not-allowed" : "pointer",
                            }}
                          >
                            {submittingId === `${s.id}-suspend` ? "⏳..." : "حظر الحساب ⚠️"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Inline Styles for custom UI Aesthetics
const containerStyle: React.CSSProperties = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "1rem 1rem 3rem",
  fontFamily: "var(--font-cairo), sans-serif",
  direction: "rtl",
};

const spinnerStyle: React.CSSProperties = {
  width: "28px",
  height: "28px",
  border: "3px solid var(--color-border)",
  borderTop: "3px solid var(--color-primary)",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const errorBannerStyle: React.CSSProperties = {
  background: "var(--color-danger-muted)",
  border: "1.5px solid var(--color-danger)",
  color: "var(--color-danger)",
  borderRadius: "var(--radius-md)",
  padding: "1.25rem",
  textAlign: "center",
};

const kpiGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "1rem",
  marginTop: "1rem",
};

const kpiCardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1.5px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "1.25rem 1rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
};

const kpiTitleStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "var(--color-text-muted)",
};

const kpiValueStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 900,
  color: "var(--color-text)",
};

const thStyle: React.CSSProperties = {
  padding: "1rem 0.75rem",
  fontSize: "0.75rem",
  fontWeight: 800,
  color: "var(--color-text-muted)",
  borderBottom: "1px solid var(--color-border)",
};

const tdStyle: React.CSSProperties = {
  padding: "1rem 0.75rem",
  fontSize: "0.8125rem",
  verticalAlign: "middle",
};

const actionBtnStyle: React.CSSProperties = {
  padding: "0.375rem 0.625rem",
  borderRadius: "var(--radius-sm)",
  fontSize: "0.75rem",
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "var(--font-cairo), sans-serif",
  transition: "all 0.15s",
};
