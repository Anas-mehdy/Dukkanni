/**
 * lib/constants.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Application-wide constants.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

export const CURRENCY_LABELS: Record<string, { symbol: string; name: string; nameAr: string }> = {
  TRY: { symbol: "₺", name: "Turkish Lira",        nameAr: "ليرة تركية" },
  SAR: { symbol: "ر.س", name: "Saudi Riyal",        nameAr: "ريال سعودي" },
  AED: { symbol: "د.إ", name: "UAE Dirham",          nameAr: "درهم إماراتي" },
  EGP: { symbol: "ج.م", name: "Egyptian Pound",     nameAr: "جنيه مصري" },
  IQD: { symbol: "د.ع", name: "Iraqi Dinar",         nameAr: "دينار عراقي" },
  KWD: { symbol: "د.ك", name: "Kuwaiti Dinar",       nameAr: "دينار كويتي" },
  QAR: { symbol: "ر.ق", name: "Qatari Riyal",        nameAr: "ريال قطري" },
  OMR: { symbol: "ر.ع", name: "Omani Rial",          nameAr: "ريال عُماني" },
  JOD: { symbol: "د.أ", name: "Jordanian Dinar",     nameAr: "دينار أردني" },
  MAD: { symbol: "د.م", name: "Moroccan Dirham",     nameAr: "درهم مغربي" },
  USD: { symbol: "$",    name: "US Dollar",           nameAr: "دولار أمريكي" },
  EUR: { symbol: "€",    name: "Euro",                nameAr: "يورو" },
  SYP: { symbol: "ل.س",  name: "Syrian Pound",        nameAr: "ليرة سورية" },
};

export function getCurrencySymbol(code: string): string {
  return CURRENCY_LABELS[code]?.symbol ?? code;
}

// ---------------------------------------------------------------------------
// Product / image limits
// ---------------------------------------------------------------------------

/** Maximum product name length (enforced in DB CHECK + Zod schema + UI) */
export const PRODUCT_NAME_MAX_CHARS = 60;

/** Maximum image file size AFTER client-side compression (bytes) */
export const IMAGE_MAX_SIZE_BYTES = 500_000; // 500 KB

/** Target dimensions for product images */
export const IMAGE_MAX_WIDTH_PX = 800;
export const IMAGE_MAX_HEIGHT_PX = 800;

/** Supabase Storage bucket name for product images */
export const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "product-images";

// ---------------------------------------------------------------------------
// Reserved slugs (kept in sync with DB CHECK constraint)
// ---------------------------------------------------------------------------

export const RESERVED_SLUGS = new Set([
  "admin", "api", "auth", "dashboard", "login", "register",
  "signup", "logout", "settings", "account", "billing",
  "help", "support", "terms", "privacy", "about", "contact",
  "dukkanni", "www", "mail", "app", "store", "shop",
  "demo", "test", "dev", "staging", "prod", "static",
  "assets", "images", "media", "cdn", "health", "status",
]);

// ---------------------------------------------------------------------------
// Navigation labels (Arabic)
// ---------------------------------------------------------------------------

export const NAV_LABELS = {
  products:   "المنتجات",
  categories: "الفئات",
  orders:     "الطلبات",
  analytics:  "التحليلات",
  settings:   "الإعدادات",
  dashboard:  "الرئيسية",
} as const;

// ---------------------------------------------------------------------------
// Fulfillment / payment status labels (Arabic)
// ---------------------------------------------------------------------------

export const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  pending:   "قيد الانتظار",
  delivered: "تم التوصيل",
  cancelled: "ملغى",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  cod_pending: "دفع عند الاستلام",
  paid:        "مدفوع",
  refunded:    "مُسترجع",
};
