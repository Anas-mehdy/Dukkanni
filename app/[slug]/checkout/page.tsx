"use client";

/**
 * app/[slug]/checkout/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Customer Checkout "عرض فاتورتك"
 *
 * Flow:
 *   1. Reads cart from useCart(slug) — localStorage
 *   2. Shows invoice summary (items × qty = subtotal)
 *   3. Single input: اسم الزبون
 *   4. On submit:
 *      a. POST /api/orders → saves to DB (prices resolved server-side)
 *      b. Build WhatsApp message via buildWhatsAppMessage()
 *      c. Apply binary-search truncation if message > 1800 chars
 *      d. Clear cart
 *      e. Auto-open wa.me deep-link → show success screen as fallback
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { buildWhatsAppMessage, sanitizePhone } from "@/lib/whatsapp";
import { getCurrencySymbol } from "@/lib/constants";
import { locales } from "@/lib/locales";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderResult {
  orderId:      string;
  storePhone:   string;
  storeName:    string;
  currencyCode: string;
  customerName: string;
  totalAmount:  number;
  items: Array<{
    name:      string;
    quantity:  number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(amount: number, currencySymbol: string, lang: "ar" | "tr" | "en"): string {
  const formatted = amount.toLocaleString(
    lang === "ar" ? "ar-EG" : lang === "tr" ? "tr-TR" : "en-US",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  );
  return `${formatted} ${currencySymbol}`;
}

/** Delegates to buildWhatsAppMessage (truncation already built-in) */
function buildSafeWhatsAppUrl(
  phone: string,
  items: OrderResult["items"],
  customerName: string,
  storeName: string,
  currencyCode: string,
  totalAmount: number,
  language: "ar" | "tr" | "en"
): { url: string; isTruncated: boolean } {
  return buildWhatsAppMessage(phone, {
    storeName,
    customerName,
    currencyCode,
    totalAmount,
    items,
  }, language);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug }  = use(params);
  const router    = useRouter();
  const cart      = useCart(slug);

  const [customerName, setCustomerName] = useState("");
  const [nameError, setNameError]       = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [phoneError, setPhoneError]     = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [apiError, setApiError]         = useState("");
  const [success, setSuccess]           = useState<{
    url:          string;
    wasTruncated: boolean;
    orderId:      string;
  } | null>(null);

  // i18n states
  const [lang, setLang] = useState<"ar" | "tr" | "en">("ar");
  const [mounted, setMounted] = useState(false);

  // Translation caching states (scoped by language: 'tr' and 'en')
  const [translatedItemNames, setTranslatedItemNames] = useState<Record<"tr" | "en", Record<string, string>>>({
    tr: {},
    en: {}
  });
  const [translatedLangs, setTranslatedLangs] = useState<Record<string, boolean>>({ ar: true });

  useEffect(() => {
    const saved = localStorage.getItem("dukkanni_store_lang") as "ar" | "tr" | "en";
    if (saved && ["ar", "tr", "en"].includes(saved)) {
      setLang(saved);
    }
    setMounted(true);
  }, []);

  const t = mounted ? locales[lang] : locales["ar"];

  // Global document direction synchronization (fixes layout off-center/tilting-left bugs globally)
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dir = t.dir;
    document.documentElement.lang = lang;
  }, [lang, mounted, t.dir]);

  // Effect to automatically translate cart items when language switches on checkout
  useEffect(() => {
    if (!mounted) return;
    if (lang === "ar") return; // Source of truth is Arabic
    if (translatedLangs[lang]) return; // Already translated this language

    const performTranslation = async () => {
      try {
        const itemNames = cart.items.map((i) => i.name);
        if (itemNames.length === 0) return;

        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: itemNames, target: lang }),
        });

        if (!response.ok) throw new Error("Translation failed");

        const json = await response.json();
        const translatedArray: string[] = json.translations;

        const itemTranslations: Record<string, string> = {};
        cart.items.forEach((item, index) => {
          itemTranslations[item.productId] = translatedArray[index] || item.name;
        });

        setTranslatedItemNames((prev) => ({ ...prev, [lang]: itemTranslations }));
        setTranslatedLangs((prev) => ({ ...prev, [lang]: true }));
      } catch (err) {
        console.error("Cart items translation failed:", err);
      }
    };

    performTranslation();
  }, [lang, mounted, cart.items]);

  const currencySymbol = getCurrencySymbol("TRY"); // Resolved properly after order

  // ── Empty cart redirect ───────────────────────────────────────────────────
  if (cart.hydrated && cart.items.length === 0 && !success) {
    return (
      <div
        style={{
          width:          "100%",
          maxWidth:       "480px",
          margin:         "0 auto",
          minHeight:      "100dvh",
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "2rem",
          textAlign:      "center",
          background:     "var(--color-bg)",
          fontFamily:     lang === "ar" ? "var(--font-cairo), sans-serif" : "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
          direction:      t.dir,
        }}
      >
        <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>🛒</div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-text)" }}>
          {t.emptyCart}
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "0.5rem", marginBottom: "1.5rem" }}>
          {t.emptyCartDesc}
        </p>
        <Link
          href={`/${slug}`}
          style={{
            padding:        "0.75rem 1.75rem",
            background:     "var(--color-primary)",
            color:          "#fff",
            borderRadius:   "var(--radius-full)",
            textDecoration: "none",
            fontWeight:     700,
            fontSize:       "0.9375rem",
          }}
        >
          {t.backToStore}
        </Link>
      </div>
    );
  }

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate customer name
    if (!customerName.trim()) {
      setNameError(t.nameRequired);
      return;
    }
    if (customerName.trim().length < 2) {
      setNameError(t.nameTooShort);
      return;
    }

    // Validate customer phone
    if (!customerPhone.trim()) {
      setPhoneError(t.phoneRequired);
      return;
    }

    // Sanitize customer phone using sanitizePhone() helper
    const sanitizedPhone = sanitizePhone(customerPhone.trim());
    if (!sanitizedPhone) {
      setPhoneError(t.phoneInvalid);
      return;
    }

    setNameError("");
    setPhoneError("");
    setApiError("");
    setSubmitting(true);

    try {
      // ── Step 1: Create order in DB ──────────────────────────────────────
      const res = await fetch("/api/orders", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeSlug:    slug,
          customerName: customerName.trim(),
          customerPhone: sanitizedPhone,
          items:        cart.items.map((i) => ({
            productId: i.productId,
            quantity:  i.quantity,
          })),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setApiError(json.error ?? (lang === "tr" ? "Bir hata oluştu. Lütfen tekrar deneyin." : lang === "en" ? "An error occurred. Please try again." : "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مجدداً."));
        return;
      }

      const order: OrderResult = json.data;

      // ── Step 2: Build WhatsApp message with length guard ────────────────
      // Map product names to their translated versions for the WhatsApp payload!
      const translatedItemsForWA = order.items.map((i) => {
        // Find the matching cart item to extract its product ID for translated name lookup
        const cartItem = cart.items.find((ci) => ci.name === i.name);
        const translatedName = lang === "ar" ? i.name : (cartItem ? (translatedItemNames[lang]?.[cartItem.productId] || i.name) : i.name);
        return {
          ...i,
          name: translatedName,
        };
      });

      const { url, isTruncated: wasTruncated } = buildSafeWhatsAppUrl(
        order.storePhone,
        translatedItemsForWA,
        order.customerName,
        order.storeName,
        order.currencyCode,
        order.totalAmount,
        lang
      );

      // ── Step 3: Clear cart ──────────────────────────────────────────────
      cart.clearCart();

      // ── Step 4: Set success state (shown as fallback if WA doesn't open) ──
      setSuccess({ url, wasTruncated, orderId: order.orderId });

      // ── Step 5: Open WhatsApp deep link ─────────────────────────────────
      window.open(url, "_blank");
    } catch {
      setApiError(lang === "tr" ? "Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin." : lang === "en" ? "Connection error. Please check your internet and try again." : "خطأ في الاتصال. تأكد من اتصالك بالإنترنت وأعد المحاولة.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div
        style={{
          width:         "100%",
          maxWidth:      "480px",
          margin:        "0 auto",
          minHeight:     "100dvh",
          background:    "var(--color-bg)",
          fontFamily:    lang === "ar" ? "var(--font-cairo), sans-serif" : "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
          direction:     t.dir,
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          padding:       "2rem 1.25rem",
        }}
      >
        {/* Success icon */}
        <div
          style={{
            width:          "80px",
            height:         "80px",
            borderRadius:   "50%",
            background:     "var(--color-success-muted)",
            border:         "2px solid var(--color-success)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            fontSize:       "2.5rem",
            marginTop:      "2rem",
            marginBottom:   "1.25rem",
          }}
        >
          ✓
        </div>

        <h1 style={{ fontSize: "1.375rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.5rem", textAlign: "center" }}>
          {t.successTitle}
        </h1>
        <p style={{ color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.6, marginBottom: "1.75rem" }}>
          {t.orderNumber}: <strong style={{ color: "var(--color-text)", fontFamily: "monospace" }}>#{success.orderId.slice(0, 8).toUpperCase()}</strong>
          <br />
          {t.successDesc}
        </p>

        {/* Truncation warning */}
        {success.wasTruncated && (
          <div
            style={{
              background:   "var(--color-warning-muted)",
              border:       "1.5px solid var(--color-warning)",
              borderRadius: "var(--radius-md)",
              padding:      "0.75rem 1rem",
              marginBottom: "1.25rem",
              fontSize:     "0.875rem",
              color:        "var(--color-text)",
              width:        "100%",
            }}
          >
            {t.waTruncatedWarning}
          </div>
        )}

        {/* Open WhatsApp CTA */}
        <a
          href={success.url}
          target="_blank"
          rel="noopener noreferrer"
          id="open-whatsapp-btn"
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            gap:            "0.625rem",
            width:          "100%",
            padding:        "1rem",
            background:     "#25D366",
            color:          "#fff",
            borderRadius:   "var(--radius-full)",
            textDecoration: "none",
            fontFamily:     "inherit",
            fontWeight:     800,
            fontSize:       "1.0625rem",
            boxShadow:      "0 4px 16px rgba(37,211,102,0.4)",
            marginBottom:   "1rem",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          {t.openWhatsApp}
        </a>

        {/* Back to store */}
        <Link
          href={`/${slug}`}
          style={{
            color:          "var(--color-text-muted)",
            textDecoration: "none",
            fontSize:       "0.9rem",
            fontWeight:     600,
          }}
        >
          {t.backToStore}
        </Link>
      </div>
    );
  }

  // ── Checkout form ─────────────────────────────────────────────────────────
  return (
    <div
      style={{
        width:       "100%",
        maxWidth:    "480px",
        margin:      "0 auto",
        minHeight:   "100dvh",
        background:  "var(--color-bg)",
        fontFamily:  lang === "ar" ? "var(--font-cairo), sans-serif" : "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
        direction:   t.dir,
        paddingBottom: "2rem",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            "0.75rem",
          padding:        "1rem",
          background:     "var(--color-surface)",
          borderBottom:   "1px solid var(--color-border)",
          position:       "sticky",
          top:            0,
          zIndex:         50,
        }}
      >
        <Link
          href={`/${slug}`}
          aria-label={t.backToStore}
          style={{ color: "var(--color-text-muted)", display: "flex", textDecoration: "none" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points={t.dir === "rtl" ? "9 18 15 12 9 6" : "15 18 9 12 15 6"}/>
          </svg>
        </Link>
        <h1 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--color-text)" }}>
          {t.invoiceHeading}
        </h1>
      </header>

      <div style={{ padding: "1rem" }}>
        {/* ── Cart skeleton (pre-hydration) ── */}
        {!cart.hydrated ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: "64px", borderRadius: "var(--radius-md)" }} />
            ))}
          </div>
        ) : (
          <>
            {/* ── Invoice table ── */}
            <div className="card" style={{ marginBottom: "1rem", overflow: "hidden" }}>
              {/* Header row */}
              <div
                style={{
                  display:       "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap:           "0.5rem",
                  padding:       "0.625rem 1rem",
                  background:    "var(--color-surface-2)",
                  borderBottom:  "1px solid var(--color-border)",
                  fontSize:      "0.75rem",
                  fontWeight:    700,
                  color:         "var(--color-text-muted)",
                  letterSpacing: "0.03em",
                }}
              >
                <span>{t.product}</span>
                <span style={{ textAlign: "center" }}>{t.quantity}</span>
                <span style={{ textAlign: t.dir === "rtl" ? "left" : "right" }}>{t.total}</span>
              </div>

              {/* Item rows */}
              {cart.items.map((item) => {
                const lineTotal = item.price * item.quantity;
                return (
                  <div
                    key={item.productId}
                    style={{
                      display:             "grid",
                      gridTemplateColumns: "1fr auto auto",
                      gap:                 "0.5rem",
                      alignItems:          "center",
                      padding:             "0.75rem 1rem",
                      borderBottom:        "1px solid var(--color-border)",
                    }}
                  >
                    {/* Product info */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                      {item.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          style={{
                            width:        "40px",
                            height:       "40px",
                            borderRadius: "var(--radius-sm)",
                            objectFit:    "cover",
                            flexShrink:   0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width:          "40px",
                            height:         "40px",
                            borderRadius:   "var(--radius-sm)",
                            background:     "var(--color-surface-2)",
                            display:        "flex",
                            alignItems:     "center",
                            justifyContent: "center",
                            fontSize:       "1.25rem",
                            flexShrink:     0,
                          }}
                        >
                          📦
                        </div>
                      )}
                      <div>
                        <p
                          style={{
                            fontSize:  "0.875rem",
                            fontWeight: 600,
                            color:     "var(--color-text)",
                            lineHeight: 1.3,
                            overflow:  "hidden",
                            display:   "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {lang === "ar" ? item.name : (translatedItemNames[lang]?.[item.productId] ?? item.name)}
                        </p>
                        <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", marginTop: "1px" }}>
                          {item.price.toLocaleString(lang === "ar" ? "ar-EG" : lang === "tr" ? "tr-TR" : "en-US")} {currencySymbol} × {item.quantity}
                        </p>
                      </div>
                    </div>

                    {/* Quantity badge */}
                    <span
                      style={{
                        background:     "var(--color-primary-muted)",
                        color:          "var(--color-primary)",
                        borderRadius:   "var(--radius-full)",
                        padding:        "0.2rem 0.625rem",
                        fontWeight:     700,
                        fontSize:       "0.875rem",
                        textAlign:      "center",
                        whiteSpace:     "nowrap",
                      }}
                    >
                      × {item.quantity}
                    </span>

                    {/* Line total */}
                    <span
                      style={{
                        fontWeight:  700,
                        fontSize:    "0.9rem",
                        color:       "var(--color-text)",
                        textAlign:   t.dir === "rtl" ? "left" : "right",
                        whiteSpace:  "nowrap",
                      }}
                    >
                      {lineTotal.toLocaleString(lang === "ar" ? "ar-EG" : lang === "tr" ? "tr-TR" : "en-US")}
                      <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginInlineStart: "2px" }}>
                        {currencySymbol}
                      </span>
                    </span>
                  </div>
                );
              })}

              {/* Total row */}
              <div
                style={{
                  display:             "grid",
                  gridTemplateColumns: "1fr auto",
                  gap:                 "0.5rem",
                  padding:             "0.875rem 1rem",
                  borderTop:           "2px solid var(--color-border)",
                  background:          "var(--color-surface-2)",
                }}
              >
                <span style={{ fontWeight: 800, fontSize: "0.9375rem", color: "var(--color-text)" }}>
                  {t.total}
                </span>
                <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--color-primary)" }}>
                  {formatPrice(cart.totalPrice, currencySymbol, lang)}
                </span>
              </div>
            </div>

            {/* ── Customer form ── */}
            <form onSubmit={handleSubmit} noValidate>
              <div className="card" style={{ padding: "1rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Customer Name */}
                <div>
                  <label
                    htmlFor="customer-name"
                    style={{
                      display:      "block",
                      fontSize:     "0.875rem",
                      fontWeight:   700,
                      color:        "var(--color-text-muted)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {t.customerName} <span style={{ color: "var(--color-danger)" }}>*</span>
                  </label>
                  <input
                    id="customer-name"
                    type="text"
                    className={`input-base${nameError ? " input-error" : ""}`}
                    placeholder={t.customerNamePlaceholder}
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (nameError) setNameError("");
                      if (apiError)  setApiError("");
                    }}
                    maxLength={80}
                    disabled={submitting}
                    autoFocus
                    autoComplete="name"
                    style={{ textAlign: t.dir === "rtl" ? "right" : "left" }}
                  />
                  {nameError && (
                    <p style={{ color: "var(--color-danger)", fontSize: "0.8125rem", marginTop: "0.375rem" }}>
                      {nameError}
                    </p>
                  )}
                </div>

                {/* Customer Phone */}
                <div>
                  <label
                    htmlFor="customer-phone"
                    style={{
                      display:      "block",
                      fontSize:     "0.875rem",
                      fontWeight:   700,
                      color:        "var(--color-text-muted)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {t.phoneNumber} <span style={{ color: "var(--color-danger)" }}>*</span>
                  </label>
                  <input
                    id="customer-phone"
                    type="tel"
                    className={`input-base${phoneError ? " input-error" : ""}`}
                    placeholder={t.phoneNumberPlaceholder}
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      if (phoneError) setPhoneError("");
                      if (apiError)  setApiError("");
                    }}
                    disabled={submitting}
                    autoComplete="tel"
                    dir="ltr"
                    style={{ textAlign: t.dir === "rtl" ? "right" : "left" }}
                  />
                  {phoneError && (
                    <p style={{ color: "var(--color-danger)", fontSize: "0.8125rem", marginTop: "0.375rem" }}>
                      {phoneError}
                    </p>
                  )}
                </div>
              </div>

              {/* API error */}
              {apiError && (
                <div
                  style={{
                    background:   "var(--color-danger-muted)",
                    border:       "1.5px solid var(--color-danger)",
                    borderRadius: "var(--radius-md)",
                    padding:      "0.75rem 1rem",
                    marginBottom: "1rem",
                    color:        "var(--color-danger)",
                    fontSize:     "0.875rem",
                    fontWeight:   600,
                  }}
                >
                  ⚠ {apiError}
                </div>
              )}

              {/* Submit */}
              <button
                id="submit-order-btn"
                type="submit"
                disabled={submitting}
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  gap:            "0.625rem",
                  width:          "100%",
                  padding:        "1rem",
                  background:     submitting ? "var(--color-surface-3)" : "#25D366",
                  color:          submitting ? "var(--color-text-faint)" : "#fff",
                  borderRadius:   "var(--radius-full)",
                  border:         "none",
                  fontFamily:     "inherit",
                  fontWeight:     800,
                  fontSize:       "1.0625rem",
                  cursor:         submitting ? "not-allowed" : "pointer",
                  boxShadow:      submitting ? "none" : "0 4px 16px rgba(37,211,102,0.4)",
                  transition:     "all 0.2s",
                }}
              >
                {submitting ? (
                  t.submitting
                ) : (
                  <>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    {t.sendInvoice}
                  </>
                )}
              </button>

              {/* Trust note */}
              <p
                style={{
                  textAlign:  "center",
                  fontSize:   "0.75rem",
                  color:      "var(--color-text-faint)",
                  marginTop:  "0.875rem",
                  lineHeight: 1.5,
                }}
              >
                {t.trustNote}
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
