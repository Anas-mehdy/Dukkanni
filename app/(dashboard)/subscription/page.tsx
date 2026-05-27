import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: store } = await supabase
    .from("stores")
    .select("name, slug, plan_type, subscription_status, trial_ends_at, subscription_ends_at")
    .eq("owner_id", user.id)
    .single();

  if (!store) redirect("/dashboard/onboarding");

  const isTrial = store.plan_type === "trial";
  const endDate = isTrial
    ? new Date(store.trial_ends_at)
    : store.subscription_ends_at
    ? new Date(store.subscription_ends_at)
    : null;

  let daysRemaining = 0;
  if (endDate) {
    const diffTime = endDate.getTime() - new Date().getTime();
    daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  const intentText = isTrial ? "أريد الترقية للباقة المدفوعة" : "أريد تجديد اشتراكي الحالي";
  const messageText = `مرحباً، أنا صاحب متجر ${store.name} (${store.slug})، ${intentText} في منصة دكاني ⚡`;
  const waUrl = `https://wa.me/905350215375?text=${encodeURIComponent(messageText)}`;

  const PLAN_LABELS = {
    trial: "الفترة التجريبية المجانية",
    monthly: "باقة النمو السريع (الشهرية)",
    yearly: "باقة التاجر الجاد (السنوية)",
  };

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
    <div style={{ maxWidth: "600px", margin: "0 auto", paddingBottom: "1.5rem" }}>
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
            <span style={{ fontSize: "1rem", fontWeight: 800, color: isTrial ? "var(--color-warning)" : "var(--color-primary)" }}>
              {PLAN_LABELS[store.plan_type as keyof typeof PLAN_LABELS] ?? store.plan_type}
            </span>
          </div>

          {/* Status */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "1rem" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", fontWeight: 600 }}>حالة الاشتراك:</span>
            <span style={{ fontSize: "0.9375rem", fontWeight: 800, color: statusColor }}>
              {STATUS_LABELS[store.subscription_status as keyof typeof STATUS_LABELS] ?? store.subscription_status}
            </span>
          </div>

          {/* Expiry Date */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "1rem" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", fontWeight: 600 }}>تاريخ الانتهاء:</span>
            <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--color-text)" }} dir="ltr">
              {endDate ? `${endDate.getDate()}/${endDate.getMonth() + 1}/${endDate.getFullYear()}` : "غير محدد"}
            </span>
          </div>

          {/* Remaining Days Counter */}
          <div
            style={{
              background: isTrial ? "var(--color-warning-muted)" : "var(--color-primary-muted)",
              border: `1px solid ${isTrial ? "rgba(245,158,11,0.2)" : "var(--color-primary-glow)"}`,
              borderRadius: "var(--radius-md)",
              padding: "1rem",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.25rem", fontWeight: 600 }}>
              الوقت المتبقي لمتجرك:
            </p>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 900, color: isTrial ? "var(--color-warning)" : "var(--color-primary)" }}>
              {daysRemaining} أيام متبقية
            </h3>
          </div>
        </div>

        {/* Dynamic CTA Button */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            width: "100%",
            padding: "0.875rem",
            marginTop: "1.5rem",
            background: "#25D366",
            color: "#fff",
            borderRadius: "var(--radius-full)",
            fontFamily: "var(--font-cairo), sans-serif",
            fontWeight: 800,
            fontSize: "0.9375rem",
            textDecoration: "none",
            boxShadow: "0 4px 12px rgba(37,211,102,0.3)",
            textAlign: "center",
            transition: "all 0.15s",
          }}
        >
          💬 {isTrial ? "الترقية للباقة المدفوعة" : "تجديد الاشتراك الحالي"}
        </a>
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
          1. الباقة الشهرية (النمو السريع): <strong style={{ color: "var(--color-text)" }}>5$ شهرياً</strong>. تمنحك منتجات غير محدودة وتحديثات فورية مع رنين الإشعارات الحية وتصدير البيانات.
          <br />
          2. الباقة السنوية (التاجر الجاد): <strong style={{ color: "var(--color-text)" }}>50$ سنوياً</strong>. تمنحك خصماً فورياً يبلغ 17% مع أولوية قصوى للميزات والدعم الفني.
          <br />
          3. لتفعيل الاشتراك، اضغط على زر التواصل أعلاه لتصل إلى الدعم المالي عبر الواتساب لتأكيد الدفع يدوياً وتنشيط حسابك فوراً.
        </p>
      </div>
    </div>
  );
}
