"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AffiliatePartner {
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

export default function AffiliatesDashboard() {
  const [partners, setPartners] = useState<AffiliatePartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<AffiliatePartner | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch partners
  const fetchPartners = async () => {
    try {
      const res = await fetch("/api/admin/affiliates");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل تحميل البيانات");
      }
      setPartners(data.data || []);
    } catch (e: any) {
      setError(e.message || "حدث خطأ ما أثناء جلب قائمة الشركاء");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  // Handle Create Partner
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      setFormError("الاسم وكود الإحالة مطلوبان");
      return;
    }
    setFormSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          referral_code: formCode,
          notes: formNotes
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل إنشاء الشريك");
      }
      setIsCreateOpen(false);
      resetForm();
      fetchPartners();
    } catch (e: any) {
      setFormError(e.message || "حدث خطأ ما");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Edit Partner Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    if (!formName.trim()) {
      setFormError("الاسم مطلوب");
      return;
    }
    setFormSubmitting(true);
    setFormError("");

    try {
      const res = await fetch(`/api/admin/affiliates/${selectedPartner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          notes: formNotes,
          is_active: formActive
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل تعديل البيانات");
      }
      setIsEditOpen(false);
      resetForm();
      fetchPartners();
    } catch (e: any) {
      setFormError(e.message || "حدث خطأ ما");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Disable/Enable Toggle
  const handleToggleActive = async (partner: AffiliatePartner) => {
    if (confirm(`هل أنت متأكد من تغيير حالة المسوق "${partner.name}"؟`)) {
      try {
        const res = await fetch(`/api/admin/affiliates/${partner.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            is_active: !partner.is_active
          })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "فشل تحديث الحالة");
        }
        fetchPartners();
      } catch (e: any) {
        alert(e.message || "حدث خطأ ما");
      }
    }
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEdit = (partner: AffiliatePartner) => {
    setSelectedPartner(partner);
    setFormName(partner.name);
    setFormEmail(partner.email || "");
    setFormCode(partner.referral_code);
    setFormNotes(partner.notes || "");
    setFormActive(partner.is_active);
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormCode("");
    setFormNotes("");
    setFormActive(true);
    setFormError("");
    setSelectedPartner(null);
  };

  const handleCopyLink = (code: string, id: string) => {
    // Get host URL
    const host = typeof window !== "undefined" ? window.location.origin : "https://dukkanni.com";
    const refLink = `${host}/register?ref=${code}`;
    navigator.clipboard.writeText(refLink).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Filter partners
  const filteredPartners = partners.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.referral_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.is_active) ||
      (statusFilter === "inactive" && !p.is_active);

    return matchesSearch && matchesStatus;
  });

  // Calculate Cumulative Metrics
  const totalPartnersCount = partners.length;
  const cumulativeReferredStores = partners.reduce((sum, p) => sum + p.totalReferredStores, 0);
  const cumulativeActiveStores = partners.reduce((sum, p) => sum + p.activeStores, 0);
  const cumulativeRevenue = partners.reduce((sum, p) => sum + p.totalRevenueGenerated, 0);
  const cumulativeCommission = partners.reduce((sum, p) => sum + p.estimatedCommission, 0);
  const cumulativeMonthlyCommission = partners.reduce((sum, p) => sum + p.monthlyCommission, 0);

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
          <div className="spinner" style={spinnerStyle} />
          <span style={{ marginRight: "0.75rem", fontWeight: 700, fontSize: "1rem" }}>جاري تحميل صفحة الشركاء...</span>
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
          <button onClick={fetchPartners} style={{ marginTop: "1rem", padding: "0.5rem 1rem", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontWeight: 700 }}>إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Link href="/admin" style={{ textDecoration: "none", color: "var(--color-text-muted)", fontSize: "0.875rem", fontWeight: 700 }}>لوحة التحكم</Link>
            <span style={{ color: "var(--color-text-muted)" }}>/</span>
            <span style={{ color: "var(--color-text)", fontSize: "0.875rem", fontWeight: 700 }}>شركاء الأفلييت</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--color-text)", marginTop: "0.5rem" }}>
            إدارة شركاء الأفلييت والتسويق بالعمولة 🤝
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            إنشاء حسابات المسوقين وتتبع المتاجر المحالة وحساب عمولاتهم مدى الحياة (30%)
          </p>
        </div>

        <button onClick={openCreate} style={createBtnStyle}>
          ✨ إضافة مسوق جديد
        </button>
      </div>

      {/* KPI Cards */}
      <div style={kpiGridStyle}>
        <div style={kpiCardStyle}>
          <span style={kpiTitleStyle}>إجمالي المسوقين 👥</span>
          <span style={kpiValueStyle}>{totalPartnersCount}</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiTitleStyle}>المتاجر المحالة 🏪</span>
          <span style={kpiValueStyle}>{cumulativeReferredStores}</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiTitleStyle}>المتاجر النشطة 🟢</span>
          <span style={kpiValueStyle}>{cumulativeActiveStores}</span>
        </div>
        <div style={{ ...kpiCardStyle, background: "rgba(16, 185, 129, 0.05)", border: "1.5px solid #10B981" }}>
          <span style={{ ...kpiTitleStyle, color: "#10B981" }}>عمولات الشهر الحالي المتوقعة 💰</span>
          <span style={{ ...kpiValueStyle, color: "#10B981" }}>
            ${cumulativeMonthlyCommission.toFixed(2)}
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, marginRight: "0.25rem" }}>/ شهرياً</span>
          </span>
        </div>
        <div style={{ ...kpiCardStyle, background: "var(--color-primary-muted)", border: "1.5px solid var(--color-primary)" }}>
          <span style={{ ...kpiTitleStyle, color: "var(--color-primary)" }}>إجمالي العمولات المتراكمة 💸</span>
          <span style={{ ...kpiValueStyle, color: "var(--color-primary)" }}>
            ${cumulativeCommission.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Filters & Search Section */}
      <div style={filterSectionStyle}>
        <div style={{ display: "flex", gap: "1rem", flex: 1, minWidth: "280px" }}>
          <input
            type="text"
            placeholder="البحث بالاسم، كود الإحالة، أو البريد..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInputStyle}
          />
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setStatusFilter("all")}
            style={{ ...filterBtnStyle, ...(statusFilter === "all" ? activeFilterBtnStyle : {}) }}
          >
            الكل
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            style={{ ...filterBtnStyle, ...(statusFilter === "active" ? activeFilterBtnStyle : {}) }}
          >
            نشط
          </button>
          <button
            onClick={() => setStatusFilter("inactive")}
            style={{ ...filterBtnStyle, ...(statusFilter === "inactive" ? activeFilterBtnStyle : {}) }}
          >
            معطل
          </button>
        </div>
      </div>

      {/* Partners List Table */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
          marginTop: "1.5rem",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={tableHeaderStyle}>المسوق</th>
                <th style={tableHeaderStyle}>كود ورابط الإحالة</th>
                <th style={tableHeaderStyle}>المتاجر المحالة</th>
                <th style={tableHeaderStyle}>المتاجر النشطة</th>
                <th style={tableHeaderStyle}>إجمالي المبيعات</th>
                <th style={tableHeaderStyle}>العمولة الكلية</th>
                <th style={tableHeaderStyle}>الحالة</th>
                <th style={{ ...tableHeaderStyle, textAlign: "left" }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                    {partners.length === 0 ? "لا يوجد مسوقون حالياً. اضغط على 'إضافة مسوق جديد' للبدء." : "لا توجد نتائج تطابق خيارات البحث."}
                  </td>
                </tr>
              ) : (
                filteredPartners.map((p) => {
                  const host = typeof window !== "undefined" ? window.location.origin : "https://dukkanni.com";
                  const refLink = `${host}/register?ref=${p.referral_code}`;

                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={tableCellStyle}>
                        <div>
                          <div style={{ fontWeight: 800, color: "var(--color-text)" }}>{p.name}</div>
                          {p.email && (
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.125rem" }}>
                              {p.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-primary)", fontSize: "0.875rem" }}>{p.referral_code}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }} dir="ltr">{refLink}</span>
                            <button
                              onClick={() => handleCopyLink(p.referral_code, p.id)}
                              style={{
                                border: "none",
                                background: copiedId === p.id ? "rgba(16, 185, 129, 0.1)" : "var(--color-surface-2)",
                                color: copiedId === p.id ? "#10B981" : "var(--color-text)",
                                fontSize: "0.75rem",
                                padding: "0.15rem 0.4rem",
                                borderRadius: "var(--radius-sm)",
                                cursor: "pointer",
                                fontWeight: 700,
                              }}
                            >
                              {copiedId === p.id ? "✓ تم النسخ" : "📋 نسخ"}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{ fontWeight: 700 }}>{p.totalReferredStores}</span>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{ fontWeight: 700 }}>{p.activeStores}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginRight: "0.25rem" }}>
                          ({p.paidStores} مدفوع)
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{ fontWeight: 700, color: "var(--color-text)" }}>${p.totalRevenueGenerated.toFixed(2)}</span>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 800, color: "var(--color-primary)" }}>${p.estimatedCommission.toFixed(2)}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>شهرياً: ${p.monthlyCommission.toFixed(2)}</span>
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "var(--radius-full)",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            background: p.is_active ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            color: p.is_active ? "#10B981" : "var(--color-danger)",
                          }}
                        >
                          {p.is_active ? "نشط" : "معطل"}
                        </span>
                      </td>
                      <td style={{ ...tableCellStyle, textAlign: "left" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <Link href={`/admin/affiliates/${p.id}`} style={{ ...actionBtnStyle, background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)", textDecoration: "none" }}>
                            🔍 تفاصيل
                          </Link>
                          <button onClick={() => openEdit(p)} style={{ ...actionBtnStyle, background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", color: "#3b82f6" }}>
                            ✏️ تعديل
                          </button>
                          <button
                            onClick={() => handleToggleActive(p)}
                            style={{
                              ...actionBtnStyle,
                              background: p.is_active ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                              border: p.is_active ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)",
                              color: p.is_active ? "var(--color-danger)" : "#10B981"
                            }}
                          >
                            {p.is_active ? "📴 تعطيل" : "🔛 تنشيط"}
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

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 800 }}>✨ إضافة مسوق شريك جديد</h3>
              <button onClick={() => setIsCreateOpen(false)} style={modalCloseBtnStyle}>✕</button>
            </div>
            
            {formError && <div style={formErrorStyle}>{formError}</div>}

            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>اسم المسوق / الوكالة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد محمد، وكالة التسويق الإبداعي"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>كود الإحالة الفريد (Referral Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ahmed, agency1 (حروف إنجليزية صغيرة وأرقام فقط)"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  style={inputStyle}
                />
                <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>سيستخدم في توليد رابط الإحالة: dukkanni.com/register?ref=[الكود]</span>
              </div>

              <div>
                <label style={labelStyle}>ملاحظات إضافية</label>
                <textarea
                  placeholder="ملاحظات المسؤول حول هذا الشريك..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setIsCreateOpen(false)} style={btnCancelStyle}>إلغاء</button>
                <button type="submit" disabled={formSubmitting} style={btnSubmitStyle}>
                  {formSubmitting ? "جاري الحفظ..." : "إنشاء الشريك"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && selectedPartner && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 800 }}>✏️ تعديل بيانات المسوق: {selectedPartner.name}</h3>
              <button onClick={() => setIsEditOpen(false)} style={modalCloseBtnStyle}>✕</button>
            </div>
            
            {formError && <div style={formErrorStyle}>{formError}</div>}

            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>اسم المسوق / الوكالة *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>كود الإحالة الفريد (غير قابل للتعديل)</label>
                <input
                  type="text"
                  disabled
                  value={formCode}
                  style={{ ...inputStyle, background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}
                />
              </div>

              <div>
                <label style={labelStyle}>ملاحظات إضافية</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="editActiveCheckbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="editActiveCheckbox" style={{ fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}>شريك نشط ويسمح بالتسجيل عبر رابطه</label>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setIsEditOpen(false)} style={btnCancelStyle}>إلغاء</button>
                <button type="submit" disabled={formSubmitting} style={btnSubmitStyle}>
                  {formSubmitting ? "جاري الحفظ..." : "حفظ التعديلات"}
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

const createBtnStyle: React.CSSProperties = {
  background: "var(--color-primary)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-lg)",
  padding: "0.75rem 1.25rem",
  fontWeight: 800,
  fontSize: "0.875rem",
  cursor: "pointer",
  boxShadow: "0 4px 12px var(--color-primary-glow)",
  transition: "transform 0.15s ease",
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

const filterSectionStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "var(--color-surface)",
  border: "1.5px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "1rem",
  marginTop: "2rem",
  gap: "1rem",
  flexWrap: "wrap",
};

const searchInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 1rem",
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  color: "var(--color-text)",
  fontFamily: "var(--font-cairo), sans-serif",
  fontSize: "0.875rem",
  outline: "none",
};

const filterBtnStyle: React.CSSProperties = {
  padding: "0.5rem 1rem",
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text-muted)",
  borderRadius: "var(--radius-md)",
  fontWeight: 700,
  fontSize: "0.8125rem",
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const activeFilterBtnStyle: React.CSSProperties = {
  background: "var(--color-primary-muted)",
  borderColor: "var(--color-primary)",
  color: "var(--color-primary)",
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
