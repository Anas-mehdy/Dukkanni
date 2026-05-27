import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ExpiredPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get merchant store details
  const { data: store } = await supabase
    .from("stores")
    .select("name, slug")
    .eq("owner_id", user.id)
    .single();

  if (!store) redirect("/dashboard/onboarding");

  const messageText = `مرحباً، أنا صاحب متجر ${store.name} (${store.slug})، انتهت الفترة التجريبية وأريد تفعيل الاشتراك المدفوع في منصة دكاني ⚡`;
  const encodedMessage = encodeURIComponent(messageText);
  const waUrl = `https://wa.me/905350215375?text=${encodedMessage}`;

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
        background: "var(--color-bg)",
        fontFamily: "var(--font-cairo), sans-serif",
        direction: "rtl",
        position: "relative",
      }}
    >
      {/* Blurred decorative glowing background */}
      <div
        style={{
          position: "absolute",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "var(--color-danger-muted)",
          filter: "blur(80px)",
          opacity: 0.4,
          zIndex: 0,
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(23, 23, 31, 0.55)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1.5px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "2.5rem 1.5rem",
          textAlign: "center",
          boxShadow: "var(--shadow-lg)",
          zIndex: 10,
        }}
      >
        {/* Warning Icon with Pulse */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              background: "var(--color-danger-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              border: "2px solid var(--color-danger)",
              animation: "warning-pulse 2s infinite ease-in-out",
            }}
          >
            ⏳
          </div>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "1.375rem",
            fontWeight: 800,
            color: "var(--color-text)",
            marginBottom: "0.75rem",
          }}
        >
          انتهت الفترة التجريبية لمتجرك
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
            lineHeight: 1.6,
            marginBottom: "2rem",
          }}
        >
          أهلاً بك يا تاجرنا العزيز. لقد انتهت فترة الـ 7 أيام التجريبية المجانية الممنوحة لمتجر{" "}
          <strong style={{ color: "var(--color-text)" }}>{store.name}</strong>. لتتمكن من فتح المتجر واستقبال طلبات زبائنك مجدداً، يرجى تفعيل الاشتراك المدفوع بـ 5$ شهرياً أو 50$ سنوياً.
        </p>

        {/* Action Button: WhatsApp Subscription */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.625rem",
            width: "100%",
            padding: "1rem",
            background: "#25D366",
            color: "#fff",
            borderRadius: "var(--radius-full)",
            fontFamily: "var(--font-cairo), sans-serif",
            fontWeight: 800,
            fontSize: "1.0625rem",
            textDecoration: "none",
            boxShadow: "0 4px 16px rgba(37,211,102,0.4)",
            transition: "all 0.2s",
            marginBottom: "1.25rem",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          تواصل لتفعيل الاشتراك ⚡
        </a>

        {/* Secondary Action: Logout */}
        <a
          href="/api/auth/logout"
          style={{
            fontSize: "0.8125rem",
            color: "var(--color-text-faint)",
            textDecoration: "underline",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          تسجيل الخروج من الحساب
        </a>
      </div>

      {/* Embedded Warning animation */}
      <style>{`
        @keyframes warning-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}
