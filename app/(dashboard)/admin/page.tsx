"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Store {
  id: string;
  name: string;
  slug: string;
  whatsapp_e164: string;
  plan_type: "trial" | "monthly" | "yearly";
  plan_tier: "free" | "starter" | "pro";
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

  // Total platform analytics
  const [totalViews, setTotalViews] = useState<number>(0);
  const [totalClicks, setTotalClicks] = useState<number>(0);

  // Funnel Analytics statistics
  const [funnelStats, setFunnelStats] = useState({
    register_viewed: 0,
    step1_started: 0,
    step1_completed: 0,
    step2_started: 0,
    register_success: 0
  });

  // Fetch all stores and KPIs
  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/subscriptions");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "خطأ غير متوقع");
      }
      setStores(data.data.stores || []);
      setTotalViews(data.data.totalViews ?? 0);
      setTotalClicks(data.data.totalClicks ?? 0);
      if (data.data.funnelStats) {
        setFunnelStats(data.data.funnelStats);
      }
    } catch (e: any) {
      setError(e.message || "فشل تحميل لوحة تحكم المسؤول");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (
    storeId: string,
    action: "monthly" | "yearly" | "suspend" | "activate" | "set_plan_tier",
    planTier?: "free" | "starter" | "pro"
  ) => {
    if (submittingId) return;
    const submissionKey = planTier ? `${storeId}-${action}-${planTier}` : `${storeId}-${action}`;
    setSubmittingId(submissionKey);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, action, planTier }),
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

  const freeTierCount = stores.filter((s) => s.plan_tier === "free").length;
  const starterTierCount = stores.filter((s) => s.plan_tier === "starter").length;
  const proTierCount = stores.filter((s) => s.plan_tier === "pro").length;

  const activeStarter = stores.filter(
    (s) => s.plan_tier === "starter" && s.subscription_status === "active"
  ).length;

  const activePro = stores.filter(
    (s) => s.plan_tier === "pro" && s.subscription_status === "active"
  ).length;

  // Monthly Revenue projection based on plan tiers: Starter is $5/mo, Pro is $15/mo
  const projectedRevenue = activeStarter * 5 + activePro * 15;

  const PLAN_LABELS = {
    trial: "تجريبي ⏳",
    monthly: "شهري 🟢",
    yearly: "سنوي 🔵",
  };

  const PLAN_TIER_LABELS = {
    free: "المجانية 🆓",
    starter: "البداية ⚡",
    pro: "الاحترافية 🚀",
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
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--color-text)", marginBottom: "0.25rem" }}>
            لوحة تحكم المسؤول الخارق ⚡
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            إدارة الاشتراكات والفوترة للتاجر وتنشيط الباقات يدوياً
          </p>
        </div>

        {/* WhatsApp Support CTA Button */}
        <a
          href="https://wa.me/905350215375?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D9%81%D9%8A%20%D8%A5%D8%B9%D8%AF%D8%A7%D8%AF%20%D9%85%D8%AA%D8%AC%D8%B1%D9%8A%20%D8%B9%D9%84%D9%89%20Dukkanni"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.625rem",
            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
            color: "#fff",
            fontWeight: 800,
            fontSize: "0.875rem",
            padding: "0.75rem 1.25rem",
            borderRadius: "var(--radius-lg)",
            textDecoration: "none",
            boxShadow: "0 4px 18px rgba(37, 211, 102, 0.35)",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
            whiteSpace: "nowrap",
            direction: "rtl",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 28px rgba(37, 211, 102, 0.5)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 18px rgba(37, 211, 102, 0.35)";
          }}
        >
          {/* WhatsApp SVG Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ width: "1.125rem", height: "1.125rem", flexShrink: 0 }}
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          هل تحتاج مساعدة في إعداد متجرك؟ تواصل معنا
        </a>
      </div>


      {/* Section 1: KPI Platform Metrics */}
      <div style={kpiGridStyle}>
        <div style={kpiCardStyle}>
          <span style={kpiTitleStyle}>إجمالي المتاجر 🏪</span>
          <span style={kpiValueStyle}>{totalMerchants}</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiTitleStyle}>الباقة المجانية 🆓</span>
          <span style={kpiValueStyle}>{freeTierCount}</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiTitleStyle}>باقة البداية ($5) ⚡</span>
          <span style={kpiValueStyle}>{starterTierCount}</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiTitleStyle}>الباقة الاحترافية ($15) 🚀</span>
          <span style={kpiValueStyle}>{proTierCount}</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiTitleStyle}>إجمالي زوار المنصة 👁️</span>
          <span style={kpiValueStyle}>{totalViews.toLocaleString()}</span>
        </div>
        <div style={kpiCardStyle}>
          <span style={kpiTitleStyle}>إجمالي نقرات الطلب 📈</span>
          <span style={kpiValueStyle}>{totalClicks.toLocaleString()}</span>
        </div>
        <div style={{ ...kpiCardStyle, background: "var(--color-primary-muted)", border: "1.5px solid var(--color-primary)" }}>
          <span style={{ ...kpiTitleStyle, color: "var(--color-primary)" }}>الإيرادات الشهرية المتوقعة 💰</span>
          <span style={{ ...kpiValueStyle, color: "var(--color-primary)" }}>
            ${projectedRevenue.toFixed(2)}
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, marginRight: "0.25rem" }}>/ شهرياً</span>
          </span>
        </div>
      </div>

      {/* Registration Funnel Analytics Section */}
      {(() => {
        const fViews = funnelStats.register_viewed;
        const fStep1Start = funnelStats.step1_started;
        const fStep1End = funnelStats.step1_completed;
        const fStep2Start = funnelStats.step2_started;
        const fSuccess = funnelStats.register_success;

        const getPct = (val: number) => {
          if (fViews === 0) return 0;
          return Math.round((val / fViews) * 100);
        };

        const getConvFromPrev = (current: number, prev: number) => {
          if (prev === 0) return 100;
          return Math.round((current / prev) * 100);
        };

        return (
          <div
            style={{
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: "1.5rem",
              marginTop: "2.5rem",
            }}
          >
            <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 900, color: "var(--color-text)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                📊 قمع التسجيل ونسب تحويل التجار الجدد
              </h2>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                تتبع سلوك الزوار خطوة بخطوة وتحديد أماكن خروج المستخدمين قبل إنهاء التسجيل
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {[
                {
                  title: "1. زيارة صفحة التسجيل (Viewed Page)",
                  count: fViews,
                  overallPct: 100,
                  prevPct: 100,
                  emoji: "👁️",
                  desc: "المستخدمون الذين زاروا صفحة التسجيل لأول مرة"
                },
                {
                  title: "2. البدء بإدخال بيانات الحساب (Started Step 1)",
                  count: fStep1Start,
                  overallPct: getPct(fStep1Start),
                  prevPct: getConvFromPrev(fStep1Start, fViews),
                  emoji: "✍️",
                  desc: "بدء كتابة رقم الواتساب أو كلمة المرور"
                },
                {
                  title: "3. إكمال الخطوة الأولى (Step 1 Completed)",
                  count: fStep1End,
                  overallPct: getPct(fStep1End),
                  prevPct: getConvFromPrev(fStep1End, fStep1Start),
                  emoji: "✅",
                  desc: "إدخال بيانات صحيحة والضغط على زر الانتقال"
                },
                {
                  title: "4. البدء بتفاصيل المتجر والرابط (Started Step 2)",
                  count: fStep2Start,
                  overallPct: getPct(fStep2Start),
                  prevPct: getConvFromPrev(fStep2Start, fStep1End),
                  emoji: "🏪",
                  desc: "بدء كتابة الاسم الكامل، اسم المتجر، البريد أو الرابط"
                },
                {
                  title: "5. إنشاء المتجر بنجاح (Registration Success 🎉)",
                  count: fSuccess,
                  overallPct: getPct(fSuccess),
                  prevPct: getConvFromPrev(fSuccess, fStep2Start),
                  emoji: "🚀",
                  desc: "إعداد المتجر بالكامل والتحويل للوحة التحكم الرئيسية"
                }
              ].map((item, idx) => {
                const isFirst = idx === 0;
                const dropOff = isFirst ? 0 : 100 - item.prevPct;

                return (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    
                    {/* Header detail */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <span style={{ fontSize: "0.875rem", fontWeight: 800, color: "var(--color-text)" }}>
                          {item.emoji} {item.title}
                        </span>
                        <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                          {item.desc}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.8125rem" }}>
                        <span style={{ fontWeight: 800, color: "var(--color-text)" }}>
                          {item.count} {item.count === 1 ? "جلسة" : "جلسات"}
                        </span>
                        <span style={{ color: "#10B981", fontWeight: 800, background: "var(--color-success-muted)", padding: "0.125rem 0.375rem", borderRadius: "var(--radius-sm)" }}>
                          {item.overallPct}% من الإجمالي
                        </span>
                        {!isFirst && (
                          <span style={{ color: dropOff > 30 ? "var(--color-danger)" : "var(--color-warning)", fontWeight: 700 }}>
                            🚪 انسحاب: {dropOff}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ width: "100%", height: "10px", background: "var(--color-surface-3)", borderRadius: "var(--radius-full)", overflow: "hidden", position: "relative" }}>
                      <div
                        style={{
                          width: `${item.overallPct}%`,
                          height: "100%",
                          background: isFirst ? "#3b82f6" : item.overallPct > 40 ? "#10B981" : "var(--color-warning)",
                          borderRadius: "var(--radius-full)",
                          transition: "width 0.6s ease-out",
                          boxShadow: item.overallPct > 0 ? "0 0 6px rgba(16, 185, 129, 0.2)" : "none",
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Bottom overview KPI */}
              <div
                style={{
                  marginTop: "1.5rem",
                  padding: "1rem",
                  background: "var(--color-surface-2)",
                  border: "1px dashed var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem"
                }}
              >
                <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", fontWeight: 700 }}>
                  💡 معدل التحويل الكلي للمنصة (Conversion Rate):
                </span>
                <span style={{ fontSize: "1.125rem", fontWeight: 900, color: fSuccess > 0 ? "#10B981" : "var(--color-text)" }}>
                  {getPct(fSuccess)}% 
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginRight: "0.375rem" }}>
                    (من الزوار إلى تجار مسجلين)
                  </span>
                </span>
              </div>

            </div>
          </div>
        );
      })()}

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
                <th style={thStyle}>فئة الباقة</th>
                <th style={thStyle}>نوع الاشتراك</th>
                <th style={thStyle}>حالة الاشتراك</th>
                <th style={thStyle}>تاريخ الانتهاء</th>
                <th style={{ ...thStyle, textAlign: "center" }}>الإجراءات الإدارية</th>
              </tr>
            </thead>
            <tbody>
              {stores.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "2rem", textCombineUpright: "center", color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
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
                      {/* Plan Tier Column */}
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            padding: "0.25rem 0.5rem",
                            borderRadius: "var(--radius-sm)",
                            background:
                              s.plan_tier === "free"
                                ? "rgba(107, 114, 128, 0.1)"
                                : s.plan_tier === "starter"
                                ? "var(--color-primary-muted)"
                                : "rgba(16, 185, 129, 0.1)",
                            color:
                              s.plan_tier === "free"
                                ? "#6B7280"
                                : s.plan_tier === "starter"
                                ? "var(--color-primary)"
                                : "#10B981",
                          }}
                        >
                          {PLAN_TIER_LABELS[s.plan_tier] || s.plan_tier}
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
                        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
                          
                          {/* Plan Tier Selector */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: "120px" }}>
                            <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--color-text-muted)" }}>باقة الاشتراك:</span>
                            <select
                              value={s.plan_tier}
                              onChange={(e) => handleAction(s.id, "set_plan_tier", e.target.value as any)}
                              disabled={!!submittingId}
                              style={{
                                padding: "0.375rem 0.5rem",
                                borderRadius: "var(--radius-sm)",
                                fontSize: "0.75rem",
                                fontWeight: 800,
                                background: "var(--color-surface)",
                                color: "var(--color-text)",
                                border: "1px solid var(--color-border)",
                                fontFamily: "var(--font-cairo), sans-serif",
                                cursor: "pointer",
                                outline: "none",
                              }}
                            >
                              <option value="free">المجانية (Free)</option>
                              <option value="starter">البداية (Starter)</option>
                              <option value="pro">الاحترافية (Pro)</option>
                            </select>
                          </div>

                          {/* Status & Subscription Control Buttons */}
                          <div style={{ display: "flex", gap: "0.375rem", alignItems: "flex-end" }}>
                            
                            {/* Activate / Suspend Toggle */}
                            {s.subscription_status === "suspended" ? (
                              <button
                                onClick={() => handleAction(s.id, "activate")}
                                disabled={!!submittingId}
                                style={{
                                  ...actionBtnStyle,
                                  background: "var(--color-success-muted)",
                                  color: "var(--color-success)",
                                  border: "1px solid var(--color-success-glow)",
                                }}
                              >
                                {submittingId === `${s.id}-activate` ? "⏳..." : "تنشيط 🟢"}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAction(s.id, "suspend")}
                                disabled={!!submittingId}
                                style={{
                                  ...actionBtnStyle,
                                  background: "rgba(239, 68, 68, 0.1)",
                                  color: "var(--color-danger)",
                                  border: "1px solid rgba(239, 68, 68, 0.2)",
                                }}
                              >
                                {submittingId === `${s.id}-suspend` ? "⏳..." : "تعليق ⚠️"}
                              </button>
                            )}

                            {/* Monthly extension */}
                            <button
                              onClick={() => handleAction(s.id, "monthly")}
                              disabled={!!submittingId}
                              title="تفعيل وتمديد الاشتراك لـ 30 يوم"
                              style={{
                                ...actionBtnStyle,
                                background: "var(--color-primary-muted)",
                                color: "var(--color-primary)",
                                border: "1px solid var(--color-primary-glow)",
                              }}
                            >
                              {submittingId === `${s.id}-monthly` ? "⏳" : "+30 يوم 📅"}
                            </button>

                            {/* Yearly extension */}
                            <button
                              onClick={() => handleAction(s.id, "yearly")}
                              disabled={!!submittingId}
                              title="تفعيل وتمديد الاشتراك لـ سنة كاملة"
                              style={{
                                ...actionBtnStyle,
                                background: "rgba(59, 130, 246, 0.1)",
                                color: "#3b82f6",
                                border: "1px solid rgba(59, 130, 246, 0.2)",
                              }}
                            >
                              {submittingId === `${s.id}-yearly` ? "⏳" : "+سنة 🗓️"}
                            </button>

                          </div>

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
