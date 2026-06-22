"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface StoreDetail {
  id: string;
  name: string;
  slug: string;
  owner_name: string;
  owner_email: string;
  plan_tier: string;
  plan_type: string;
  subscription_status: string;
  subscription_ends_at: string | null;
  created_at: string;
  referral_date: string | null;
  totalPayments: number;
  lifetimeCommission: number;
  monthlyCommission: number;
  products_count?: number;
}

interface PartnerDetails {
  id: string;
  name: string;
  email: string | null;
  referral_code: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  totalReferredStores: number;
  activeStores: number;
  paidStores: number;
  totalRevenueGenerated: number;
  estimatedCommission: number;
  monthlyCommission: number;
}

interface MiniPartner {
  id: string;
  name: string;
  referral_code: string;
}

export default function AffiliateDetailsPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [partner, setPartner] = useState<PartnerDetails | null>(null);
  const [stores, setStores] = useState<StoreDetail[]>([]);
  const [allPartners, setAllPartners] = useState<MiniPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Reassignment Modal State
  const [selectedStore, setSelectedStore] = useState<StoreDetail | null>(null);
  const [newAffiliateId, setNewAffiliateId] = useState<string>("");
  const [reassignSubmitting, setReassignSubmitting] = useState(false);
  const [reassignError, setReassignError] = useState("");

  const fetchData = async () => {
    try {
      // 1. Fetch details of this partner
      const res = await fetch(`/api/admin/affiliates/${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل تحميل تفاصيل الشريك");
      }
      setPartner(data.data.partner);
      setStores(data.data.stores || []);

      // 2. Fetch list of all partners for the reassignment dropdown
      const partnersRes = await fetch("/api/admin/affiliates");
      const partnersData = await partnersRes.json();
      if (partnersRes.ok) {
        setAllPartners(
          (partnersData.data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            referral_code: p.referral_code
          }))
        );
      }
    } catch (e: any) {
      setError(e.message || "حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;
    setReassignSubmitting(true);
    setReassignError("");

    try {
      const res = await fetch(`/api/admin/affiliates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reassign_store",
          storeId: selectedStore.id,
          newAffiliateId: newAffiliateId === "none" ? null : newAffiliateId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل إعادة تعيين الإحالة");
      }
      setSelectedStore(null);
      setNewAffiliateId("");
      fetchData();
    } catch (e: any) {
      setReassignError(e.message || "حدث خطأ ما");
    } finally {
      setReassignSubmitting(false);
    }
  };

  const openReassign = (store: StoreDetail) => {
    setSelectedStore(store);
    setNewAffiliateId(partner?.id || ""); // default to current
    setReassignError("");
  };

  const PLAN_LABELS: Record<string, string> = {
    free: "المجانية 🆓",
    starter: "البداية ⚡",
    pro: "الاحترافية 🚀"
  };

  const STATUS_LABELS: Record<string, string> = {
    active: "نشط 🟢",
    expired: "منتهي 🔴",
    suspended: "موقوف ⚠️"
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
          <div className="spinner" style={spinnerStyle} />
          <span style={{ marginRight: "0.75rem", fontWeight: 700, fontSize: "1rem" }}>جاري تحميل تفاصيل الشريك...</span>
        </div>
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div style={containerStyle}>
        <div style={errorBannerStyle}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 800, marginBottom: "0.5rem" }}>عذراً، حدث خطأ</h2>
          <p style={{ fontSize: "0.875rem" }}>{error || "المسوق غير موجود."}</p>
          <Link href="/admin/affiliates" style={{ display: "inline-block", marginTop: "1rem", padding: "0.5rem 1rem", background: "var(--color-primary)", color: "#fff", textDecoration: "none", borderRadius: "var(--radius-md)", fontWeight: 700 }}>العودة للقائمة</Link>
        </div>
      </div>
    );
  }

  const host = typeof window !== "undefined" ? window.location.origin : "https://dukkanni.com";
  const refLink = `${host}/register?ref=${partner.referral_code}`;

  return (
    <div style={containerStyle}>
      {/* Breadcrumbs & Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Link href="/admin" style={{ textDecoration: "none", color: "var(--color-text-muted)", fontSize: "0.875rem", fontWeight: 700 }}>لوحة التحكم</Link>
          <span style={{ color: "var(--color-text-muted)" }}>/</span>
          <Link href="/admin/affiliates" style={{ textDecoration: "none", color: "var(--color-text-muted)", fontSize: "0.875rem", fontWeight: 700 }}>شركاء الأفلييت</Link>
          <span style={{ color: "var(--color-text-muted)" }}>/</span>
          <span style={{ color: "var(--color-text)", fontSize: "0.875rem", fontWeight: 700 }}>تفاصيل الشريك</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginTop: "0.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--color-text)" }}>
              تفاصيل المسوق: {partner.name} 🤝
            </h1>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
              عرض المتاجر التي سجلت عبر رابط هذا المسوق وحساب العمولات وإعادة تعيين الإحالات
            </p>
          </div>
          <Link href="/admin/affiliates" style={backBtnStyle}>
            ← عودة لقائمة المسوقين
          </Link>
        </div>
      </div>

      {/* Main Info Box */}
      <div style={infoCardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1.5rem" }}>
          <div style={{ flex: 1, minWidth: "250px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.75rem" }}>معلومات الحساب:</h3>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>الاسم:</span>
              <span style={infoValStyle}>{partner.name}</span>
            </div>
            {partner.email && (
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>البريد الإلكتروني:</span>
                <span style={infoValStyle}>{partner.email}</span>
              </div>
            )}
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>حالة الشريك:</span>
              <span
                style={{
                  display: "inline-flex",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  background: partner.is_active ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  color: partner.is_active ? "#10B981" : "var(--color-danger)"
                }}
              >
                {partner.is_active ? "نشط" : "معطل"}
              </span>
            </div>
            {partner.notes && (
              <div style={{ ...infoRowStyle, alignItems: "flex-start", flexDirection: "column" }}>
                <span style={infoLabelStyle}>ملاحظات المسؤول:</span>
                <span style={{ ...infoValStyle, fontSize: "0.8125rem", color: "var(--color-text-muted)", background: "var(--color-surface-2)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)", width: "100%", marginTop: "0.25rem", whiteSpace: "pre-wrap" }}>
                  {partner.notes}
                </span>
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: "250px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.75rem" }}>رابط الإحالة الخاص به:</h3>
            <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", padding: "1rem", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)" }}>كود الإحالة (Referral Code):</span>
                <span style={{ fontFamily: "monospace", fontWeight: 850, color: "var(--color-primary)" }}>{partner.referral_code}</span>
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--color-text)", wordBreak: "break-all" }} dir="ltr">{refLink}</div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(refLink);
                  alert("تم نسخ الرابط بنجاح!");
                }}
                style={{ width: "100%", padding: "0.5rem", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontWeight: 800, cursor: "pointer", fontSize: "0.8125rem", marginTop: "0.5rem" }}
              >
                📋 نسخ رابط الإحالة
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div style={kpiGridStyle}>
        <div style={kpiCardStyle}>
          <span style={kpiTitleStyle}>المتاجر المحالة 🏪</span>
          <span style={kpiValueStyle}>{partner.totalReferredStores}</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiTitleStyle}>المتاجر النشطة 🟢</span>
          <span style={kpiValueStyle}>{partner.activeStores}</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiTitleStyle}>المتاجر المشتركة بالباقات المدفوعة ⚡</span>
          <span style={kpiValueStyle}>{partner.paidStores}</span>
        </div>
        <div style={{ ...kpiCardStyle, background: "rgba(16, 185, 129, 0.05)", border: "1.5px solid #10B981" }}>
          <span style={{ ...kpiTitleStyle, color: "#10B981" }}>العمولة الشهرية التقديرية 💰</span>
          <span style={{ ...kpiValueStyle, color: "#10B981" }}>
            ${partner.monthlyCommission.toFixed(2)}
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, marginRight: "0.25rem" }}>/ شهرياً</span>
          </span>
        </div>
        <div style={{ ...kpiCardStyle, background: "var(--color-primary-muted)", border: "1.5px solid var(--color-primary)" }}>
          <span style={{ ...kpiTitleStyle, color: "var(--color-primary)" }}>إجمالي العمولات المتراكمة 💸</span>
          <span style={{ ...kpiValueStyle, color: "var(--color-primary)" }}>
            ${partner.estimatedCommission.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Referred Stores Section */}
      <div style={{ marginTop: "2.5rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 900, color: "var(--color-text)", marginBottom: "1rem" }}>
          📦 المتاجر المحالة بواسطة هذا الشريك ({stores.length})
        </h2>

        <div
          style={{
            background: "var(--color-surface)",
            border: "1.5px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)"
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
              <thead>
                <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                  <th style={tableHeaderStyle}>اسم المتجر</th>
                  <th style={tableHeaderStyle}>المالك</th>
                  <th style={tableHeaderStyle}>تاريخ الإحالة والتسجيل</th>
                  <th style={tableHeaderStyle}>الباقة الحالية</th>
                  <th style={tableHeaderStyle}>حالة الاشتراك</th>
                  <th style={tableHeaderStyle}>إجمالي المبيعات</th>
                  <th style={tableHeaderStyle}>العمولة (30%)</th>
                  <th style={{ ...tableHeaderStyle, textAlign: "left" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {stores.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                      لا توجد متاجر مسجلة عبر هذا المسوق حالياً.
                    </td>
                  </tr>
                ) : (
                  stores.map((s) => {
                    return (
                      <tr key={s.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <td style={tableCellStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 800, color: "var(--color-text)" }}>{s.name}</span>
                              <span
                                style={{
                                  fontSize: "0.6875rem",
                                  fontWeight: 700,
                                  background: "var(--color-surface-3)",
                                  color: "var(--color-text-muted)",
                                  padding: "0.1rem 0.35rem",
                                  borderRadius: "var(--radius-sm)",
                                  border: "1px solid var(--color-border)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  whiteSpace: "nowrap"
                                }}
                                title="عدد المنتجات الحالية في هذا المتجر"
                              >
                                📦 {s.products_count ?? 0} منتج
                              </span>
                            </div>
                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "block", marginTop: "2px" }} dir="ltr">@{s.slug}</span>
                        </td>
                        <td style={tableCellStyle}>
                          <div>
                            <div style={{ fontWeight: 700 }}>{s.owner_name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{s.owner_email}</div>
                          </div>
                        </td>
                        <td style={tableCellStyle}>
                          <span style={{ fontSize: "0.8125rem" }}>
                            {new Date(s.referral_date || s.created_at).toLocaleDateString("ar-EG")}
                          </span>
                        </td>
                        <td style={tableCellStyle}>
                          <span style={{ fontWeight: 700 }}>{PLAN_LABELS[s.plan_tier] || s.plan_tier}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "block" }}>
                            {s.plan_type === "yearly" ? "سنوي 🗓️" : (s.plan_type === "monthly" ? "شهري 📅" : "تجريبي ⏳")}
                          </span>
                        </td>
                        <td style={tableCellStyle}>
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "0.15rem 0.4rem",
                              borderRadius: "var(--radius-full)",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              background: s.subscription_status === "active" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                              color: s.subscription_status === "active" ? "#10B981" : "var(--color-danger)"
                            }}
                          >
                            {STATUS_LABELS[s.subscription_status] || s.subscription_status}
                          </span>
                        </td>
                        <td style={tableCellStyle}>
                          <span style={{ fontWeight: 750 }}>${s.totalPayments.toFixed(2)}</span>
                        </td>
                        <td style={tableCellStyle}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 800, color: "var(--color-primary)" }}>${s.lifetimeCommission.toFixed(2)}</span>
                            {s.monthlyCommission > 0 && (
                              <span style={{ fontSize: "0.7rem", color: "#10B981" }}>شهري: ${s.monthlyCommission.toFixed(2)}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ ...tableCellStyle, textAlign: "left" }}>
                          <button
                            onClick={() => openReassign(s)}
                            style={{ ...actionBtnStyle, background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                          >
                            🔗 إعادة تعيين الإحالة
                          </button>
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

      {/* REASSIGN REFERRAL MODAL */}
      {selectedStore && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 800 }}>🔗 إعادة تعيين إحالة المتجر</h3>
              <button onClick={() => setSelectedStore(null)} style={modalCloseBtnStyle}>✕</button>
            </div>

            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
              أنت تقوم بتغيير الشريك المسوق المسؤول عن متجر <strong>{selectedStore.name} (@{selectedStore.slug})</strong>.
            </p>

            {reassignError && <div style={formErrorStyle}>{reassignError}</div>}

            <form onSubmit={handleReassignSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>المسوق المسؤول الحالي:</label>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, padding: "0.5rem 0.75rem", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)" }}>
                  {partner.name} ({partner.referral_code})
                </div>
              </div>

              <div>
                <label style={labelStyle}>اختر المسوق البديل الجديد:</label>
                <select
                  value={newAffiliateId}
                  onChange={(e) => setNewAffiliateId(e.target.value)}
                  style={inputStyle}
                >
                  <option value={partner.id}>-- إبقاء المسوق الحالي ({partner.name}) --</option>
                  <option value="none">❌ إزالة الإحالة بالكامل (بلا مسوق)</option>
                  {allPartners
                    .filter((p) => p.id !== partner.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Code: {p.referral_code})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setSelectedStore(null)} style={btnCancelStyle}>إلغاء</button>
                <button type="submit" disabled={reassignSubmitting} style={btnSubmitStyle}>
                  {reassignSubmitting ? "جاري التحديث..." : "تحديث الإحالة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Styling Constants
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

const backBtnStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1.5px solid var(--color-border)",
  color: "var(--color-text)",
  borderRadius: "var(--radius-lg)",
  padding: "0.5rem 1rem",
  fontWeight: 800,
  fontSize: "0.8125rem",
  cursor: "pointer",
  textDecoration: "none",
  transition: "all 0.15s ease",
};

const infoCardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1.5px solid var(--color-border)",
  borderRadius: "var(--radius-xl)",
  padding: "1.5rem",
  marginTop: "1.5rem",
  boxShadow: "var(--shadow-sm)",
};

const infoRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px dashed var(--color-border)",
  padding: "0.5rem 0",
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "var(--color-text-muted)",
  fontWeight: 650
};

const infoValStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "var(--color-text)",
  fontWeight: 800
};

const kpiGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "1rem",
  marginTop: "2rem",
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

const tableHeaderStyle: React.CSSProperties = {
  padding: "1rem 1.25rem",
  fontSize: "0.75rem",
  fontWeight: 800,
  color: "var(--color-text-muted)",
  borderBottom: "1px solid var(--color-border)",
};

const tableCellStyle: React.CSSProperties = {
  padding: "1.25rem",
  fontSize: "0.875rem",
  color: "var(--color-text)",
  verticalAlign: "middle",
};

const actionBtnStyle: React.CSSProperties = {
  padding: "0.4rem 0.75rem",
  fontSize: "0.75rem",
  fontWeight: 700,
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
  border: "none",
  transition: "all 0.15s ease",
};

// Modals Styling
const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.65)",
  backdropFilter: "blur(4px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  padding: "1rem",
};

const modalContentStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1.5px solid var(--color-border)",
  borderRadius: "var(--radius-xl)",
  width: "100%",
  maxWidth: "500px",
  padding: "1.5rem",
  boxShadow: "var(--shadow-lg)",
  maxHeight: "90vh",
  overflowY: "auto",
};

const modalCloseBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--color-text-muted)",
  fontSize: "1.25rem",
  cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8125rem",
  fontWeight: 700,
  color: "var(--color-text)",
  marginBottom: "0.375rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 0.875rem",
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  color: "var(--color-text)",
  fontFamily: "var(--font-cairo), sans-serif",
  fontSize: "0.875rem",
  outline: "none",
  boxSizing: "border-box",
};

const formErrorStyle: React.CSSProperties = {
  background: "rgba(239, 68, 68, 0.1)",
  color: "var(--color-danger)",
  border: "1px solid rgba(239, 68, 68, 0.2)",
  padding: "0.75rem 1rem",
  borderRadius: "var(--radius-md)",
  fontSize: "0.8125rem",
  marginBottom: "1rem",
  fontWeight: 700,
};

const btnCancelStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--color-border)",
  color: "var(--color-text)",
  padding: "0.625rem 1.25rem",
  borderRadius: "var(--radius-lg)",
  fontSize: "0.875rem",
  fontWeight: 700,
  cursor: "pointer",
};

const btnSubmitStyle: React.CSSProperties = {
  background: "var(--color-primary)",
  color: "#fff",
  border: "none",
  padding: "0.625rem 1.25rem",
  borderRadius: "var(--radius-lg)",
  fontSize: "0.875rem",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 2px 8px var(--color-primary-glow)",
};
