import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/lib/plans";

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: store, error } = await supabase
    .from("stores")
    .select("name, slug, plan_type, subscription_status, trial_ends_at, subscription_ends_at, plan_tier")
    .eq("owner_id", user.id)
    .single();

  if (error || !store) redirect("/dashboard/onboarding");

  const planTier = store.plan_tier || "free";
  const currentPlan = PLAN_LIMITS[planTier as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;

  // Intent text for WhatsApp upgrade
  const intentText = planTier === "free" 
    ? "أريد الترقية إلى باقة البداية أو الاحترافية" 
    : `أريد تجديد/تعديل اشتراكي الحالي لباقة ${currentPlan.nameAr}`;
  const messageText = `مرحباً، أنا صاحب متجر ${store.name} (${store.slug})، ${intentText} في منصة دكاني ⚡`;
  const waUrl = `https://wa.me/905350215375?text=${encodeURIComponent(messageText)}`;

  const STATUS_LABELS = {
    active: "نشط 🟢",
    expired: "منتهي 🔴",
    suspended: "موقوف ⚠️",
  };

  const statusColor =
    store.subscription_status === "active"
      ? "var(--color-success)"
      : store.subscription_status === "expired"
      ? "var(--color-danger)"
      : "var(--color-warning)";

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", paddingBottom: "1.5rem", fontFamily: "var(--font-cairo), sans-serif", direction: "rtl" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.25rem" }}>
          تفاصيل اشتراكي 💳
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
          إدارة باقة الاشتراك والدفع والفوترة الخاصة بمتجرك
        </p>
      </div>

      {/* Main Billing Card */}
      <div
        className="card"
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Plan Name */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "1rem" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", fontWeight: 600 }}>الباقة الحالية:</span>
            <span style={{ fontSize: "1rem", fontWeight: 800, color: planTier === "free" ? "var(--color-text-muted)" : "var(--color-primary)" }}>
              {currentPlan.nameAr} ({currentPlan.name})
            </span>
          </div>

          {/* Status */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "1rem" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", fontWeight: 600 }}>حالة الاشتراك:</span>
            <span style={{ fontSize: "0.9375rem", fontWeight: 800, color: statusColor }}>
              {STATUS_LABELS[store.subscription_status as keyof typeof STATUS_LABELS] ?? store.subscription_status}
            </span>
          </div>

          {/* Expiry Date (relevant only for trials/ends) */}
          {store.subscription_ends_at && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "1rem" }}>
              <span style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", fontWeight: 600 }}>تاريخ الانتهاء:</span>
              <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--color-text)" }} dir="ltr">
                {new Date(store.subscription_ends_at).toLocaleDateString("ar-EG")}
              </span>
            </div>
          )}
        </div>

        {/* Dynamic CTA Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.5rem" }}>
          <Link
            href="/pricing"
            className="btn-primary"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: "0.875rem",
              fontWeight: 800,
              fontSize: "0.9375rem",
              textAlign: "center",
            }}
          >
            🚀 ترقية أو تغيير باقة الاشتراك
          </Link>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              width: "100%",
              padding: "0.875rem",
              background: "#25D366",
              color: "#fff",
              borderRadius: "var(--radius-full)",
              fontWeight: 800,
              fontSize: "0.9375rem",
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(37,211,102,0.3)",
              textAlign: "center",
              border: "none",
            }}
          >
            💬 تواصل مع الدعم الفني لتأكيد الدفع يدوياً
          </a>
        </div>
      </div>

      {/* Pricing Information Card */}
      <div
        className="card-2"
        style={{
          background: "var(--color-surface-2)",
          border: "1.5px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: "1.25rem",
        }}
      >
        <h4 style={{ fontSize: "0.875rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.5rem" }}>
          💡 الباقات المتاحة وطريقة الدفع:
        </h4>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
          1. <strong>الباقة المجانية (Free)</strong>: مجاناً للأبد مع 15 منتج، 3 فئات، و100 طلب/شهر.
          <br />
          2. <strong>باقة البداية (Starter)</strong>: <strong style={{ color: "var(--color-text)" }}>5$ شهرياً</strong> مع 100 منتج، 15 فئة، و500 طلب/شهر.
          <br />
          3. <strong>الباقة الاحترافية (Pro)</strong>: <strong style={{ color: "var(--color-text)" }}>15$ شهرياً</strong> لمنتجات وطلبات غير محدودة وإزالة شعار دكاني بالكامل.
          <br />
          4. لتفعيل الاشتراك، اضغط على زر الترقية أعلاه أو تواصل مع الدعم الفني عبر الواتساب لتأكيد الدفع يدوياً وتنشيط حسابك فوراً.
        </p>
      </div>
    </div>
  );
}
