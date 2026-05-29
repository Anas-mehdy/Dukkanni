"use client";

/**
 * app/(auth)/login/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Merchant Login Page
 *
 * - Email + Password login via Supabase
 * - Zod validation with Arabic error messages
 * - Redirects to ?redirectTo param (or /dashboard) on success
 * - Glassmorphic card design using global CSS tokens
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/browser";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "البريد الإلكتروني مطلوب")
    .email("البريد الإلكتروني غير صحيح"),
  password: z
    .string()
    .min(1, "كلمة المرور مطلوبة")
    .min(6, "كلمة المرور يجب أن تكون 6 خانات على الأقل"),
});

type LoginForm = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function LoginFormContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();

  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [errors,     setErrors]     = useState<Partial<LoginForm>>({});
  const [apiError,   setApiError]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Password recovery states
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    setErrors({});

    if (!email.trim()) {
      setErrors({ email: "البريد الإلكتروني مطلوب" });
      return;
    }
    if (!email.trim().includes("@")) {
      setErrors({ email: "البريد الإلكتروني غير صحيح" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        if (error.message.includes("Too many requests")) {
          setApiError("لقد أرسلنا طلباً بالفعل مؤخراً. يرجى الانتظار قليلاً والمحاولة مجدداً.");
        } else {
          setApiError(error.message);
        }
      } else {
        setForgotSuccess(true);
      }
    } catch {
      setApiError("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة لاحقاً.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    setErrors({});

    // ── Client-side validation ──────────────────────────────────────────────
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: Partial<LoginForm> = {};
      parsed.error.issues.forEach((i) => {
        const key = i.path[0] as keyof LoginForm;
        if (!fieldErrors[key]) fieldErrors[key] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);

    // ── Supabase sign in ────────────────────────────────────────────────────
    const { error } = await supabase.auth.signInWithPassword({
      email:    parsed.data.email,
      password: parsed.data.password,
    });

    setSubmitting(false);

    if (error) {
      // Map Supabase error codes to Arabic messages
      if (error.message.includes("Invalid login credentials")) {
        setApiError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      } else if (error.message.includes("Email not confirmed")) {
        setApiError("يرجى تأكيد بريدك الإلكتروني أولاً. تحقق من صندوق الوارد");
      } else if (error.message.includes("Too many requests")) {
        setApiError("محاولات كثيرة. يرجى الانتظار قليلاً والمحاولة مجدداً");
      } else {
        setApiError(error.message);
      }
      return;
    }

    // ── Success: redirect ────────────────────────────────────────────────────
    const redirectTo = searchParams.get("redirectTo");
    const destination = redirectTo?.startsWith("/") ? redirectTo : "/dashboard";
    router.push(destination);
    router.refresh(); // Ensure server components re-fetch with new session
  };

  if (mode === "forgot") {
    return (
      <div
        style={{
          background:   "var(--color-surface)",
          border:       "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding:      "2rem 1.5rem",
          boxShadow:    "var(--shadow-md), 0 0 40px var(--color-primary-glow)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 800, marginBottom: "0.25rem" }}>
            إعادة تعيين كلمة المرور 🔑
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
            أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين
          </p>
        </div>

        {/* API Error banner */}
        {apiError && (
          <div
            role="alert"
            style={{
              display:      "flex",
              alignItems:   "flex-start",
              gap:          "0.5rem",
              background:   "var(--color-danger-muted)",
              border:       "1.5px solid var(--color-danger)",
              borderRadius: "var(--radius-md)",
              padding:      "0.75rem 1rem",
              fontSize:     "0.875rem",
              color:        "var(--color-danger)",
              fontWeight:   600,
              marginBottom: "1.25rem",
              lineHeight:   1.4,
            }}
          >
            <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠</span>
            <span>{apiError}</span>
          </div>
        )}

        {/* Success message */}
        {forgotSuccess ? (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem 0" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "var(--color-success-muted)",
                border: "2px solid var(--color-success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.75rem",
                margin: "0 auto 0.5rem",
              }}
            >
              ✓
            </div>
            <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--color-text)" }}>
              تم إرسال رابط إعادة التعيين
            </p>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              لقد أرسلنا رابطاً خاصاً لإعادة تعيين كلمة المرور إلى البريد <strong style={{ color: "var(--color-text)" }}>{email}</strong>. يرجى مراجعة بريدك الإلكتروني (وصندوق الرسائل غير المرغوب فيها).
            </p>
            
            <button
              type="button"
              className="btn-ghost"
              style={{ width: "100%", marginTop: "1rem" }}
              onClick={() => { setMode("login"); setForgotSuccess(false); setEmail(""); }}
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit} noValidate>
            {/* Email Input */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                htmlFor="forgot-email"
                style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "0.375rem" }}
              >
                البريد الإلكتروني المسجل
              </label>
              <input
                id="forgot-email"
                type="email"
                className={`input-base${errors.email ? " input-error" : ""}`}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); setApiError(""); }}
                placeholder="you@example.com"
                disabled={submitting}
                dir="ltr"
                inputMode="email"
              />
              {errors.email && <p style={errorStyle}>{errors.email}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ width: "100%", fontSize: "1rem", fontWeight: 800, marginBottom: "0.75rem" }}
            >
              {submitting ? (
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <SpinnerIcon />
                  جاري إرسال الرابط...
                </span>
              ) : (
                "إرسال رابط إعادة التعيين ←"
              )}
            </button>

            {/* Cancel / Back to login */}
            <button
              type="button"
              disabled={submitting}
              className="btn-ghost"
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => { setMode("login"); setErrors({}); setApiError(""); }}
            >
              العودة لتسجيل الدخول
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background:   "var(--color-surface)",
        border:       "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        padding:      "2rem 1.5rem",
        boxShadow:    "var(--shadow-md), 0 0 40px var(--color-primary-glow)",
      }}
    >
      {/* ── Header ── */}
      <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.375rem", fontWeight: 800, marginBottom: "0.25rem" }}>
          مرحباً بعودتك 👋
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
          سجّل دخولك لإدارة متجرك
        </p>
      </div>

      {/* ── API Error banner ── */}
      {apiError && (
        <div
          role="alert"
          style={{
            display:      "flex",
            alignItems:   "flex-start",
            gap:          "0.5rem",
            background:   "var(--color-danger-muted)",
            border:       "1.5px solid var(--color-danger)",
            borderRadius: "var(--radius-md)",
            padding:      "0.75rem 1rem",
            fontSize:     "0.875rem",
            color:        "var(--color-danger)",
            fontWeight:   600,
            marginBottom: "1.25rem",
            lineHeight:   1.4,
          }}
        >
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠</span>
          <span>{apiError}</span>
        </div>
      )}

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} noValidate>

        {/* Email */}
        <div style={{ marginBottom: "1rem" }}>
          <label
            htmlFor="login-email"
            style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "0.375rem" }}
          >
            البريد الإلكتروني
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className={`input-base${errors.email ? " input-error" : ""}`}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); setApiError(""); }}
            placeholder="you@example.com"
            disabled={submitting}
            dir="ltr"
            inputMode="email"
          />
          {errors.email && <p style={errorStyle}>{errors.email}</p>}
        </div>

        {/* Password */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
            <label
              htmlFor="login-password"
              style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-muted)" }}
            >
              كلمة المرور
            </label>
            <button
              type="button"
              style={{ fontSize: "0.75rem", color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-cairo), sans-serif" }}
              onClick={() => { setMode("forgot"); setErrors({}); setApiError(""); }}
              tabIndex={-1}
            >
              نسيت كلمة المرور؟
            </button>
          </div>
          <div style={{ position: "relative" }}>
            <input
              id="login-password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              className={`input-base${errors.password ? " input-error" : ""}`}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); setApiError(""); }}
              placeholder="••••••••"
              disabled={submitting}
              dir="ltr"
              style={{ paddingLeft: "2.75rem" }}
            />
            {/* Show / hide toggle */}
            <button
              type="button"
              onClick={() => setShowPw((p) => !p)}
              tabIndex={-1}
              style={{
                position:  "absolute",
                top:       "50%",
                left:      "0.75rem",
                transform: "translateY(-50%)",
                background:"none",
                border:    "none",
                cursor:    "pointer",
                color:     "var(--color-text-faint)",
                fontSize:  "1rem",
                padding:   "0",
                lineHeight: 1,
              }}
              aria-label={showPw ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showPw ? "🙈" : "👁"}
            </button>
          </div>
          {errors.password && <p style={errorStyle}>{errors.password}</p>}
        </div>

        {/* Submit */}
        <button
          id="login-submit-btn"
          type="submit"
          disabled={submitting}
          className="btn-primary"
          style={{ width: "100%", fontSize: "1rem", fontWeight: 800, letterSpacing: "-0.01em" }}
        >
          {submitting ? (
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <SpinnerIcon />
              جاري تسجيل الدخول...
            </span>
          ) : (
            "تسجيل الدخول ←"
          )}
        </button>
      </form>

      {/* ── Divider + Register link ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.25rem 0" }}>
        <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
        <span style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", whiteSpace: "nowrap" }}>ليس لديك حساب؟</span>
        <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
      </div>

      <Link
        href="/register"
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          width:          "100%",
          padding:        "0.75rem",
          minHeight:      "48px",
          background:     "var(--color-surface-2)",
          color:          "var(--color-primary)",
          border:         "1.5px solid var(--color-primary)",
          borderRadius:   "var(--radius-md)",
          textDecoration: "none",
          fontWeight:     700,
          fontSize:       "0.9375rem",
          textAlign:      "center",
          transition:     "background 0.15s",
        }}
      >
        أنشئ متجرك مجاناً 🚀
      </Link>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            padding: "3rem 2rem",
            textAlign: "center",
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-cairo), sans-serif",
          }}
        >
          جاري التحميل...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}

// ---------------------------------------------------------------------------
// Micro-components
// ---------------------------------------------------------------------------

function SpinnerIcon() {
  return (
    <svg
      width="16" height="16"
      viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: "spin 0.7s linear infinite" }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

const errorStyle: React.CSSProperties = {
  color:     "var(--color-danger)",
  fontSize:  "0.75rem",
  marginTop: "0.375rem",
  fontWeight: 600,
};
