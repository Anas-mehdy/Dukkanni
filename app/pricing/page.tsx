import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { locales } from "@/lib/locales";

export const metadata = {
  title: "باقات وأسعار منصة دكاني 💰",
  description: "اختر الباقة المناسبة لمتجرك وابدأ في استقبال الطلبات مباشرة على واتساب.",
};

export default async function PricingPage() {
  const supabase = await createClient();
  let store: { name: string; slug: string } | null = null;
  let isLoggedIn = false;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      isLoggedIn = true;
      const { data } = await supabase
        .from("stores")
        .select("name, slug")
        .eq("owner_id", user.id)
        .single();
      store = data;
    }
  } catch {
    // Standard anonymous fallback
  }

  // Pre-filled WhatsApp URLs for upgrading
  const buildWaUrl = (planName: string) => {
    const targetPhone = "905350215375";
    const text = store
      ? `مرحباً، أنا صاحب متجر ${store.name} (${store.slug})، أريد الترقية إلى باقة ${planName} ⚡`
      : `مرحباً، أريد الاشتراك والترقية إلى باقة ${planName} في منصة دكاني ⚡`;
    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
  };

  const starterUpgradeUrl = buildWaUrl("Starter (البداية)");
  const proUpgradeUrl = buildWaUrl("Pro (الاحترافية)");

  return (
    <div
      style={{
        background: "radial-gradient(circle at top, #14141e 0%, #0f0f14 100%)",
        color: "var(--color-text)",
        minHeight: "100vh",
        fontFamily: "var(--font-cairo), sans-serif",
        direction: "rtl",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header navbar */}
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <img src="/logo.png" alt="دكاني" style={{ height: "36px", width: "auto" }} />
          <span style={{ fontWeight: 800, fontSize: "1.25rem", color: "#fff" }}>دكاني</span>
        </Link>
        <div style={{ display: "flex", gap: "1rem" }}>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="btn-primary"
              style={{
                textDecoration: "none",
                fontSize: "0.875rem",
                padding: "0.5rem 1.25rem",
                minHeight: "38px",
              }}
            >
              لوحة التحكم ←
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                style={{
                  color: "var(--color-text-muted)",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  paddingInline: "0.5rem",
                }}
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                className="btn-primary"
                style={{
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  padding: "0.5rem 1.25rem",
                  minHeight: "38px",
                }}
              >
                ابدأ متجرك مجاناً
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Pricing Grid */}
      <main style={{ flex: 1, padding: "3rem 1rem", maxWidth: "1100px", margin: "0 auto", width: "100%" }}>
        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              color: "var(--color-primary)",
              padding: "4px 12px",
              borderRadius: "var(--radius-full)",
              fontSize: "0.75rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            خطط ميسّرة وشفافة
          </span>
          <h1
            style={{
              fontSize: "2.25rem",
              fontWeight: 900,
              color: "#fff",
              marginTop: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            اختر الباقة المناسبة لمتجرك 🏪
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", maxWidth: "600px", margin: "0 auto" }}>
            باقات مرنة تناسب بائعي التجزئة وصغار التجار دون عمولات خفية أو عقود طويلة الأمد.
          </p>

          {/* Marketing Note */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.03))",
              border: "1.5px dashed var(--color-primary)",
              padding: "0.75rem 1.25rem",
              borderRadius: "var(--radius-md)",
              display: "inline-block",
              marginTop: "1.5rem",
              fontSize: "0.875rem",
              fontWeight: 750,
              color: "var(--color-primary)",
              boxShadow: "0 4px 15px rgba(16, 185, 129, 0.1)",
            }}
          >
            🎉 عرض خاص للإطلاق: الباقة المجانية متاحة لأول 100 متجر فقط!
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "2rem",
            alignItems: "stretch",
            marginBottom: "4rem",
          }}
        >
          {/* FREE PLAN CARD */}
          <div
            style={{
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: "2.25rem 2rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              transition: "transform 0.2s ease",
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
                الباقة المجانية (Free)
              </h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "2.25rem", fontWeight: 900, color: "#fff" }}>0$</span>
                <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>/ دائماً</span>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
                مثالية للتجربة وبدء النشاط التجاري الصغير جداً.
              </p>

              <hr style={{ border: 0, borderTop: "1px solid var(--color-border)", marginBottom: "1.5rem" }} />

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem" }}>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>🟢 <strong>15</strong> منتج كحد أقصى</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>🟢 <strong>3</strong> فئات للمنتجات</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>🟢 <strong>صورة أو صورتين</strong> للمنتج الواحد</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>🟢 <strong>100</strong> طلب شهرياً</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>🔴 علامة "دكاني" في أسفل المتجر</li>
              </ul>
            </div>

            <Link
              href={isLoggedIn ? "/dashboard" : "/register"}
              className="btn-ghost"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                padding: "0.875rem",
                marginTop: "2rem",
                fontWeight: 800,
                fontSize: "0.9375rem",
                borderColor: "var(--color-border)",
                color: "var(--color-text)",
              }}
            >
              {isLoggedIn ? "لوحة التحكم الحالية" : "ابدأ متجرك مجاناً"}
            </Link>
          </div>

          {/* STARTER PLAN CARD */}
          <div
            style={{
              background: "var(--color-surface)",
              border: "2px solid var(--color-primary)",
              borderRadius: "var(--radius-lg)",
              padding: "2.25rem 2rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 15px 35px var(--color-primary-glow)",
              position: "relative",
              transform: "scale(1.02)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "var(--color-primary)",
                color: "#fff",
                fontSize: "0.75rem",
                fontWeight: 900,
                padding: "4px 16px",
                borderRadius: "var(--radius-full)",
                boxShadow: "0 2px 10px rgba(16, 185, 129, 0.4)",
              }}
            >
              الأكثر شعبية 🔥
            </div>

            <div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--color-primary)", marginBottom: "0.5rem" }}>
                باقة البداية (Starter)
              </h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "2.25rem", fontWeight: 900, color: "#fff" }}>5$</span>
                <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>/ شهرياً</span>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
                الخيار الأفضل للمتاجر النامية والمشاريع المنزلية المزدحمة.
              </p>

              <hr style={{ border: 0, borderTop: "1px solid var(--color-border)", marginBottom: "1.5rem" }} />

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem" }}>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>🟢 <strong>100</strong> منتج كحد أقصى</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>🟢 <strong>15</strong> فئة للمنتجات</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>🟢 حتى <strong>4 صور</strong> للمنتج الواحد</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>🟢 <strong>500</strong> طلب شهرياً</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>🔴 علامة "دكاني" في أسفل المتجر</li>
              </ul>
            </div>

            <a
              href={starterUpgradeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                padding: "0.875rem",
                marginTop: "2rem",
                fontWeight: 800,
                fontSize: "0.9375rem",
              }}
            >
              اشترك في الباقة الآن 💬
            </a>
          </div>

          {/* PRO PLAN CARD */}
          <div
            style={{
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: "2.25rem 2rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#a855f7", marginBottom: "0.5rem" }}>
                الباقة الاحترافية (Pro)
              </h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "2.25rem", fontWeight: 900, color: "#fff" }}>15$</span>
                <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>/ شهرياً</span>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
                للتجار الجادين والشركات التي تبحث عن هوية علامة تجارية خاصة.
              </p>

              <hr style={{ border: 0, borderTop: "1px solid var(--color-border)", marginBottom: "1.5rem" }} />

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem" }}>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>🟢 منتجات <strong>غير محدودة</strong> 📦</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>🟢 فئات <strong>غير محدودة</strong></li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>🟢 صور منتجات <strong>غير محدودة</strong></li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>🟢 طلبات <strong>غير محدودة</strong> 📈</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}>🟢 <strong>إزالة شعار دكاني</strong> بالكامل 🎨</li>
              </ul>
            </div>

            <a
              href={proUpgradeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                padding: "0.875rem",
                marginTop: "2rem",
                fontWeight: 800,
                fontSize: "0.9375rem",
                background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
                borderColor: "#a855f7",
                boxShadow: "0 4px 15px rgba(124, 58, 237, 0.3)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              اشترك في الباقة الآن 💬
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "2rem",
          textAlign: "center",
          fontSize: "0.8125rem",
          color: "var(--color-text-faint)",
          background: "#0a0a0f",
        }}
      >
        <p>© 2026 دكاني. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
