"use client";

/**
 * app/(dashboard)/onboarding/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — New Merchant Onboarding Wizard
 *
 * Shown to merchants who have no store record yet.
 * 3-step guided setup:
 *   Step 1 — اسم المتجر (store name)
 *   Step 2 — رابط المتجر (slug with live availability + auto-suggestion)
 *   Step 3 — رقم الواتساب (phone with country hint)
 *
 * On completion → POST /api/store/setup → redirect to /dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Step = 1 | 2 | 3;
type CountryHint = "TR" | "SA" | "AE" | "EG" | "IQ" | "KW" | "QA" | "OM" | "JO" | "MA";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://dukkanni.com";
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

const COUNTRY_OPTIONS: { value: CountryHint; label: string; dialCode: string }[] = [
  { value: "TR", label: "تركيا",     dialCode: "+90"  },
  { value: "SA", label: "السعودية",   dialCode: "+966" },
  { value: "AE", label: "الإمارات",   dialCode: "+971" },
  { value: "EG", label: "مصر",        dialCode: "+20"  },
  { value: "IQ", label: "العراق",     dialCode: "+964" },
  { value: "KW", label: "الكويت",     dialCode: "+965" },
  { value: "QA", label: "قطر",        dialCode: "+974" },
  { value: "OM", label: "عُمان",      dialCode: "+968" },
  { value: "JO", label: "الأردن",     dialCode: "+962" },
  { value: "MA", label: "المغرب",     dialCode: "+212" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Auto-generate a slug from a store name */
function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s_]+/g, "-")           // spaces/underscores → hyphens
    .replace(/[^a-z0-9-]/g, "")       // remove everything else
    .replace(/^-+|-+$/g, "")          // trim leading/trailing hyphens
    .replace(/-{2,}/g, "-")           // collapse consecutive hyphens
    .slice(0, 48);
}

// ---------------------------------------------------------------------------
// Step progress indicator
// ---------------------------------------------------------------------------

function StepProgress({ current, total }: { current: Step; total: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0", marginBottom: "2rem" }}>
      {Array.from({ length: total }).map((_, idx) => {
        const stepNum  = (idx + 1) as Step;
        const isActive = stepNum === current;
        const isDone   = stepNum < current;

        return (
          <div key={idx} style={{ display: "flex", alignItems: "center" }}>
            {/* Step circle */}
            <div
              style={{
                width:          "32px",
                height:         "32px",
                borderRadius:   "50%",
                background:     isDone
                  ? "var(--color-success)"
                  : isActive
                    ? "var(--color-primary)"
                    : "var(--color-surface-3)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontSize:       "0.875rem",
                fontWeight:     800,
                color:          isDone || isActive ? "#fff" : "var(--color-text-faint)",
                transition:     "background 0.3s",
                flexShrink:     0,
                boxShadow:      isActive ? "0 0 0 4px var(--color-primary-muted)" : "none",
              }}
            >
              {isDone ? "✓" : stepNum}
            </div>

            {/* Connector line (not after last) */}
            {idx < total - 1 && (
              <div
                style={{
                  width:      "48px",
                  height:     "2px",
                  background: isDone ? "var(--color-success)" : "var(--color-border)",
                  transition: "background 0.3s",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Wizard
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();

  const [step,        setStep]        = useState<Step>(1);
  const [name,        setName]        = useState("");
  const [slug,        setSlug]        = useState("");
  const [whatsapp,    setWhatsapp]    = useState("");
  const [countryHint, setCountryHint] = useState<CountryHint>("TR");
  const [error,       setError]       = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  // Slug availability state
  const [slugChecking,  setSlugChecking]  = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugReason,    setSlugReason]    = useState("");
  const slugDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Redirect if store already exists, and pre-populate store name from user metadata
  useEffect(() => {
    // 1. Check if store already exists
    fetch("/api/store")
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.id) {
          router.replace("/dashboard");
        } else {
          // 2. Fetch user metadata to suggest store name
          const supabase = createClient();
          supabase.auth.getUser().then((res: any) => {
            const user = res.data?.user;
            if (user?.user_metadata?.store_name) {
              setName(user.user_metadata.store_name);
            }
          });
        }
      })
      .catch(() => {});
  }, [router]);

  // ── Slug check ─────────────────────────────────────────────────────────────
  const checkSlug = useCallback((value: string) => {
    if (value.length < 4 || !SLUG_REGEX.test(value)) {
      setSlugAvailable(null);
      return;
    }
    setSlugChecking(true);
    fetch(`/api/store/slug-check?slug=${encodeURIComponent(value)}`)
      .then((r) => r.json())
      .then((j: { available: boolean; reason?: string }) => {
        setSlugChecking(false);
        setSlugAvailable(j.available);
        setSlugReason(j.reason ?? "");
      })
      .catch(() => { setSlugChecking(false); setSlugAvailable(null); });
  }, []);

  const handleSlugChange = (raw: string) => {
    const cleaned = raw.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(cleaned);
    setError("");
    setSlugAvailable(null);
    clearTimeout(slugDebounce.current);
    slugDebounce.current = setTimeout(() => checkSlug(cleaned), 600);
  };

  // ── Step 1 → 2: validate name, auto-suggest slug ──────────────────────────
  const goToStep2 = () => {
    if (name.trim().length < 2) {
      setError("اسم المتجر قصير جداً (حرفان على الأقل)");
      return;
    }
    if (name.trim().length > 60) {
      setError("اسم المتجر طويل جداً");
      return;
    }
    const suggested = suggestSlug(name.trim());
    setSlug(suggested);
    checkSlug(suggested);
    setError("");
    setStep(2);
  };

  // ── Step 2 → 3: validate slug ─────────────────────────────────────────────
  const goToStep3 = () => {
    if (slug.length < 4) {
      setError("الرابط قصير جداً (4 أحرف على الأقل)");
      return;
    }
    if (!SLUG_REGEX.test(slug)) {
      setError("الرابط يجب أن يحتوي أحرف إنجليزية صغيرة وأرقام وشرطات (-) فقط");
      return;
    }
    if (slugAvailable === false) {
      setError(slugReason || "هذا الرابط غير متاح");
      return;
    }
    setError("");
    setStep(3);
  };

  // ── Step 3: submit ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (whatsapp.trim().length < 7) {
      setError("رقم الواتساب قصير جداً");
      return;
    }
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/store/setup", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:          name.trim(),
        slug,
        whatsapp:      whatsapp.trim(),
        countryHint,
        currency_code: "TRY",
      }),
    });

    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      if (json.error?.includes("الرابط")) {
        setStep(2);
        setError(json.error);
      } else {
        setError(json.error ?? "خطأ في إنشاء المتجر");
      }
      return;
    }

    // Store created! Redirect to dashboard
    router.push("/dashboard");
    router.refresh();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const STEP_META = [
    { emoji: "🏪", title: "اسم متجرك",    subtitle: "ما هو اسم متجرك؟" },
    { emoji: "🔗", title: "رابط متجرك",   subtitle: "اختر رابطاً فريداً لمتجرك" },
    { emoji: "💬", title: "رقم الواتساب", subtitle: "أين يصل إليك الزبائن؟" },
  ] as const;

  const meta = STEP_META[step - 1];

  return (
    <div
      style={{
        minHeight:      "100dvh",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "1.25rem",
        background:     "var(--color-bg)",
        fontFamily:     "var(--font-cairo), sans-serif",
        direction:      "rtl",
      }}
    >
      {/* Wizard card */}
      <div
        style={{
          width:        "100%",
          maxWidth:     "420px",
          background:   "var(--color-surface)",
          borderRadius: "var(--radius-xl)",
          border:       "1.5px solid var(--color-border)",
          padding:      "2rem 1.5rem",
          boxShadow:    "var(--shadow-lg)",
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "2.25rem", marginBottom: "0.375rem" }}>🏪</div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            مرحباً بك في دكاني!
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            لنعد متجرك الأول جاهزاً في دقيقة
          </p>
        </div>

        {/* Step progress */}
        <StepProgress current={step} total={3} />

        {/* Step emoji + title */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{meta.emoji}</div>
          <p style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--color-text)" }}>
            {meta.title}
          </p>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
            {meta.subtitle}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div
            style={{
              background:   "var(--color-danger-muted)",
              border:       "1.5px solid var(--color-danger)",
              borderRadius: "var(--radius-sm)",
              padding:      "0.625rem 0.875rem",
              fontSize:     "0.8125rem",
              color:        "var(--color-danger)",
              fontWeight:   600,
              marginBottom: "1rem",
              textAlign:    "center",
            }}
          >
            {error}
          </div>
        )}

        {/* ── STEP 1: Store Name ── */}
        {step === 1 && (
          <div>
            <label htmlFor="ob-name" style={labelStyle}>
              اسم المتجر <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <input
              id="ob-name"
              type="text"
              className="input-base"
              placeholder="مثال: دكان إيدلبي للمواد الغذائية"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && goToStep2()}
              maxLength={60}
              autoFocus
            />
            <p style={hintStyle}>
              سيظهر هذا الاسم لزبائنك في أعلى صفحة المتجر
            </p>
            <button
              id="ob-next-1"
              type="button"
              onClick={goToStep2}
              className="btn-primary"
              style={nextBtnStyle}
            >
              التالي ←
            </button>
          </div>
        )}

        {/* ── STEP 2: Slug ── */}
        {step === 2 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
              <label htmlFor="ob-slug" style={labelStyle}>
                رابط المتجر <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              {/* Availability badge */}
              {slugChecking && (
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-faint)" }}>⏳ جاري التحقق...</span>
              )}
              {!slugChecking && slugAvailable === true && (
                <span style={{ fontSize: "0.75rem", color: "var(--color-success)", fontWeight: 700 }}>✓ متاح</span>
              )}
              {!slugChecking && slugAvailable === false && (
                <span style={{ fontSize: "0.75rem", color: "var(--color-danger)", fontWeight: 700 }}>✗ غير متاح</span>
              )}
            </div>

            <input
              id="ob-slug"
              type="text"
              className={`input-base${slugAvailable === false ? " input-error" : slugAvailable === true ? " input-success" : ""}`}
              placeholder="my-store"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goToStep3()}
              maxLength={48}
              dir="ltr"
              autoFocus
            />

            {/* Link preview */}
            <div
              style={{
                display:     "flex",
                alignItems:  "center",
                gap:         "0.25rem",
                marginTop:   "0.5rem",
                padding:     "0.5rem 0.75rem",
                background:  "var(--color-surface-2)",
                borderRadius:"var(--radius-sm)",
                fontSize:    "0.8125rem",
                direction:   "ltr",
                textAlign:   "left",
              }}
            >
              <span style={{ color: "var(--color-text-faint)" }}>🌐 {APP_URL.replace("https://", "")}/</span>
              <span style={{ color: slug ? "var(--color-primary)" : "var(--color-text-faint)", fontWeight: slug ? 700 : 400 }}>
                {slug || "your-slug"}
              </span>
            </div>

            <p style={hintStyle}>
              يُستخدم في رابط متجرك العام — لاحقاً يمكن تغييره من الإعدادات
            </p>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => { setStep(1); setError(""); }}
                style={{ ...nextBtnStyle, background: "var(--color-surface-2)", color: "var(--color-text-muted)", boxShadow: "none", flexShrink: 0, width: "60px" }}
              >
                ←
              </button>
              <button
                id="ob-next-2"
                type="button"
                onClick={goToStep3}
                className="btn-primary"
                style={{ ...nextBtnStyle, flex: 1, marginTop: 0 }}
                disabled={slugAvailable === false}
              >
                التالي ←
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: WhatsApp ── */}
        {step === 3 && (
          <div>
            <label htmlFor="ob-country" style={labelStyle}>
              الدولة <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <select
              id="ob-country"
              value={countryHint}
              onChange={(e) => { setCountryHint(e.target.value as CountryHint); setError(""); }}
              style={selectStyle}
            >
              {COUNTRY_OPTIONS.map(({ value, label, dialCode }) => (
                <option key={value} value={value}>{label} ({dialCode})</option>
              ))}
            </select>

            <label htmlFor="ob-phone" style={{ ...labelStyle, marginTop: "0.875rem", display: "block" }}>
              رقم الواتساب <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <input
              id="ob-phone"
              type="tel"
              className="input-base"
              placeholder="905321234567"
              value={whatsapp}
              onChange={(e) => { setWhatsapp(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              dir="ltr"
              autoFocus
            />

            <p style={hintStyle}>
              أدخل رقمك مع رمز الدولة بدون + أو مسافات
              (مثال تركيا: <code>905321234567</code>)
            </p>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => { setStep(2); setError(""); }}
                style={{ ...nextBtnStyle, background: "var(--color-surface-2)", color: "var(--color-text-muted)", boxShadow: "none", flexShrink: 0, width: "60px" }}
              >
                ←
              </button>
              <button
                id="ob-submit"
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  flex:         1,
                  marginTop:    0,
                  padding:      "0.875rem",
                  background:   submitting ? "var(--color-surface-3)" : "#25D366",
                  color:        submitting ? "var(--color-text-faint)" : "#fff",
                  border:       "none",
                  borderRadius: "var(--radius-full)",
                  fontFamily:   "var(--font-cairo), sans-serif",
                  fontWeight:   800,
                  fontSize:     "1rem",
                  cursor:       submitting ? "not-allowed" : "pointer",
                  boxShadow:    submitting ? "none" : "0 4px 16px rgba(37,211,102,0.3)",
                  transition:   "all 0.2s",
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  gap:          "0.5rem",
                }}
              >
                {submitting ? (
                  "جاري إنشاء المتجر..."
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    إنشاء المتجر وابدأ الآن!
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer note */}
      <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", marginTop: "1.25rem", textAlign: "center" }}>
        🔒 بياناتك آمنة ومحمية. يمكنك تعديل كل شيء لاحقاً من الإعدادات.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared micro-styles
// ---------------------------------------------------------------------------

const labelStyle: React.CSSProperties = {
  display:      "block",
  fontSize:     "0.8125rem",
  fontWeight:   700,
  color:        "var(--color-text-muted)",
  marginBottom: "0.375rem",
};

const hintStyle: React.CSSProperties = {
  fontSize:   "0.75rem",
  color:      "var(--color-text-faint)",
  marginTop:  "0.375rem",
  lineHeight: 1.5,
};

const nextBtnStyle: React.CSSProperties = {
  display:      "block",
  width:        "100%",
  padding:      "0.875rem",
  marginTop:    "1.25rem",
  background:   "var(--color-primary)",
  color:        "#fff",
  border:       "none",
  borderRadius: "var(--radius-full)",
  fontFamily:   "var(--font-cairo), sans-serif",
  fontWeight:   800,
  fontSize:     "1rem",
  cursor:       "pointer",
  boxShadow:    "0 4px 16px var(--color-primary-glow)",
  transition:   "all 0.2s",
};

const selectStyle: React.CSSProperties = {
  width:        "100%",
  padding:      "0.75rem",
  borderRadius: "var(--radius-md)",
  border:       "1.5px solid var(--color-border)",
  background:   "var(--color-surface)",
  color:        "var(--color-text)",
  fontFamily:   "var(--font-cairo), sans-serif",
  fontSize:     "0.9rem",
  cursor:       "pointer",
  direction:    "rtl",
  marginBottom: "0.5rem",
};
