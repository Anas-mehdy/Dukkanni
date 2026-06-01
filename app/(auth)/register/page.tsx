"use client";

/**
 * app/(auth)/register/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Visually engaging 2-Step Registration Funnel
 * 
 * Optimized for visitors coming from advertisements:
 *   - Step 1: WhatsApp number + Password + Password confirmation
 *   - Step 2: Full name + Store name + Email address
 *   - High trust badges, animated progress bar, real-time input checkmarks
 *   - Smooth transitions, direct redirection to dashboard on completion
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/browser";
import { sanitizePhone } from "@/lib/whatsapp";

// ---------------------------------------------------------------------------
// Scoped Validation Schemas
// ---------------------------------------------------------------------------

const step1Schema = z
  .object({
    whatsapp: z
      .string()
      .trim()
      .min(7, "رقم الهاتف غير صالح")
      .refine((val) => sanitizePhone(val) !== null, {
        message: "رقم الهاتف غير صالح. أدخل رقمك مع رمز الدولة (مثال: 905321234567)",
      }),

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
    { label: "قوية",    color: "#10B981"  },
  ] as const;
  return { score: Math.max(1, score) as 1 | 2 | 3, ...levels[Math.max(0, score - 1)] };
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

const CheckmarkIcon = () => (
  <span
    style={{
      color: "#10B981",
      fontSize: "1rem",
      fontWeight: "bold",
      pointerEvents: "none",
      animation: "checkmark-scale 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
    }}
  >
    ✅
  </span>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RegisterPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [step,            setStep]            = useState(1);
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

  const pwStrength = getPasswordStrength(password);

  // Real-time valid check flags
  const isWhatsappValid = whatsapp.trim().length >= 7 && sanitizePhone(whatsapp) !== null;
  const isPasswordValid = password.length >= 8;
  const isConfirmPasswordValid = confirmPassword.length >= 8 && confirmPassword === password;
  const isFullNameValid = fullName.trim().length >= 2;
  const isStoreNameValid = storeName.trim().length >= 2;
  const isEmailValid = email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleStep1Next = (e: React.MouseEvent) => {
    e.preventDefault();
    setApiError("");
    setErrors({});

    const parsed = step1Schema.safeParse({
      whatsapp,
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

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    setErrors({});

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

      // Fallback to step 1 if step 1 inputs fail
      const step1Fields: (keyof RegisterForm)[] = ["whatsapp", "password", "confirmPassword"];
      const hasStep1Errors = step1Fields.some((f) => !!fieldErrors[f]);
      if (hasStep1Errors) {
        setStep(1);
      }
      return;
    }

    setSubmitting(true);
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
      <style>{`
        @keyframes slide-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes checkmark-scale {
          from { transform: scale(0) translateY(-50%); opacity: 0; }
          to   { transform: scale(1) translateY(-50%); opacity: 1; }
        }
        .step-container {
          animation: slide-fade-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .btn-primary-green {
          background: #10B981 !important;
          color: #ffffff !important;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35) !important;
          border: none !important;
          transition: transform 0.15s, opacity 0.15s !important;
          cursor: pointer;
        }
        .btn-primary-green:hover:not(:disabled) {
          opacity: 0.95 !important;
          transform: translateY(-1px) !important;
        }
        .btn-primary-green:active:not(:disabled) {
          transform: translateY(0) !important;
        }
        .btn-primary-green:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }
      `}</style>

      {/* ── Top promotional badge ── */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
        <span
          style={{
            background: "rgba(16, 185, 129, 0.1)",
            border: "1.5px solid #10B981",
            color: "#10B981",
            fontSize: "0.75rem",
            fontWeight: 800,
            padding: "0.375rem 0.875rem",
            borderRadius: "var(--radius-full)",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.15)",
          }}
        >
          🎉 7 أيام مجاناً — بدون دفع بدون التزامات
        </span>
      </div>

      {/* ── Header ── */}
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.375rem", fontWeight: 800, marginBottom: "0.25rem" }}>
          أنشئ متجرك مجاناً 🚀
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
          ثوانٍ قليلة تفصلك عن بيع منتجاتك واستقبال الطلبات
        </p>
      </div>

      {/* ── Animated Progress Bar ── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-text-muted)" }}>
          <span>{step === 1 ? "أمان وتأكيد الحساب" : "تفاصيل المتجر"}</span>
          <span style={{ color: "#10B981" }}>الخطوة {step} من 2</span>
        </div>
        <div style={{ width: "100%", height: "6px", background: "var(--color-surface-3)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
          <div
            style={{
              width: step === 1 ? "50%" : "100%",
              height: "100%",
              background: "#10B981",
              borderRadius: "var(--radius-full)",
              transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              boxShadow: "0 0 10px rgba(16, 185, 129, 0.5)",
            }}
          />
        </div>
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
        
        {/* ────────────────────────────────────────────────────────────────── */}
        {/* STEP 1 */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="step-container" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            {/* Phone / WhatsApp */}
            <div>
              <label htmlFor="reg-whatsapp" style={labelStyle}>
                رقم الهاتف (الواتساب) <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="reg-whatsapp"
                  type="tel"
                  className={`input-base${errors.whatsapp ? " input-error" : isWhatsappValid ? " input-success" : ""}`}
                  value={whatsapp}
                  onChange={(e) => { setWhatsapp(e.target.value); setErrors((p) => ({ ...p, whatsapp: undefined })); setApiError(""); }}
                  placeholder="مثال: 905321234567"
                  disabled={submitting}
                  dir="ltr"
                  inputMode="tel"
                  style={{ paddingRight: isWhatsappValid ? "2.5rem" : "0.75rem" }}
                  autoFocus
                />
                {isWhatsappValid && (
                  <div style={{ position: "absolute", top: "50%", right: "0.75rem", transform: "translateY(-50%)", display: "flex", alignItems: "center" }}>
                    <CheckmarkIcon />
                  </div>
                )}
              </div>
              {errors.whatsapp && <p style={errorStyle}>{errors.whatsapp}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" style={labelStyle}>
                كلمة المرور <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="reg-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  className={`input-base${errors.password ? " input-error" : isPasswordValid ? " input-success" : ""}`}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); setApiError(""); }}
                  placeholder="8 خانات على الأقل"
                  disabled={submitting}
                  dir="ltr"
                  style={{ 
                    paddingLeft: "2.75rem",
                    paddingRight: isPasswordValid ? "2.5rem" : "0.75rem"
                  }}
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
                {isPasswordValid && (
                  <div style={{ position: "absolute", top: "50%", right: "0.75rem", transform: "translateY(-50%)", display: "flex", alignItems: "center" }}>
                    <CheckmarkIcon />
                  </div>
                )}
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
            <div>
              <label htmlFor="reg-confirm-password" style={labelStyle}>
                تأكيد كلمة المرور <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="reg-confirm-password"
                  type={showConfirmPw ? "text" : "password"}
                  autoComplete="new-password"
                  className={`input-base${errors.confirmPassword ? " input-error" : isConfirmPasswordValid ? " input-success" : ""}`}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: undefined })); }}
                  placeholder="أعد كتابة كلمة المرور"
                  disabled={submitting}
                  dir="ltr"
                  style={{ 
                    paddingLeft: "2.75rem",
                    paddingRight: isConfirmPasswordValid ? "2.5rem" : "0.75rem"
                  }}
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
                {isConfirmPasswordValid && (
                  <div style={{ position: "absolute", top: "50%", right: "0.75rem", transform: "translateY(-50%)", display: "flex", alignItems: "center" }}>
                    <CheckmarkIcon />
                  </div>
                )}
              </div>
              {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword}</p>}
              {!errors.confirmPassword && confirmPassword && confirmPassword === password && (
                <p style={{ fontSize: "0.75rem", color: "#10B981", marginTop: "0.375rem", fontWeight: 600 }}>
                  ✓ كلمتا المرور متطابقتان
                </p>
              )}
            </div>

            {/* Next button */}
            <div style={{ marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={handleStep1Next}
                className="btn-primary btn-primary-green"
                style={{ width: "100%", fontSize: "1rem", fontWeight: 800 }}
              >
                أنشئ متجرك مجاناً 🚀
              </button>
            </div>

          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* STEP 2 */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="step-container" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            {/* Back button (small, elegant) */}
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-faint)",
                fontSize: "0.8125rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                marginBottom: "0.25rem",
                fontWeight: 700,
                padding: 0,
                transition: "color 0.15s",
                alignSelf: "flex-start",
              }}
              onMouseOver={(e) => e.currentTarget.style.color = "var(--color-text-muted)"}
              onMouseOut={(e) => e.currentTarget.style.color = "var(--color-text-faint)"}
            >
              ← رجوع للخطوة السابقة
            </button>

            {/* Full Name */}
            <div>
              <label htmlFor="reg-fullname" style={labelStyle}>
                الاسم الكامل للتاجر <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="reg-fullname"
                  type="text"
                  className={`input-base${errors.fullName ? " input-error" : isFullNameValid ? " input-success" : ""}`}
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: undefined })); setApiError(""); }}
                  placeholder="الاسم واللقب"
                  disabled={submitting}
                  autoComplete="name"
                  style={{ paddingLeft: isFullNameValid ? "2.5rem" : "0.75rem" }}
                  autoFocus
                />
                {isFullNameValid && (
                  <div style={{ position: "absolute", top: "50%", left: "0.75rem", transform: "translateY(-50%)", display: "flex", alignItems: "center" }}>
                    <CheckmarkIcon />
                  </div>
                )}
              </div>
              {errors.fullName && <p style={errorStyle}>{errors.fullName}</p>}
            </div>

            {/* Store Name */}
            <div>
              <label htmlFor="reg-storename" style={labelStyle}>
                اسم المتجر <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="reg-storename"
                  type="text"
                  className={`input-base${errors.storeName ? " input-error" : isStoreNameValid ? " input-success" : ""}`}
                  value={storeName}
                  onChange={(e) => { setStoreName(e.target.value); setErrors((p) => ({ ...p, storeName: undefined })); setApiError(""); }}
                  placeholder="مثال: دكان الياسمين"
                  disabled={submitting}
                  style={{ paddingLeft: isStoreNameValid ? "2.5rem" : "0.75rem" }}
                />
                {isStoreNameValid && (
                  <div style={{ position: "absolute", top: "50%", left: "0.75rem", transform: "translateY(-50%)", display: "flex", alignItems: "center" }}>
                    <CheckmarkIcon />
                  </div>
                )}
              </div>
              {errors.storeName && <p style={errorStyle}>{errors.storeName}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" style={labelStyle}>
                البريد الإلكتروني <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  className={`input-base${errors.email ? " input-error" : isEmailValid ? " input-success" : ""}`}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); setApiError(""); }}
                  placeholder="you@example.com"
                  disabled={submitting}
                  dir="ltr"
                  inputMode="email"
                  style={{ paddingRight: isEmailValid ? "2.5rem" : "0.75rem" }}
                />
                {isEmailValid && (
                  <div style={{ position: "absolute", top: "50%", right: "0.75rem", transform: "translateY(-50%)", display: "flex", alignItems: "center" }}>
                    <CheckmarkIcon />
                  </div>
                )}
              </div>
              {errors.email && <p style={errorStyle}>{errors.email}</p>}
            </div>

            {/* Submit button */}
            <div style={{ marginTop: "0.5rem" }}>
              <button
                id="register-submit-btn"
                type="submit"
                disabled={submitting}
                className="btn-primary btn-primary-green"
                style={{ width: "100%", fontSize: "1rem", fontWeight: 800 }}
              >
                {submitting ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "center" }}>
                    <SpinnerIcon />
                    جاري إنشاء متجرك...
                  </span>
                ) : (
                  "إنهاء وابدأ الآن ✅"
                )}
              </button>
            </div>

          </div>
        )}

        {/* ── Testimonial / Motivational text ── */}
        <p
          style={{
            fontSize: "0.75rem",
            color: "#10B981",
            fontWeight: 700,
            marginTop: "1.25rem",
            textAlign: "center",
            opacity: 0.9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.25rem",
          }}
        >
          <span>⚡</span>
          <span>الكثير من التجار يستخدمون دكاني الآن</span>
        </p>

      </form>

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
        onMouseOver={(e) => {
          e.currentTarget.style.background = "var(--color-surface-2)";
          e.currentTarget.style.color = "var(--color-text)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--color-text-muted)";
        }}
      >
        تسجيل الدخول ←
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared Styles
// ---------------------------------------------------------------------------

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
  zIndex: 10,
};
