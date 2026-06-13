/**
 * lib/whatsapp.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — WhatsApp utilities
 *
 * Two public exports:
 *   sanitizePhone(raw, countryCode?)  → E.164 string | null
 *   buildWhatsAppMessage(order)       → { url, message, isTruncated }
 *
 * Design rules:
 *   - Zero external dependencies (no libphonenumber — keep the bundle small).
 *   - sanitizePhone() is called on SAVE (settings form), not on display.
 *   - buildWhatsAppMessage() enforces the 1800-char soft limit per our risk
 *     analysis (WhatsApp deep-link max is ~2048; we leave 248-char headroom
 *     for the wa.me URL prefix + encoding expansion).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { locales } from "./locales";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrderItem {
  /** Product name — use either 'name' or 'productName' (both accepted) */
  name?:        string;
  productName?: string;
  quantity:     number;
  unitPrice:    number;
}

export interface WhatsAppOrderInput {
  storeName:    string;
  customerName: string;
  items:        OrderItem[];
  totalAmount:  number;
  currencyCode: string; // ISO 4217 e.g. "TRY", "SAR", "AED"
  discountAmount?: number;
  couponCode?:  string | null;
}

export interface WhatsAppMessageResult {
  /** Fully encoded wa.me URL ready for use in an anchor href or router.push() */
  url: string;
  /** The raw plain-text message (for logging / preview) */
  message: string;
  /** True when the message exceeded SOFT_LIMIT_CHARS and was truncated */
  isTruncated: boolean;
  /** Character count of the raw message */
  charCount: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maximum raw message characters before we truncate.
 * WhatsApp deep-link hard limit ≈ 2048 chars total URL.
 * The wa.me prefix + encoding overhead consumes ~200 chars headroom.
 * We set the soft limit at 1800 to be safe.
 */
const SOFT_LIMIT_CHARS = 1_800;

/**
 * Currency symbols map (covers MVP target markets).
 * Falls back to the ISO code if the currency is not in this map.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: "₺",
  SAR: "ر.س",
  AED: "د.إ",
  EGP: "ج.م",
  IQD: "د.ع",
  USD: "$",
  EUR: "€",
  GBP: "£",
  KWD: "د.ك",
  QAR: "ر.ق",
  OMR: "ر.ع",
  JOD: "د.أ",
  BHD: "د.ب",
  MAD: "د.م",
  DZD: "د.ج",
  TND: "د.ت",
  LYD: "ل.د",
  SYP: "ل.س",
};

// ---------------------------------------------------------------------------
// sanitizePhone
// ---------------------------------------------------------------------------

type CountryHint = "TR" | "SA" | "AE" | "EG" | "IQ" | "KW" | "QA" | "OM" | "JO" | "BH" | "MA" | "DZ" | "TN" | "LY";

interface CountryDialConfig {
  dialCode: string;         // e.g. "90"
  localPrefix: string;      // leading digit(s) to strip, e.g. "0"
  subscriberLength: number; // expected digits after country code
}

const COUNTRY_CONFIGS: Record<CountryHint, CountryDialConfig> = {
  TR: { dialCode: "90",  localPrefix: "0", subscriberLength: 10 },
  SA: { dialCode: "966", localPrefix: "0", subscriberLength: 9  },
  AE: { dialCode: "971", localPrefix: "0", subscriberLength: 9  },
  EG: { dialCode: "20",  localPrefix: "0", subscriberLength: 10 },
  IQ: { dialCode: "964", localPrefix: "0", subscriberLength: 10 },
  KW: { dialCode: "965", localPrefix: "",  subscriberLength: 8  },
  QA: { dialCode: "974", localPrefix: "",  subscriberLength: 8  },
  OM: { dialCode: "968", localPrefix: "",  subscriberLength: 8  },
  JO: { dialCode: "962", localPrefix: "0", subscriberLength: 9  },
  BH: { dialCode: "973", localPrefix: "",  subscriberLength: 8  },
  MA: { dialCode: "212", localPrefix: "0", subscriberLength: 9  },
  DZ: { dialCode: "213", localPrefix: "0", subscriberLength: 9  },
  TN: { dialCode: "216", localPrefix: "",  subscriberLength: 8  },
  LY: { dialCode: "218", localPrefix: "0", subscriberLength: 9  },
};

/**
 * Normalizes a raw phone number string to E.164 format.
 *
 * Handles the following input patterns (using Turkey as an example):
 *   "0532 123 45 67"   → "+905321234567"
 *   "532 123 45 67"    → "+905321234567"
 *   "90 532 123 45 67" → "+905321234567"
 *   "+905321234567"    → "+905321234567" (already E.164, passthrough)
 *   "00905321234567"   → "+905321234567" (IDD 00 prefix)
 *
 * Returns `null` if the result fails basic E.164 validation,
 * so the caller can surface a UI validation error.
 *
 * @param raw         Raw user input (any format, spaces/dashes allowed)
 * @param countryHint ISO 3166-1 alpha-2 country hint for local numbers. Default: "TR"
 */
export function sanitizePhone(
  raw: string,
  countryHint: CountryHint = "TR"
): string | null {
  if (!raw || typeof raw !== "string") return null;

  // 1. Strip everything except digits and a leading +
  //    e.g. "+90 (532) 123-45 67" → "+905321234567"
  const stripped = raw.replace(/[^\d+]/g, "");

  if (stripped.length < 7) return null; // obviously invalid

  // 2. Already E.164 — validate and return
  if (stripped.startsWith("+")) {
    return isValidE164(stripped) ? stripped : null;
  }

  // 3. IDD prefix "00..." — convert to "+"
  if (stripped.startsWith("00")) {
    const withPlus = "+" + stripped.slice(2);
    return isValidE164(withPlus) ? withPlus : null;
  }

  // 4. Local format — use countryHint to reconstruct E.164
  const config = COUNTRY_CONFIGS[countryHint];
  if (!config) return null;

  // If the user already typed the dial code without "+"
  // e.g. "905321234567" where "90" is the dial code and length matches dialCode + subscriberLength
  if (stripped.startsWith(config.dialCode) && stripped.length === config.dialCode.length + config.subscriberLength) {
    const e164candidate = "+" + stripped;
    if (isValidE164(e164candidate)) return e164candidate;
  }

  let local = stripped;

  // Strip the local prefix (e.g. leading "0" in Turkey/Egypt)
  if (config.localPrefix && local.startsWith(config.localPrefix)) {
    local = local.slice(config.localPrefix.length);
  }

  // Also handle the case where the user typed the dial code without "+"
  // e.g. "905321234567" for Turkey (dial code "90" + 10-digit subscriber)
  const withDialCode = config.dialCode + local;
  const e164candidate = "+" + withDialCode;

  if (isValidE164(e164candidate)) return e164candidate;

  // If stripping localPrefix left us with the wrong length,
  // try prepending the dial code directly to stripped
  const fallback = "+" + config.dialCode + stripped;
  return isValidE164(fallback) ? fallback : null;
}

/**
 * Basic E.164 validation: "+" followed by 7–15 digits.
 * ITU-T E.164 max is 15 digits. Minimum real-world number is 7.
 */
function isValidE164(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value);
}

// ---------------------------------------------------------------------------
// buildWhatsAppMessage
// ---------------------------------------------------------------------------

/**
 * Builds a perfectly structured WhatsApp order message and returns a
 * ready-to-use wa.me deep-link URL.
 *
 * Message format is adapted to the customer's selected language.
 *
 * @param phoneE164  The merchant's E.164 phone number (from store.whatsapp_e164)
 * @param order      Order details
 * @param language   Active customer storefront language choice
 */
export function buildWhatsAppMessage(
  phoneE164: string,
  order: WhatsAppOrderInput,
  language: "ar" | "tr" | "en" = "ar"
): WhatsAppMessageResult {
  const t = locales[language];
  const symbol = getCurrencySymbol(order.currencyCode);
  const separator = "-".repeat(23);

  // Build header line
  const header = t.waMessageHeader.replace("{storeName}", order.storeName);

  // Build footer (always included — even if items are truncated)
  const footerLines = [separator];
  
  if (order.discountAmount && order.discountAmount > 0) {
    const subtotal = order.totalAmount + order.discountAmount;
    footerLines.push(
      `${language === "tr" ? "Ara Toplam" : language === "en" ? "Subtotal" : "المجموع الفرعي"}: ${formatAmount(subtotal)} ${symbol}`,
      `${language === "tr" ? "İndirim" : language === "en" ? "Discount" : "الخصم"}${order.couponCode ? ` (${order.couponCode})` : ""}: -${formatAmount(order.discountAmount)} ${symbol}`
    );
  }

  footerLines.push(
    t.waMessageTotal.replace("{total}", formatAmount(order.totalAmount)).replace("{symbol}", symbol),
    t.waMessageCustomer.replace("{customerName}", order.customerName)
  );

  const footer = footerLines.join("\n");

  // Build individual item lines
  const itemLines: string[] = order.items.map((item) => {
    const lineTotal  = item.quantity * item.unitPrice;
    const defaultName = language === "tr" ? "ürün" : language === "en" ? "product" : "منتج";
    const itemName   = item.name ?? item.productName ?? defaultName;
    return `${itemName} (x${item.quantity})\n${formatAmount(lineTotal)} ${symbol}`;
  });

  // Assemble the message respecting the soft character limit
  const { body, isTruncated } = assembleWithLimit(
    header,
    itemLines,
    footer,
    SOFT_LIMIT_CHARS,
    t.waMessageTruncated
  );

  const message = body;
  const charCount = message.length;

  // Encode for wa.me deep-link
  // Strip the leading "+" — wa.me uses plain digits
  const phoneDigits = phoneE164.replace(/^\+/, "");
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${phoneDigits}?text=${encoded}`;

  return { url, message, isTruncated, charCount };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Assembles the final message string, respecting the character soft limit.
 * The footer (total + customer name) is ALWAYS preserved.
 * Items are dropped from the end if needed, and a truncation notice is added.
 */
function assembleWithLimit(
  header: string,
  itemLines: string[],
  footer: string,
  limit: number,
  truncationNotice: string
): { body: string; isTruncated: boolean } {
  const NEWLINE = "\n";

  // Minimum message = header + empty line + footer
  const minMessage = [header, "", footer].join(NEWLINE);
  if (minMessage.length >= limit) {
    // Even the bare minimum exceeds the limit — return it as-is
    return { body: minMessage, isTruncated: true };
  }

  // Try to fit all items
  const fullMessage = [header, "", ...itemLines, footer].join(NEWLINE);
  if (fullMessage.length <= limit) {
    return { body: fullMessage, isTruncated: false };
  }

  // Binary search for how many items fit
  let lo = 0;
  let hi = itemLines.length - 1;

  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = [
      header,
      "",
      ...itemLines.slice(0, mid),
      truncationNotice,
      footer,
    ].join(NEWLINE);

    if (candidate.length <= limit) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  const body = [
    header,
    "",
    ...itemLines.slice(0, lo),
    truncationNotice,
    footer,
  ].join(NEWLINE);

  return { body, isTruncated: true };
}

/**
 * Formats a numeric amount with up to 2 decimal places,
 * dropping unnecessary trailing zeros.
 * e.g. 550.00 → "550", 550.50 → "550.50"
 */
function formatAmount(amount: number): string {
  return amount % 1 === 0
    ? amount.toFixed(0)
    : amount.toFixed(2);
}

/**
 * Returns the display symbol for a given ISO 4217 currency code.
 * Falls back to the code itself if not in the map.
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] ?? currencyCode;
}
