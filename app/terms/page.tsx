import Link from "next/link";

export const metadata = {
  title: "شروط الخدمة — دكاني ⚡",
  description: "شروط وأحكام استخدام منصة دكاني لتنظيم التجارة المحلية عبر واتساب.",
};

export default function TermsPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--color-bg)",
        fontFamily: "var(--font-cairo), sans-serif",
        color: "var(--color-text)",
        direction: "rtl",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2.5rem 1.25rem",
      }}
    >
      {/* Decorative Blur Backgrounds */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "5%",
          width: "250px",
          height: "250px",
          borderRadius: "50%",
          background: "var(--color-primary-glow)",
          filter: "blur(90px)",
          opacity: 0.15,
          zIndex: 0,
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "2rem",
          boxShadow: "var(--shadow-lg)",
          zIndex: 10,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem", borderBottom: "1px solid var(--color-border)", paddingBottom: "1.5rem" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              textDecoration: "none",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
              }}
            >
              🏪
            </div>
            <span
              style={{
                fontWeight: 900,
                fontSize: "1.375rem",
                color: "var(--color-text)",
              }}
            >
              دكاني <span style={{ color: "var(--color-primary)" }}>⚡</span>
            </span>
          </Link>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text)", margin: 0 }}>
            شروط وأحكام الخدمة 📜
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.5rem" }}>
            تاريخ التحديث: مايو 2026
          </p>
        </div>

        {/* Content Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", fontSize: "0.875rem", lineHeight: 1.7, color: "var(--color-text-muted)" }}>
          
          <section>
            <h2 style={{ fontSize: "1.0625rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.5rem" }}>
              1. مقدمة وقبول الشروط 🤝
            </h2>
            <p>
              مرحباً بك في منصة <strong>دكاني (Dukkanni)</strong>. بتسجيلك حساباً أو استخدامك للمنصة، فإنك توافق التزاماً كاملاً بهذه الشروط والأحكام. إذا كنت لا توافق على أي بند منها، يرجى عدم التسجيل أو استخدام المنصة.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.0625rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.5rem" }}>
              2. طبيعة الخدمة والعمولات 0% 🏪
            </h2>
            <p>
              دكاني هي منصة تقنية برمجية (SaaS) تتيح للتجار إنشاء كتالوجات وعرض منتجاتهم واستقبال طلبات الشراء من زبائنهم عبر تطبيق واتساب. 
              نحن <strong>لا نتقاضى أي عمولة 0%</strong> على مبيعاتك، ولا نتدخل في عمليات الدفع أو الشحن بين التاجر والمشتري. جميع الأرباح تعود إليك بالكامل.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.0625rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.5rem" }}>
              3. حساب التاجر والتسجيل 👤
            </h2>
            <p>
              عند إنشاء حسابك، يجب تزويدنا بمعلومات صحيحة ودقيقة (الاسم الكامل، رقم الهاتف النشط، والبريد الإلكتروني). أنت المسؤول الوحيد عن الحفاظ على سرية بيانات اعتماد حسابك، وعن جميع الأنشطة التي تتم تحت حسابك.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.0625rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.5rem" }}>
              4. نظام الاشتراكات والفوترة والدفع 💳
            </h2>
            <p>
              - تقدم المنصة فترة تجريبية مجانية مدتها <strong>7 أيام</strong> لجميع المتاجر الجديدة للاستفادة الكاملة من ميزات النظام.
              <br />
              - بعد انتهاء الفترة التجريبية، يتوجب تفعيل اشتراك مدفوع (شهري بـ 5$ أو سنوي بـ 50$) لتجنب تعليق المتجر أو إيقاف استقبال الطلبات.
              <br />
              - يتم الدفع والتفعيل يدوياً بالتنسيق مع الدعم المالي عبر واتساب، وعند تأكيد الدفع يتم تنشيط الحساب فوراً من قبل المسؤول. جميع المدفوعات غير قابلة للاسترداد.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.0625rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.5rem" }}>
              5. المحتوى وسياسة الاستخدام المقبول ⚠️
            </h2>
            <p>
              أنت المسؤول القانوني والشرعي بالكامل عن المنتجات والأسعار والبيانات التي ترفعها على متجرك. يحظر تماماً عرض أو بيع أي منتجات غير قانونية، أو مسروقة، أو تنتهك حقوق الملكية الفكرية للآخرين، أو تروج لعمليات النصب والاحتيال.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.0625rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.5rem" }}>
              6. تعليق الحساب وإنهاء الخدمة 🔴
            </h2>
            <p>
              نحتفظ بالحق في تعليق أو حظر أي حساب متجر فوراً ودون إنذار مسبق في حال مخالفة شروط الاستخدام المقبول، أو الإبلاغ عن عمليات نصب، أو استغلال المنصة بشكل يضر بنزاهتها أو سرعة خوادمها.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.0625rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.5rem" }}>
              7. إخلاء المسؤولية 💡
            </h2>
            <p>
              تُقدم المنصة "كما هي" دون أي ضمانات صريحة أو ضمنية بخصوص انقطاع الخدمة المؤقت أو خسارة البيانات الناتجة عن خوادم الاستضافة. نحن نسعى لتقديم أعلى مستويات الاستقرار والسرعة، لكننا لا نتحمل مسؤولية أي أضرار تجارية مباشرة أو غير مباشرة.
            </p>
          </section>
        </div>

        {/* Back Button */}
        <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--color-border)", textAlign: "center" }}>
          <Link
            href="/register"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--color-primary)",
              color: "#ffffff",
              padding: "0.75rem 2rem",
              borderRadius: "var(--radius-full)",
              fontSize: "0.875rem",
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 4px 12px var(--color-primary-glow)",
              transition: "transform 0.15s",
            }}
          >
            العودة لصفحة التسجيل ←
          </Link>
        </div>
      </div>
    </div>
  );
}
