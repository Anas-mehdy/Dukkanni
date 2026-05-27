"use client";

/**
 * app/(auth)/register/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Merchant Registration Page
 *
 * Flow:
 *   1. Merchant enters full name + store name + email + password (+ confirm password)
 *   2. POST to Supabase Auth signUp() with metadata options
 *   3. On success → signInWithPassword() to auto-login
 *   4. router.push("/dashboard") → StoreGuard → /dashboard/onboarding
 *
 * Why auto-login instead of email verification first?
 *   - MVP target market (Arab/Turkish SMBs) expects instant access.
 *   - Supabase project can be configured with "Auto Confirm" in dev/MVP.
 *   - Email confirm can be added later as a post-login prompt.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/browser";
import { sanitizePhone } from "@/lib/whatsapp";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "الاسم الكامل مطلوب (حرفان على الأقل)")
      .max(80, "الاسم طويل جداً"),

    storeName: z
      .string()
      .trim()
      .min(2, "اسم المتجر مطلوب (حرفان على الأقل)")
      .max(80, "اسم المتجر طويل جداً"),

    whatsapp: z
      .string()
      .trim()
      .min(7, "رقم الهاتف غير صالح")
      .refine((val) => sanitizePhone(val) !== null, {
        message: "رقم الهاتف غير صالح. أدخل رقمك مع رمز الدولة (مثال: 905321234567)",
      }),

    email: z
      .string()
      .trim()
      .min(1, "البريد الإلكتروني مطلوب")
      .email("صيغة البريد الإلكتروني غير صحيحة"),

    password: z
      .string()
      .min(1, "كلمة المرور مطلوبة")
      .min(8, "كلمة المرور يجب أن تكون 8 خانات على الأقل")
      .max(72, "كلمة المرور طويلة جداً"),

    confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path:    ["confirmPassword"],
    message: "كلمتا المرور غير متطابقتين",
  });

type RegisterForm = {
  fullName:        string;
  storeName:       string;
  whatsapp:        string;
  email:           string;
  password:        string;
  confirmPassword: string;
};

// ---------------------------------------------------------------------------
// Password strength indicator
// ---------------------------------------------------------------------------

function getPasswordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8)                                 score++;
  if (/[A-Z]/.test(pw) || /[0-9]/.test(pw))          score++;
  if (/[^A-Za-z0-9]/.test(pw) && pw.length >= 10)    score++;
  const levels = [
    { label: "ضعيفة",   color: "var(--color-danger)"  },
    { label: "متوسطة",  color: "var(--color-warning)"  },
    { label: "قوية",    color: "var(--color-success)"  },
  ] as const;
  return { score: Math.max(1, score) as 1 | 2 | 3, ...levels[Math.max(0, score - 1)] };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RegisterPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [fullName,        setFullName]        = useState("");
  const [storeName,       setStoreName]       = useState("");
  const [whatsapp,        setWhatsapp]        = useState("");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw,          setShowPw]          = useState(false);
  const [showConfirmPw,   setShowConfirmPw]   = useState(false);
  const [errors,          setErrors]          = useState<Partial<RegisterForm>>({});
  const [apiError,        setApiError]        = useState("");
  const [submitting,      setSubmitting]      = useState(false);
  const [successMsg,      setSuccessMsg]      = useState("");

  const pwStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    setErrors({});
    setSuccessMsg("");

    // ── Client-side validation ──────────────────────────────────────────────
    const parsed = registerSchema.safeParse({
      fullName,
      storeName,
      whatsapp,
      email,
      password,
      confirmPassword,
    });

    if (!parsed.success) {
      const fieldErrors: Partial<RegisterForm> = {};
      parsed.error.issues.forEach((i) => {
        const key = i.path[0] as keyof RegisterForm;
        if (!fieldErrors[key]) fieldErrors[key] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);

    // ── Step 1: Sign up ─────────────────────────────────────────────────────
    const sanitizedWhatsapp = sanitizePhone(whatsapp);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email:    parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name:  parsed.data.fullName,
          store_name: parsed.data.storeName,
          phone:      sanitizedWhatsapp,
        },
      },
    });

    if (signUpError) {
      setSubmitting(false);
      if (signUpError.message.includes("already registered") || signUpError.message.includes("User already registered")) {
        setApiError("هذا البريد الإلكتروني مسجّل بالفعل. سجّل دخولك بدلاً من ذلك");
      } else if (signUpError.message.includes("Password should be")) {
        setApiError("كلمة المرور ضعيفة جداً. استخدم مزيجاً من الحروف والأرقام");
      } else {
        setApiError(signUpError.message);
      }
      return;
    }

    // ── Step 2: Session exists → auto-login, go to dashboard ───────────────
    router.push("/dashboard");
    router.refresh();
  };

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
          أنشئ متجرك الآن 🚀
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
          ابدأ مجاناً — لا حاجة لبطاقة ائتمان
        </p>
      </div>

      {/* ── Success banner ── */}
      {successMsg && (
        <div
          role="status"
          style={{
            background:   "var(--color-success-muted)",
            border:       "1.5px solid var(--color-success)",
            borderRadius: "var(--radius-md)",
            padding:      "0.875rem 1rem",
            fontSize:     "0.875rem",
            color:        "var(--color-success)",
            fontWeight:   600,
            marginBottom: "1.25rem",
            lineHeight:   1.5,
            textAlign:    "center",
          }}
        >
          ✅ {successMsg}
          <div style={{ marginTop: "0.625rem" }}>
            <Link href="/login" style={{ color: "var(--color-success)", textDecoration: "underline", fontWeight: 700 }}>
              تسجيل الدخول
            </Link>
          </div>
        </div>
      )}

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
      {!successMsg && (
        <form onSubmit={handleSubmit} noValidate>

          {/* Full Name */}
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="reg-fullname" style={labelStyle}>
              الاسم الكامل للتاجر
            </label>
            <input
              id="reg-fullname"
              type="text"
              className={`input-base${errors.fullName ? " input-error" : ""}`}
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: undefined })); setApiError(""); }}
              placeholder="الاسم واللقب"
              disabled={submitting}
              autoComplete="name"
              autoFocus
            />
            {errors.fullName && <p style={errorStyle}>{errors.fullName}</p>}
          </div>

          {/* Store Name */}
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="reg-storename" style={labelStyle}>
              اسم المتجر
            </label>
            <input
              id="reg-storename"
              type="text"
              className={`input-base${errors.storeName ? " input-error" : ""}`}
              value={storeName}
              onChange={(e) => { setStoreName(e.target.value); setErrors((p) => ({ ...p, storeName: undefined })); setApiError(""); }}
              placeholder="مثال: دكان الياسمين"
              disabled={submitting}
            />
            {errors.storeName && <p style={errorStyle}>{errors.storeName}</p>}
          </div>

          {/* Phone / WhatsApp */}
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="reg-whatsapp" style={labelStyle}>
              رقم الهاتف (الواتساب)
            </label>
            <input
              id="reg-whatsapp"
              type="tel"
              className={`input-base${errors.whatsapp ? " input-error" : ""}`}
              value={whatsapp}
              onChange={(e) => { setWhatsapp(e.target.value); setErrors((p) => ({ ...p, whatsapp: undefined })); setApiError(""); }}
              placeholder="مثال: 905321234567"
              disabled={submitting}
              dir="ltr"
              inputMode="tel"
            />
            {errors.whatsapp && <p style={errorStyle}>{errors.whatsapp}</p>}
          </div>

          {/* Email */}
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="reg-email" style={labelStyle}>
              البريد الإلكتروني
            </label>
            <input
              id="reg-email"
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
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="reg-password" style={labelStyle}>
              كلمة المرور
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="reg-password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                className={`input-base${errors.password ? " input-error" : ""}`}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); setApiError(""); }}
                placeholder="8 خانات على الأقل"
                disabled={submitting}
                dir="ltr"
                style={{ paddingLeft: "2.75rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                tabIndex={-1}
                style={pwToggleStyle}
                aria-label={showPw ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPw ? "🙈" : "👁"}
              </button>
            </div>
            {errors.password && <p style={errorStyle}>{errors.password}</p>}

            {/* Password strength bars */}
            {password.length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "0.25rem" }}>
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      style={{
                        flex:         1,
                        height:       "3px",
                        borderRadius: "var(--radius-full)",
                        background:   pwStrength.score >= level ? pwStrength.color : "var(--color-surface-3)",
                        transition:   "background 0.3s",
                      }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: "0.6875rem", color: pwStrength.color, fontWeight: 600 }}>
                  قوة كلمة المرور: {pwStrength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="reg-confirm-password" style={labelStyle}>
              تأكيد كلمة المرور
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="reg-confirm-password"
                type={showConfirmPw ? "text" : "password"}
                autoComplete="new-password"
                className={`input-base${errors.confirmPassword ? " input-error" : confirmPassword && confirmPassword === password ? " input-success" : ""}`}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: undefined })); }}
                placeholder="أعد كتابة كلمة المرور"
                disabled={submitting}
                dir="ltr"
                style={{ paddingLeft: "2.75rem" }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPw((p) => !p)}
                tabIndex={-1}
                style={pwToggleStyle}
                aria-label={showConfirmPw ? "إخفاء" : "إظهار"}
              >
                {showConfirmPw ? "🙈" : "👁"}
              </button>
            </div>
            {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword}</p>}
            {!errors.confirmPassword && confirmPassword && confirmPassword === password && (
              <p style={{ fontSize: "0.75rem", color: "var(--color-success)", marginTop: "0.375rem", fontWeight: 600 }}>
                ✓ كلمتا المرور متطابقتان
              </p>
            )}
          </div>

          {/* Terms note */}
          <p style={{ fontSize: "0.6875rem", color: "var(--color-text-faint)", marginBottom: "1rem", lineHeight: 1.6, textAlign: "center" }}>
            بإنشاء حساب توافق على{" "}
            <a href="/terms" style={{ color: "var(--color-primary)", textDecoration: "none" }}>شروط الخدمة</a>
          </p>

          {/* Submit */}
          <button
            id="register-submit-btn"
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ width: "100%", fontSize: "1rem", fontWeight: 800 }}
          >
            {submitting ? (
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <SpinnerIcon />
                جاري إنشاء حسابك...
              </span>
            ) : (
              "إنشاء الحساب مجاناً 🚀"
            )}
          </button>
        </form>
      )}

      {/* ── Divider + Login link ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.25rem 0 0" }}>
        <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
        <span style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", whiteSpace: "nowrap" }}>لديك حساب بالفعل؟</span>
        <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
      </div>

      <Link
        href="/login"
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          width:          "100%",
          padding:        "0.75rem",
          minHeight:      "48px",
          marginTop:      "0.875rem",
          background:     "transparent",
          color:          "var(--color-text-muted)",
          border:         "1.5px solid var(--color-border)",
          borderRadius:   "var(--radius-md)",
          textDecoration: "none",
          fontWeight:     600,
          fontSize:       "0.9375rem",
          textAlign:      "center",
          transition:     "all 0.15s",
        }}
      >
        تسجيل الدخول ←
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Micro-components & styles
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

const labelStyle: React.CSSProperties = {
  display:      "block",
  fontSize:     "0.875rem",
  fontWeight:   700,
  color:        "var(--color-text-muted)",
  marginBottom: "0.375rem",
};

const errorStyle: React.CSSProperties = {
  color:     "var(--color-danger)",
  fontSize:  "0.75rem",
  marginTop: "0.375rem",
  fontWeight: 600,
};

const pwToggleStyle: React.CSSProperties = {
  position:  "absolute",
  top:       "50%",
  left:      "0.75rem",
  transform: "translateY(-50%)",
  background: "none",
  border:    "none",
  cursor:    "pointer",
  color:     "var(--color-text-faint)",
  fontSize:  "1rem",
  padding:   "0",
  lineHeight: 1,
};
