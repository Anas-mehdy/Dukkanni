"use client";

/**
 * app/(dashboard)/settings/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Merchant Store Settings
 *
 * Sections:
 *   1. Store Logo (circular avatar upload)
 *   2. Store Identity: name, slug (with live link preview + availability check)
 *   3. WhatsApp Number (with country hint selector)
 *   4. Currency Preferences
 *
 * All changes are PATCHed to /api/store.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import ImageUpload from "@/components/dashboard/ImageUpload";
import { CURRENCY_LABELS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StoreData {
  id:            string;
  name:          string;
  slug:          string;
  whatsapp_e164: string | null;
  currency_code: string;
  logo_url:      string | null;
}

type CountryHint = "TR" | "SA" | "AE" | "EG" | "IQ" | "KW" | "QA" | "OM" | "JO" | "MA";

interface SlugStatus {
  checking:  boolean;
  available: boolean | null;
  reason?:   string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://dukkanni.com";
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

const COUNTRY_OPTIONS: { value: CountryHint; label: string; dialCode: string }[] = [
  { value: "TR", label: "تركيا",          dialCode: "+90" },
  { value: "SA", label: "السعودية",        dialCode: "+966" },
  { value: "AE", label: "الإمارات",        dialCode: "+971" },
  { value: "EG", label: "مصر",             dialCode: "+20" },
  { value: "IQ", label: "العراق",          dialCode: "+964" },
  { value: "KW", label: "الكويت",          dialCode: "+965" },
  { value: "QA", label: "قطر",             dialCode: "+974" },
  { value: "OM", label: "عُمان",           dialCode: "+968" },
  { value: "JO", label: "الأردن",          dialCode: "+962" },
  { value: "MA", label: "المغرب",          dialCode: "+212" },
];

const CURRENCY_OPTIONS = Object.entries(CURRENCY_LABELS).map(([code, info]) => ({
  code,
  label: `${info.nameAr} (${info.symbol})`,
}));

// ---------------------------------------------------------------------------
// Form validation schema
// ---------------------------------------------------------------------------

const settingsSchema = z.object({
  name: z.string().trim().min(2, "اسم المتجر قصير جداً").max(60, "اسم المتجر طويل جداً"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(4, "الرابط قصير جداً (4 أحرف)")
    .max(48, "الرابط طويل جداً")
    .regex(SLUG_REGEX, "أحرف إنجليزية صغيرة وأرقام وشرطات (-) فقط"),
  whatsapp: z.string().trim().min(7, "رقم الواتساب قصير").max(20),
  countryHint: z.string(),
  currency_code: z.string().length(3),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SlugAvailabilityBadge({ status }: { status: SlugStatus }) {
  if (status.checking) {
    return (
      <span style={{ fontSize: "0.75rem", color: "var(--color-text-faint)" }}>
        ⏳ جاري التحقق...
      </span>
    );
  }
  if (status.available === true) {
    return (
      <span style={{ fontSize: "0.75rem", color: "var(--color-success)", fontWeight: 600 }}>
        ✓ الرابط متاح
      </span>
    );
  }
  if (status.available === false && status.reason) {
    return (
      <span style={{ fontSize: "0.75rem", color: "var(--color-danger)", fontWeight: 600 }}>
        ✗ {status.reason}
      </span>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { toast } = useToast();

  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [storeId,    setStoreId]    = useState<string | null>(null);

  // Form fields
  const [name,         setName]         = useState("");
  const [slug,         setSlug]         = useState("");
  const [whatsapp,     setWhatsapp]     = useState("");
  const [countryHint,  setCountryHint]  = useState<CountryHint>("TR");
  const [currencyCode, setCurrencyCode] = useState("TRY");
  const [logoUrl,      setLogoUrl]      = useState<string | null>(null);

  // Field errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Slug availability
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ checking: false, available: null });
  const originalSlug = useRef<string>("");
  const slugDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Fetch current store data ────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/store")
      .then((r) => r.json())
      .then((j: { data?: StoreData }) => {
        if (!j.data) return;
        const s = j.data;
        setStoreId(s.id);
        setName(s.name);
        setSlug(s.slug);
        setWhatsapp(s.whatsapp_e164 ?? "");
        setCurrencyCode(s.currency_code);
        setLogoUrl(s.logo_url);
        originalSlug.current = s.slug;
      })
      .catch(() => toast.error("تعذّر تحميل بيانات المتجر"))
      .finally(() => setLoading(false));
  }, [toast]);

  // ── Real-time slug availability check ──────────────────────────────────────
  const checkSlug = useCallback(
    (value: string) => {
      if (value === originalSlug.current) {
        setSlugStatus({ checking: false, available: true });
        return;
      }
      if (value.length < 4 || !SLUG_REGEX.test(value)) {
        setSlugStatus({ checking: false, available: null });
        return;
      }
      setSlugStatus({ checking: true, available: null });
      fetch(`/api/store/slug-check?slug=${encodeURIComponent(value)}`)
        .then((r) => r.json())
        .then((j: { available: boolean; reason?: string }) =>
          setSlugStatus({ checking: false, available: j.available, reason: j.reason })
        )
        .catch(() => setSlugStatus({ checking: false, available: null }));
    },
    []
  );

  const handleSlugChange = (raw: string) => {
    const cleaned = raw.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(cleaned);
    setErrors((prev) => ({ ...prev, slug: "" }));
    clearTimeout(slugDebounce.current);
    slugDebounce.current = setTimeout(() => checkSlug(cleaned), 500);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Zod validation
    const parsed = settingsSchema.safeParse({ name, slug, whatsapp, countryHint, currency_code: currencyCode });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const key = i.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Slug must be available
    if (slugStatus.available === false) {
      setErrors({ slug: slugStatus.reason ?? "الرابط غير متاح" });
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/store", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        whatsapp,
        countryHint,
        currency_code: currencyCode,
        logo_url: logoUrl,
      }),
    });

    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      const apiErr = json.error as string;
      if (res.status === 409 && apiErr.includes("الرابط")) {
        setErrors({ slug: apiErr });
      } else if (res.status === 422 && apiErr.includes("واتساب")) {
        setErrors({ whatsapp: apiErr });
      } else {
        toast.error(apiErr ?? "خطأ في الحفظ");
      }
      return;
    }

    // Update the original slug reference after save
    originalSlug.current = json.data.slug;
    setSlugStatus({ checking: false, available: true });
    toast.success("تم حفظ إعدادات المتجر ✓");
  };

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ maxWidth: "540px", margin: "0 auto" }}>
        <div className="skeleton" style={{ width: "160px", height: "28px", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem" }} />
        {[120, 80, 80, 80, 80].map((h, i) => (
          <div key={i} className="skeleton" style={{ height: `${h}px`, borderRadius: "var(--radius-md)", marginBottom: "0.75rem" }} />
        ))}
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: "540px", margin: "0 auto", paddingBottom: "2rem" }}>

      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800 }}>إعدادات المتجر ⚙️</h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
          تحكم في هوية متجرك وبيانات التواصل
        </p>
      </div>

      {/* ── Manage Subscription Card ── */}
      <section
        className="card animate-fade-in"
        style={{
          padding: "1.25rem",
          marginBottom: "1rem",
          background: "linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-2) 100%)",
          border: "1.5px solid var(--color-primary-glow)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 800, margin: 0, color: "var(--color-text)" }}>
              💳 اشتراكي والفوترة
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "4px", lineHeight: 1.4 }}>
              عرض باقتك الحالية، تفاصيل الفوترة، وتاريخ التجديد أو ترقية حسابك
            </p>
          </div>
          <Link
            href="/subscription"
            style={{
              background: "var(--color-primary)",
              color: "#ffffff",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-full)",
              fontSize: "0.75rem",
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 2px 8px var(--color-primary-glow)",
              whiteSpace: "nowrap",
              transition: "transform 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            عرض التفاصيل ←
          </Link>
        </div>
      </section>

      <form onSubmit={handleSubmit} noValidate>

        {/* ── Section 1: Logo ── */}
        <section className="card" style={{ padding: "1.25rem", marginBottom: "0.875rem" }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "0.875rem" }}>
            🖼 شعار المتجر
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ImageUpload
              currentImageUrl={logoUrl}
              folder="logos"
              shape="circle"
              onUploadComplete={(url) => setLogoUrl(url)}
              onClear={() => setLogoUrl(null)}
              disabled={submitting}
            />
          </div>
        </section>

        {/* ── Section 2: Store Identity ── */}
        <section className="card" style={{ padding: "1.25rem", marginBottom: "0.875rem" }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "1rem" }}>
            🏪 هوية المتجر
          </p>

          {/* Store Name */}
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="store-name" style={labelStyle}>
              اسم المتجر <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <input
              id="store-name"
              type="text"
              className={`input-base${errors.name ? " input-error" : ""}`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((p) => ({ ...p, name: "" }));
              }}
              placeholder="مثال: دكان إيدلبي"
              maxLength={60}
              disabled={submitting}
            />
            {errors.name && <p style={errorStyle}>{errors.name}</p>}
          </div>

          {/* Slug */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
              <label htmlFor="store-slug" style={labelStyle}>
                رابط المتجر المخصص <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <SlugAvailabilityBadge status={slugStatus} />
            </div>
            <input
              id="store-slug"
              type="text"
              className={`input-base${errors.slug || slugStatus.available === false ? " input-error" : slugStatus.available === true && slug !== originalSlug.current ? " input-success" : ""}`}
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="my-store"
              maxLength={48}
              disabled={submitting}
              dir="ltr"
            />
            {errors.slug && <p style={errorStyle}>{errors.slug}</p>}

            {/* Live link preview */}
            <div
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          "0.375rem",
                marginTop:    "0.5rem",
                padding:      "0.5rem 0.75rem",
                background:   "var(--color-surface-2)",
                borderRadius: "var(--radius-sm)",
                fontSize:     "0.8125rem",
                direction:    "ltr",
                textAlign:    "left",
              }}
            >
              <span style={{ color: "var(--color-text-faint)" }}>🌐 </span>
              <span
                style={{
                  color:       slug ? "var(--color-primary)" : "var(--color-text-faint)",
                  fontWeight:  slug ? 700 : 400,
                }}
              >
                {slug || "your-slug"}
              </span>
              <span style={{ color: "var(--color-text-faint)" }}>
                {APP_URL.includes("localhost") ? ".localhost:3000" : ".dukkanni.com"}
              </span>
            </div>
          </div>
        </section>

        {/* ── Section 3: WhatsApp ── */}
        <section className="card" style={{ padding: "1.25rem", marginBottom: "0.875rem" }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "1rem" }}>
            💬 رقم الواتساب لاستقبال الطلبات
          </p>

          {/* Country hint + phone input */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <select
              id="country-hint"
              value={countryHint}
              onChange={(e) => setCountryHint(e.target.value as CountryHint)}
              disabled={submitting}
              style={{
                flexShrink:   0,
                width:        "120px",
                padding:      "0.75rem 0.5rem",
                borderRadius: "var(--radius-md)",
                border:       "1.5px solid var(--color-border)",
                background:   "var(--color-surface)",
                color:        "var(--color-text)",
                fontFamily:   "var(--font-cairo), sans-serif",
                fontSize:     "0.875rem",
                cursor:       "pointer",
                direction:    "rtl",
              }}
            >
              {COUNTRY_OPTIONS.map(({ value, label, dialCode }) => (
                <option key={value} value={value}>
                  {label} {dialCode}
                </option>
              ))}
            </select>

            <input
              id="whatsapp-number"
              type="tel"
              className={`input-base${errors.whatsapp ? " input-error" : ""}`}
              value={whatsapp}
              onChange={(e) => {
                setWhatsapp(e.target.value);
                setErrors((p) => ({ ...p, whatsapp: "" }));
              }}
              placeholder="905321234567"
              dir="ltr"
              disabled={submitting}
              style={{ flex: 1 }}
            />
          </div>

          {errors.whatsapp && <p style={errorStyle}>{errors.whatsapp}</p>}

          <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", marginTop: "0.5rem", lineHeight: 1.5 }}>
            💡 أدخل رقمك مع رمز الدولة بدون + أو مسافات.
            مثال تركيا: <code style={{ background: "var(--color-surface-2)", padding: "0 3px", borderRadius: "2px" }}>905321234567</code>
          </p>
        </section>

        {/* ── Section 4: Currency ── */}
        <section className="card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "0.875rem" }}>
            💱 العملة الافتراضية
          </p>

          <select
            id="currency-select"
            value={currencyCode}
            onChange={(e) => setCurrencyCode(e.target.value)}
            disabled={submitting}
            style={{
              width:      "100%",
              padding:    "0.75rem",
              borderRadius: "var(--radius-md)",
              border:     "1.5px solid var(--color-border)",
              background: "var(--color-surface)",
              color:      "var(--color-text)",
              fontFamily: "var(--font-cairo), sans-serif",
              fontSize:   "0.9rem",
              cursor:     "pointer",
              direction:  "rtl",
            }}
          >
            {CURRENCY_OPTIONS.map(({ code, label }) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>

          <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", marginTop: "0.5rem" }}>
            تُستخدم لعرض الأسعار في المتجر العام وواجهة الطلبات.
          </p>
        </section>

        {/* ── Store ID info ── */}
        {storeId && (
          <div
            style={{
              fontSize:    "0.6875rem",
              color:       "var(--color-text-faint)",
              textAlign:   "center",
              marginBottom: "1rem",
              fontFamily:  "monospace",
            }}
          >
            Store ID: {storeId}
          </div>
        )}

        {/* ── Save button ── */}
        <button
          id="save-settings-btn"
          type="submit"
          disabled={submitting}
          className="btn-primary"
          style={{
            width:     "100%",
            fontSize:  "1rem",
            padding:   "0.875rem",
            fontWeight: 800,
            opacity:   submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "جاري الحفظ..." : "حفظ الإعدادات ✓"}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const labelStyle: React.CSSProperties = {
  display:    "block",
  fontSize:   "0.8125rem",
  fontWeight: 700,
  color:      "var(--color-text-muted)",
};

const errorStyle: React.CSSProperties = {
  color:      "var(--color-danger)",
  fontSize:   "0.75rem",
  marginTop:  "0.375rem",
  fontWeight: 600,
};
