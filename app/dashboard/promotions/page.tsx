"use client";

/**
 * app/dashboard/promotions/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Coupon & Promotions Management Dashboard
 *
 * Features:
 *   - Tab navigation (Active promotions, Inactive/Expired, Analytics)
 *   - Detailed promotions cards (Uses tracking, progress bars, date ranges)
 *   - Create/Edit Modal with conditional fields (Coupon vs Automatic)
 *   - Detailed Analytics Modal (Lists order history and total discount totals)
 *   - Skeleton loading state
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

interface OrderSummary {
  id: string;
  customer_name: string;
  total_amount: number;
  discount_amount: number;
  created_at: string;
}

interface PromotionWithStats {
  id: string;
  store_id: string;
  name: string;
  code: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  max_uses: number | null;
  target_type: "all" | "category" | "product" | "shipping";
  target_id: string | null;
  created_at: string;
  stats: {
    totalUses: number;
    totalDiscountAmount: number;
    orders: OrderSummary[];
  };
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function PromotionsSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      {[1, 2].map((i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: "180px", borderRadius: "var(--radius-lg)" }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function PromotionsPage() {
  const { toast } = useToast();

  const [promotions, setPromotions] = useState<PromotionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
  const [storeCurrency, setStoreCurrency] = useState("TRY");

  // Modals / Modifying States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<PromotionWithStats | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formIsCoupon, setFormIsCoupon] = useState(true);
  const [formCode, setFormCode] = useState("");
  const [formDiscountType, setFormDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [formDiscountValue, setFormDiscountValue] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formMaxUsesEnabled, setFormMaxUsesEnabled] = useState(false);
  const [formMaxUses, setFormMaxUses] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Fetch Promotions ──────────────────────────────────────────────────────
  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/promotions");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "فشل جلب العروض");
      setPromotions(json.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل جلب العروض");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch Store settings for default currency
  useEffect(() => {
    fetch("/api/store")
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.currency_code) {
          setStoreCurrency(j.data.currency_code);
        }
      })
      .catch(() => {});
    fetchPromotions();
  }, [fetchPromotions]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
  };

  const getStatusBadge = (promo: PromotionWithStats) => {
    const now = new Date();
    const start = new Date(promo.start_date);
    const end = new Date(promo.end_date);

    if (!promo.is_active) {
      return { label: "غير نشط", color: "var(--color-text-faint)", bg: "var(--color-surface-3)" };
    }
    if (now < start) {
      return { label: "مجدول", color: "var(--color-warning)", bg: "rgba(245, 158, 11, 0.1)" };
    }
    if (now > end) {
      return { label: "منتهي الصلاحية", color: "var(--color-danger)", bg: "var(--color-danger-muted)" };
    }
    if (promo.max_uses != null && promo.stats.totalUses >= promo.max_uses) {
      return { label: "مكتمل الاستخدام", color: "var(--color-danger)", bg: "var(--color-danger-muted)" };
    }
    return { label: "نشط حالياً", color: "var(--color-success)", bg: "var(--color-success-muted)" };
  };

  // ── Filter Promotions based on Active/Inactive Tab ────────────────────────
  const filteredPromotions = promotions.filter((promo) => {
    const status = getStatusBadge(promo);
    const isPromoActive = status.label === "نشط حالياً" || status.label === "مجدول";
    return activeTab === "active" ? isPromoActive : !isPromoActive;
  });

  // ── Open Form (Create Mode) ───────────────────────────────────────────────
  const handleOpenCreate = () => {
    setSelectedPromo(null);
    setFormName("");
    setFormIsCoupon(true);
    setFormCode("");
    setFormDiscountType("percentage");
    setFormDiscountValue("");
    
    // Set default dates: start now, end 1 month from now
    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(now.getMonth() + 1);
    
    // Format to YYYY-MM-DD
    const formatDateInput = (date: Date) => {
      const offset = date.getTimezoneOffset();
      const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
      return adjustedDate.toISOString().slice(0, 16);
    };

    setFormStartDate(formatDateInput(now));
    setFormEndDate(formatDateInput(oneMonthLater));
    
    setFormMaxUsesEnabled(false);
    setFormMaxUses("");
    setFormIsActive(true);
    setFormErrors({});
    setIsFormOpen(true);
  };

  // ── Open Form (Edit Mode) ─────────────────────────────────────────────────
  const handleOpenEdit = (promo: PromotionWithStats) => {
    setSelectedPromo(promo);
    setFormName(promo.name);
    setFormIsCoupon(promo.code !== null);
    setFormCode(promo.code ?? "");
    setFormDiscountType(promo.discount_type);
    setFormDiscountValue(promo.discount_value.toString());
    
    const formatDateInput = (isoStr: string) => {
      const date = new Date(isoStr);
      const offset = date.getTimezoneOffset();
      const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
      return adjustedDate.toISOString().slice(0, 16);
    };

    setFormStartDate(formatDateInput(promo.start_date));
    setFormEndDate(formatDateInput(promo.end_date));
    
    setFormMaxUsesEnabled(promo.max_uses !== null);
    setFormMaxUses(promo.max_uses?.toString() ?? "");
    setFormIsActive(promo.is_active);
    setFormErrors({});
    setIsFormOpen(true);
  };

  // ── Toggle Activation ─────────────────────────────────────────────────────
  const handleToggleActive = async (promo: PromotionWithStats, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/promotions?id=${promo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "فشل تغيير حالة العرض");
      
      setPromotions((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, is_active: !currentStatus } : p))
      );
      toast.success(currentStatus ? "تم تعطيل العرض مؤقتاً" : "تم تفعيل العرض بنجاح ✓");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل تعديل حالة العرض");
    }
  };

  // ── Delete Promotion ──────────────────────────────────────────────────────
  const handleDeletePromo = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذا العرض نهائياً؟")) return;
    try {
      const res = await fetch(`/api/promotions?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "فشل حذف العرض");
      
      setPromotions((prev) => prev.filter((p) => p.id !== id));
      setIsFormOpen(false);
      toast.success("تم حذف العرض بنجاح");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل حذف العرض");
    }
  };

  // ── Submit Form (Create or Edit) ──────────────────────────────────────────
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    
    // Frontend Validations
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = "اسم العرض مطلوب";
    if (formIsCoupon && !formCode.trim()) errors.code = "رمز الكوبون مطلوب عند اختيار نوع كوبون خصم";
    if (formIsCoupon && formCode.trim().length < 3) errors.code = "رمز الكوبون يجب أن لا يقل عن 3 أحرف";
    
    const value = parseFloat(formDiscountValue);
    if (isNaN(value) || value < 0) {
      errors.discount_value = "قيمة الخصم يجب أن تكون رقماً أكبر من أو يساوي 0";
    } else if (formDiscountType === "percentage" && value > 100) {
      errors.discount_value = "نسبة الخصم لا يمكن أن تتجاوز 100%";
    }

    if (!formStartDate) errors.start_date = "تاريخ البدء مطلوب";
    if (!formEndDate) errors.end_date = "تاريخ الانتهاء مطلوب";
    if (formStartDate && formEndDate && new Date(formStartDate) > new Date(formEndDate)) {
      errors.end_date = "تاريخ الانتهاء لا يمكن أن يكون قبل تاريخ البدء";
    }

    let maxUsesVal: number | null = null;
    if (formMaxUsesEnabled) {
      const uses = parseInt(formMaxUses);
      if (isNaN(uses) || uses <= 0) {
        errors.max_uses = "عدد المرات يجب أن يكون رقماً صحيحاً أكبر من 0";
      } else {
        maxUsesVal = uses;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);

    const payload = {
      name: formName.trim(),
      code: formIsCoupon ? formCode.trim().toUpperCase() : null,
      discount_type: formDiscountType,
      discount_value: value,
      start_date: new Date(formStartDate).toISOString(),
      end_date: new Date(formEndDate).toISOString(),
      is_active: formIsActive,
      max_uses: maxUsesVal,
      target_type: "all",
      target_id: null,
    };

    try {
      const url = selectedPromo ? `/api/promotions?id=${selectedPromo.id}` : "/api/promotions";
      const method = selectedPromo ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json.details) {
          setFormErrors(json.details);
        }
        throw new Error(json.error ?? "حدث خطأ أثناء حفظ العرض");
      }

      toast.success(selectedPromo ? "تم تعديل العرض بنجاح ✓" : "تم إنشاء العرض بنجاح ✓");
      setIsFormOpen(false);
      fetchPromotions(); // Refresh list to get fresh server calculations
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل حفظ العرض");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Open Analytics ────────────────────────────────────────────────────────
  const handleOpenAnalytics = (promo: PromotionWithStats) => {
    setSelectedPromo(promo);
    setIsAnalyticsOpen(true);
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", paddingBottom: "2rem", fontFamily: "var(--font-cairo), sans-serif" }}>

      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-text)" }}>
            العروض والكوبونات 🏷️
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
            أنشئ حملات ترويجية لجذب الزبائن وزيادة مبيعات متجرك
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn-primary"
          style={{ fontSize: "0.875rem", padding: "0.6rem 1rem", minHeight: "42px", gap: "0.375rem" }}
        >
          + إضافة عرض جديد
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1.5px solid var(--color-border)",
          marginBottom: "1rem",
          gap: "1.25rem",
        }}
      >
        <button
          onClick={() => setActiveTab("active")}
          style={{
            background: "none",
            border: "none",
            paddingBottom: "0.75rem",
            color: activeTab === "active" ? "var(--color-primary)" : "var(--color-text-faint)",
            fontWeight: activeTab === "active" ? 800 : 600,
            fontSize: "0.9rem",
            cursor: "pointer",
            borderBottom: activeTab === "active" ? "2.5px solid var(--color-primary)" : "2.5px solid transparent",
            transition: "all 0.2s",
            outline: "none"
          }}
        >
          العروض النشطة والمجدولة ({promotions.filter(p => {
            const label = getStatusBadge(p).label;
            return label === "نشط حالياً" || label === "مجدول";
          }).length})
        </button>
        <button
          onClick={() => setActiveTab("inactive")}
          style={{
            background: "none",
            border: "none",
            paddingBottom: "0.75rem",
            color: activeTab === "inactive" ? "var(--color-primary)" : "var(--color-text-faint)",
            fontWeight: activeTab === "inactive" ? 800 : 600,
            fontSize: "0.9rem",
            cursor: "pointer",
            borderBottom: activeTab === "inactive" ? "2.5px solid var(--color-primary)" : "2.5px solid transparent",
            transition: "all 0.2s",
            outline: "none"
          }}
        >
          غير النشطة والمنتهية ({promotions.filter(p => {
            const label = getStatusBadge(p).label;
            return label !== "نشط حالياً" && label !== "مجدول";
          }).length})
        </button>
      </div>

      {/* List Container */}
      {loading ? (
        <PromotionsSkeleton />
      ) : filteredPromotions.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "2.5rem 1.5rem",
            textAlign: "center",
            background: "var(--color-surface)",
            color: "var(--color-text-muted)"
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🏷️</div>
          <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text)", marginBottom: "0.25rem" }}>
            لا يوجد عروض في هذا القسم
          </p>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-faint)" }}>
            اضغط على زر "إضافة عرض جديد" لبدء إنشاء حملاتك الترويجية.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {filteredPromotions.map((promo) => {
            const badge = getStatusBadge(promo);
            const isCoupon = promo.code !== null;
            const progress = promo.max_uses ? (promo.stats.totalUses / promo.max_uses) * 100 : 0;
            const isLimitNear = promo.max_uses && (promo.stats.totalUses / promo.max_uses) >= 0.8;

            return (
              <div
                key={promo.id}
                className="card"
                style={{
                  padding: "1.25rem",
                  background: "var(--color-surface)",
                  border: "1.5px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  transition: "border-color 0.15s"
                }}
              >
                {/* Header: Title + Status Badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <div>
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
                      {promo.name}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                      {isCoupon ? (
                        <code
                          style={{
                            background: "var(--color-surface-2)",
                            color: "var(--color-primary)",
                            border: "1px dashed var(--color-primary-glow)",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            fontFamily: "monospace"
                          }}
                        >
                          🎫 {promo.code}
                        </code>
                      ) : (
                        <span
                          style={{
                            background: "rgba(37, 211, 102, 0.1)",
                            color: "var(--color-success)",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.75rem",
                            fontWeight: 700
                          }}
                        >
                          ⚡ خصم تلقائي للمتجر
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      color: badge.color,
                      background: badge.bg,
                      padding: "3px 8px",
                      borderRadius: "var(--radius-full)"
                    }}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Body: Discount Info & Stats */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.75rem",
                    background: "var(--color-surface-2)",
                    padding: "0.75rem",
                    borderRadius: "var(--radius-md)"
                  }}
                >
                  <div>
                    <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", margin: 0 }}>قيمة الخصم</p>
                    <p style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--color-success)", margin: 0, marginTop: "2px" }}>
                      {promo.discount_type === "percentage" ? (
                        `%${promo.discount_value}`
                      ) : (
                        `${promo.discount_value.toLocaleString()} ${storeCurrency}`
                      )}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", margin: 0 }}>إجمالي الاستخدام</p>
                    <p style={{ fontSize: "1rem", fontWeight: 800, color: "var(--color-text)", margin: 0, marginTop: "4px" }}>
                      {promo.stats.totalUses} {promo.max_uses ? `/ ${promo.max_uses}` : "مرة"}
                    </p>
                  </div>
                </div>

                {/* Progress bar for limited coupons */}
                {promo.max_uses && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "4px" }}>
                      <span>نسبة استهلاك الحد الأقصى</span>
                      <strong>%{Math.round(progress)}</strong>
                    </div>
                    <div style={{ height: "6px", background: "var(--color-surface-3)", borderRadius: "3px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${progress}%`,
                          background: isLimitNear ? "var(--color-danger)" : "var(--color-primary)",
                          borderRadius: "3px"
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Date range info */}
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>📅</span>
                  <span>فترة الصلاحية:</span>
                  <strong>{formatDate(promo.start_date)}</strong>
                  <span>←</span>
                  <strong>{formatDate(promo.end_date)}</strong>
                </p>

                {/* Action Bar */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid var(--color-border-light)",
                    paddingTop: "0.75rem",
                    marginTop: "0.25rem"
                  }}
                >
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => handleOpenEdit(promo)}
                      className="btn-ghost"
                      style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem", minHeight: "32px", borderColor: "var(--color-border)" }}
                    >
                      📝 تعديل العرض
                    </button>
                    <button
                      onClick={() => handleOpenAnalytics(promo)}
                      className="btn-ghost"
                      style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem", minHeight: "32px", borderColor: "var(--color-border)", color: "var(--color-primary)" }}
                    >
                      📊 الإحصائيات ({promo.stats.totalUses})
                    </button>
                  </div>

                  {/* Toggle Activation Switch */}
                  <button
                    onClick={() => handleToggleActive(promo, promo.is_active)}
                    className="btn-ghost"
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.35rem 0.75rem",
                      minHeight: "32px",
                      borderColor: "var(--color-border)",
                      color: promo.is_active ? "var(--color-danger)" : "var(--color-success)",
                      background: "transparent",
                    }}
                  >
                    {promo.is_active ? "⏸️ تعطيل" : "▶️ تفعيل"}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE/EDIT MODAL ── */}
      {isFormOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 15, 20, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
            backdropFilter: "blur(6px)",
            direction: "rtl"
          }}
          onClick={() => setIsFormOpen(false)}
        >
          <div
            style={{
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              width: "100%",
              maxWidth: "480px",
              maxHeight: "90dvh",
              overflowY: "auto",
              padding: "1.5rem",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: "1rem"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
                {selectedPromo ? "تعديل العرض الترويجي ⚙️" : "إضافة عرض ترويجي جديد 🏷️"}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", marginTop: "2px" }}>
                املأ الحقول التالية لتهيئة عرض الخصم أو كود الكوبون
              </p>
            </div>

            <button
              onClick={() => setIsFormOpen(false)}
              style={{
                position: "absolute",
                top: "1.25rem",
                left: "1.25rem",
                background: "none",
                border: "none",
                color: "var(--color-text-faint)",
                cursor: "pointer",
                fontSize: "1.25rem",
                padding: "4px"
              }}
            >
              ✕
            </button>

            <form onSubmit={handleSubmitForm} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              
              {/* Promotion Name */}
              <div>
                <label style={labelStyle} htmlFor="promo-name">اسم العرض الترويجي</label>
                <input
                  id="promo-name"
                  type="text"
                  className={`input-base${formErrors.name ? " input-error" : ""}`}
                  placeholder="مثال: خصومات عيد الأضحى المبارك"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  maxLength={120}
                  disabled={submitting}
                />
                {formErrors.name && <p style={errorStyle}>{formErrors.name}</p>}
              </div>

              {/* Promotion Type Choice */}
              <div>
                <label style={labelStyle}>نوع العرض</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setFormIsCoupon(true)}
                    style={{
                      padding: "0.6rem",
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid",
                      borderColor: formIsCoupon ? "var(--color-primary)" : "var(--color-border)",
                      background: formIsCoupon ? "var(--color-primary-muted)" : "var(--color-surface)",
                      color: formIsCoupon ? "var(--color-primary)" : "var(--color-text-muted)",
                      fontWeight: 700,
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    🎫 كوبون خصم رمز
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormIsCoupon(false)}
                    style={{
                      padding: "0.6rem",
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid",
                      borderColor: !formIsCoupon ? "var(--color-primary)" : "var(--color-border)",
                      background: !formIsCoupon ? "var(--color-primary-muted)" : "var(--color-surface)",
                      color: !formIsCoupon ? "var(--color-primary)" : "var(--color-text-muted)",
                      fontWeight: 700,
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    ⚡ خصم تلقائي للجميع
                  </button>
                </div>
              </div>

              {/* Coupon Code (Visible only if Coupon selected) */}
              {formIsCoupon && (
                <div>
                  <label style={labelStyle} htmlFor="promo-code">رمز الكوبون (الرمز المكتوب)</label>
                  <input
                    id="promo-code"
                    type="text"
                    className={`input-base${formErrors.code ? " input-error" : ""}`}
                    placeholder="مثال: EID2026"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                    maxLength={30}
                    style={{ direction: "ltr", textAlign: "right" }}
                    disabled={submitting}
                  />
                  {formErrors.code && <p style={errorStyle}>{formErrors.code}</p>}
                  <p style={{ fontSize: "0.6875rem", color: "var(--color-text-faint)", marginTop: "3px" }}>
                    يجب أن يكون باللغة الإنجليزية، بدون مسافات، وسيقوم النظام تلقائياً بتحويله للأحرف الكبيرة.
                  </p>
                </div>
              )}

              {/* Discount Details: Type & Value */}
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "0.5rem" }}>
                <div>
                  <label style={labelStyle} htmlFor="promo-discount-type">نوع الخصم</label>
                  <select
                    id="promo-discount-type"
                    value={formDiscountType}
                    onChange={(e) => setFormDiscountType(e.target.value as any)}
                    className="input-base"
                    style={{ padding: "0.625rem 0.5rem" }}
                    disabled={submitting}
                  >
                    <option value="percentage">نسبة (%)</option>
                    <option value="fixed">مبلغ ({storeCurrency})</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="promo-discount-value">قيمة الخصم</label>
                  <input
                    id="promo-discount-value"
                    type="number"
                    step="any"
                    className={`input-base${formErrors.discount_value ? " input-error" : ""}`}
                    placeholder={formDiscountType === "percentage" ? "10" : "15"}
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(e.target.value)}
                    disabled={submitting}
                  />
                  {formErrors.discount_value && <p style={errorStyle}>{formErrors.discount_value}</p>}
                </div>
              </div>

              {/* Date Ranges */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div>
                  <label style={labelStyle} htmlFor="promo-start-date">تاريخ البدء</label>
                  <input
                    id="promo-start-date"
                    type="datetime-local"
                    className={`input-base${formErrors.start_date ? " input-error" : ""}`}
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    disabled={submitting}
                  />
                  {formErrors.start_date && <p style={errorStyle}>{formErrors.start_date}</p>}
                </div>
                <div>
                  <label style={labelStyle} htmlFor="promo-end-date">تاريخ الانتهاء</label>
                  <input
                    id="promo-end-date"
                    type="datetime-local"
                    className={`input-base${formErrors.end_date ? " input-error" : ""}`}
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    disabled={submitting}
                  />
                  {formErrors.end_date && <p style={errorStyle}>{formErrors.end_date}</p>}
                </div>
              </div>

              {/* Usage limits (Only visible for Coupons) */}
              {formIsCoupon && (
                <div
                  style={{
                    background: "var(--color-surface-2)",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem"
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-text)" }}>
                    <input
                      type="checkbox"
                      checked={formMaxUsesEnabled}
                      onChange={(e) => setFormMaxUsesEnabled(e.target.checked)}
                      disabled={submitting}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    تحديد حد أقصى لعدد مرات استخدام الكوبون
                  </label>
                  
                  {formMaxUsesEnabled && (
                    <div style={{ marginTop: "4px" }}>
                      <input
                        type="number"
                        className={`input-base${formErrors.max_uses ? " input-error" : ""}`}
                        placeholder="أدخل عدد المرات الأقصى، مثلاً: 100"
                        value={formMaxUses}
                        onChange={(e) => setFormMaxUses(e.target.value)}
                        disabled={submitting}
                      />
                      {formErrors.max_uses && <p style={errorStyle}>{formErrors.max_uses}</p>}
                      <p style={{ fontSize: "0.6875rem", color: "var(--color-text-faint)", marginTop: "4px" }}>
                        سيتعطل الكوبون تلقائياً للعملاء بمجرد وصول عدد الطلبات المكتملة باستخدامه للرقم المحدد.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Toggle Activation Option */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.25rem 0" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-text)" }}>
                  تفعيل هذا العرض فوراً
                </span>
                <label style={{ position: "relative", display: "inline-block", width: "44px", height: "24px" }}>
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    disabled={submitting}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: 0, left: 0, right: 0, bottom: 0,
                      background: formIsActive ? "var(--color-success)" : "var(--color-surface-3)",
                      borderRadius: "12px",
                      cursor: "pointer",
                      transition: "0.2s"
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        content: '""',
                        height: "16px", width: "16px",
                        left: formIsActive ? "4px" : "24px",
                        bottom: "4px",
                        background: "#ffffff",
                        borderRadius: "50%",
                        transition: "0.2s"
                      }}
                    />
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{ flex: 1, minHeight: "44px", fontWeight: 800 }}
                >
                  {submitting ? "جاري الحفظ..." : "حفظ العرض"}
                </button>
                {selectedPromo && (
                  <button
                    type="button"
                    onClick={() => handleDeletePromo(selectedPromo.id)}
                    className="btn-ghost"
                    style={{ color: "var(--color-danger)", borderColor: "var(--color-danger)", paddingInline: "1rem" }}
                    disabled={submitting}
                  >
                    🗑️ حذف
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="btn-ghost"
                  style={{ borderColor: "var(--color-border)", paddingInline: "1.25rem" }}
                  disabled={submitting}
                >
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── DETAILED ANALYTICS MODAL ── */}
      {isAnalyticsOpen && selectedPromo && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 15, 20, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
            backdropFilter: "blur(6px)",
            direction: "rtl"
          }}
          onClick={() => setIsAnalyticsOpen(false)}
        >
          <div
            style={{
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              width: "100%",
              maxWidth: "500px",
              maxHeight: "85dvh",
              overflowY: "auto",
              padding: "1.5rem",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
                إحصائيات الأداء 📊
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", marginTop: "2px" }}>
                تحليل أداء الحملة الترويجية للعرض: <strong>{selectedPromo.name}</strong>
              </p>
            </div>

            <button
              onClick={() => setIsAnalyticsOpen(false)}
              style={{
                position: "absolute",
                top: "1.25rem",
                left: "1.25rem",
                background: "none",
                border: "none",
                color: "var(--color-text-faint)",
                cursor: "pointer",
                fontSize: "1.25rem",
                padding: "4px"
              }}
            >
              ✕
            </button>

            {/* Quick Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
              <div className="card-2" style={{ padding: "0.75rem", textAlign: "center", background: "var(--color-surface-2)" }}>
                <p style={{ fontSize: "0.6875rem", color: "var(--color-text-faint)", margin: 0 }}>عدد الاستخدامات</p>
                <p style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-primary)", margin: 0, marginTop: "2px" }}>
                  {selectedPromo.stats.totalUses}
                </p>
              </div>
              <div className="card-2" style={{ padding: "0.75rem", textAlign: "center", background: "var(--color-surface-2)" }}>
                <p style={{ fontSize: "0.6875rem", color: "var(--color-text-faint)", margin: 0 }}>إجمالي الخصومات</p>
                <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-success)", margin: 0, marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedPromo.stats.totalDiscountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {storeCurrency}
                </p>
              </div>
              <div className="card-2" style={{ padding: "0.75rem", textAlign: "center", background: "var(--color-surface-2)" }}>
                <p style={{ fontSize: "0.6875rem", color: "var(--color-text-faint)", margin: 0 }}>حد المرات</p>
                <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-text)", margin: 0, marginTop: "4px" }}>
                  {selectedPromo.max_uses ?? "∞"}
                </p>
              </div>
            </div>

            {/* Order History */}
            <div>
              <h4 style={{ fontSize: "0.875rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.625rem" }}>
                📋 الطلبات الناتجة عن الكوبون
              </h4>
              
              {selectedPromo.stats.orders.length === 0 ? (
                <div
                  style={{
                    padding: "2rem 1rem",
                    textAlign: "center",
                    border: "1.5px dashed var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--color-text-faint)",
                    fontSize: "0.8125rem"
                  }}
                >
                  لا توجد طلبات تم إجراؤها باستخدام هذا الكوبون بعد.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "250px", overflowY: "auto", paddingInlineEnd: "4px" }}>
                  {selectedPromo.stats.orders.map((order) => (
                    <div
                      key={order.id}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface-2)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <p style={{ fontSize: "0.8125rem", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
                          {order.customer_name}
                        </p>
                        <p style={{ fontSize: "0.6875rem", color: "var(--color-text-faint)", margin: 0, marginTop: "2px" }}>
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <p style={{ fontSize: "0.8125rem", fontWeight: 800, color: "var(--color-primary)", margin: 0 }}>
                          {order.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {storeCurrency}
                        </p>
                        <p style={{ fontSize: "0.6875rem", color: "var(--color-danger)", fontWeight: 700, margin: 0, marginTop: "1px" }}>
                          الخصم: - {order.discount_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {storeCurrency}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: "flex", marginTop: "0.5rem" }}>
              <button
                onClick={() => setIsAnalyticsOpen(false)}
                className="btn-ghost"
                style={{ width: "100%", padding: "0.75rem", borderColor: "var(--color-border)" }}
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared Styles
// ---------------------------------------------------------------------------

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8125rem",
  fontWeight: 700,
  color: "var(--color-text-muted)",
  marginBottom: "0.375rem"
};

const errorStyle: React.CSSProperties = {
  color: "var(--color-danger)",
  fontSize: "0.75rem",
  marginTop: "0.375rem",
  fontWeight: 600
};
