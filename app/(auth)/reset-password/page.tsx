"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/browser";

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(1, "كلمة المرور الجديدة مطلوبة")
    .min(6, "كلمة المرور يجب أن تكون 6 خانات على الأقل"),
  confirmPassword: z
    .string()
    .min(1, "تأكيد كلمة المرور مطلوب"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
});

type ResetForm = z.infer<typeof resetPasswordSchema>;

// Global cache prevents calling exchangeCodeForSession twice for the same code
const globalExchangePromises: Record<string, Promise<{ error: any } | null>> = {};

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors]                   = useState<Partial<ResetForm>>({});
  const [apiError, setApiError]               = useState("");
  const [success, setSuccess]                 = useState(false);
  const [submitting, setSubmitting]           = useState(false);

  // "loading"   → waiting for Supabase to confirm the recovery session
  // "ready"     → recovery session confirmed, show the form
  // "invalid"   → link is expired / already used / invalid
  const [authState, setAuthState] = useState<"loading" | "ready" | "invalid">("loading");

  useEffect(() => {
    const supabaseClient = createClient();
    let settled = false;

    function markReady() {
      if (settled) return;
      settled = true;
      setAuthState("ready");
      setSubmitting(false);
    }

    function markInvalid(msg: string) {
      if (settled) return;
      settled = true;
      setApiError(msg);
      setAuthState("invalid");
      setSubmitting(false);
    }

    // --- Listen to auth state changes ---
    // This fires for BOTH:
    //   • Implicit flow  → PASSWORD_RECOVERY event (tokens in URL hash)
    //   • PKCE flow      → SIGNED_IN event after exchangeCodeForSession succeeds
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (event: any, session: any) => {
        if (event === "PASSWORD_RECOVERY") {
          markReady();
        } else if (event === "SIGNED_IN" && session) {
          // PKCE code was exchanged successfully and user is now signed in
          markReady();
        }
      }
    );

    // --- Handle PKCE flow: ?code= in query params ---
    const code = searchParams.get("code");
    if (code) {
      setSubmitting(true);
      if (!globalExchangePromises[code]) {
        globalExchangePromises[code] = supabaseClient.auth
          .exchangeCodeForSession(code)
          .then((res: any) => ({ error: res.error }))
          .catch((err: any) => ({ error: err }));
      }
      globalExchangePromises[code].then((res) => {
        if (res?.error) {
          console.error("Code exchange failed:", res.error?.message ?? res.error);
          markInvalid(
            "انتهت صلاحية رابط إعادة التعيين أو تم استخدامه مسبقاً. يرجى طلب رابط جديد."
          );
        }
        // If success → onAuthStateChange will fire SIGNED_IN → markReady()
      });
    }

    // --- Safety timeout ---
    // If neither the hash-based recovery event nor the PKCE code exchange
    // resolve within 8 seconds, consider the link invalid.
    const timeout = setTimeout(() => {
      markInvalid(
        "انتهت صلاحية رابط إعادة التعيين أو تم استخدامه مسبقاً. يرجى طلب رابط جديد."
      );
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    setErrors({});

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const fieldErrors: Partial<ResetForm> = {};
      parsed.error.issues.forEach((i) => {
        const key = i.path[0] as keyof ResetForm;
        if (!fieldErrors[key]) fieldErrors[key] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: parsed.data.password,
      });

      if (error) {
        setApiError(
          error.message.includes("session")
            ? "انتهت صلاحية جلسة إعادة التعيين. يرجى طلب رابط جديد."
            : error.message
        );
      } else {
        setSuccess(true);
        await supabase.auth.signOut();
        setTimeout(() => router.push("/login"), 4000);
      }
    } catch {
      setApiError("حدث خطأ أثناء تحديث كلمة المرور. يرجى المحاولة مجدداً.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestNewLink = async () => {
    try { await supabase.auth.signOut(); } catch {}
    router.push("/login?mode=forgot");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        background:   "var(--color-surface)",
        border:       "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        padding:      "2rem 1.5rem",
        boxShadow:    "var(--shadow-md), 0 0 40px var(--color-primary-glow)",
        maxWidth:     "450px",
        margin:       "4rem auto",
        fontFamily:   "var(--font-cairo), sans-serif",
        direction:    "rtl",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.375rem", fontWeight: 800, marginBottom: "0.25rem" }}>
          تعيين كلمة مرور جديدة 🔐
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
          أدخل كلمة المرور الجديدة الخاصة بحساب التاجر الخاص بك
        </p>
      </div>

      {/* Loading state */}
      {authState === "loading" && (
        <div style={{ textAlign: "center", padding: "2rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <SpinnerIcon size={32} />
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
            جاري التحقق من صلاحية الرابط...
          </p>
        </div>
      )}

      {/* Error banner (shown alongside invalid state too) */}
      {apiError && authState !== "loading" && (
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

      {/* Success state */}
      {success ? (
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem 0" }}>
          <div
            style={{
              width: "60px", height: "60px",
              borderRadius: "50%",
              background: "var(--color-success-muted)",
              border: "2px solid var(--color-success)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.75rem", margin: "0 auto 0.5rem",
            }}
          >
            ✓
          </div>
          <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--color-text)" }}>
            تم تحديث كلمة المرور بنجاح!
          </p>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
            سيتم توجيهك الآن إلى صفحة تسجيل الدخول لتسجيل الدخول بكلمة المرور الجديدة.
          </p>
          <button
            type="button"
            className="btn-primary"
            style={{ width: "100%", marginTop: "1rem" }}
            onClick={() => router.push("/login")}
          >
            تسجيل الدخول الآن
          </button>
        </div>

      ) : authState === "invalid" ? (
        /* Expired / already-used link */
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
            عذراً، هذا الرابط لم يعد صالحاً. يرجى العودة لصفحة تسجيل الدخول وطلب رابط جديد لإعادة تعيين كلمة المرور.
          </p>
          <button
            type="button"
            className="btn-primary"
            style={{ width: "100%", marginTop: "0.5rem" }}
            onClick={handleRequestNewLink}
          >
            طلب رابط جديد لإعادة التعيين
          </button>
        </div>

      ) : authState === "ready" ? (
        /* Password update form — only shown after recovery session is confirmed */
        <form onSubmit={handleSubmit} noValidate>
          {/* Password */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="new-password"
              style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "0.375rem" }}
            >
              كلمة المرور الجديدة
            </label>
            <input
              id="new-password"
              type="password"
              className={`input-base${errors.password ? " input-error" : ""}`}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); setApiError(""); }}
              placeholder="••••••••"
              disabled={submitting}
              dir="ltr"
            />
            {errors.password && <p style={errorStyle}>{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="confirm-password"
              style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "0.375rem" }}
            >
              تأكيد كلمة المرور الجديدة
            </label>
            <input
              id="confirm-password"
              type="password"
              className={`input-base${errors.confirmPassword ? " input-error" : ""}`}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: undefined })); setApiError(""); }}
              placeholder="••••••••"
              disabled={submitting}
              dir="ltr"
            />
            {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ width: "100%", fontSize: "1rem", fontWeight: 800 }}
          >
            {submitting ? (
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "center" }}>
                <SpinnerIcon size={16} />
                جاري التحديث...
              </span>
            ) : (
              "تحديث كلمة المرور ✓"
            )}
          </button>
        </form>
      ) : null}
    </div>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  );
}

function SpinnerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: "spin 0.7s linear infinite", flexShrink: 0 }}
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
