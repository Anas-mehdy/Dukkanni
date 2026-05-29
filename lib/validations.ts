/**
 * lib/validations.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Zod schemas for all form validation.
 *
 * Imported by:
 *   - API route handlers (server-side validation)
 *   - Client-side form components (same source of truth)
 *
 * NOTE: Uses Zod v4 API (error instead of required_error/invalid_type_error,
 *       .issues instead of .errors)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "اسم الفئة مطلوب")
    .max(60, "الاسم لا يتجاوز 60 حرفاً"),

  sort_order: z
    .number()
    .int("الترتيب يجب أن يكون عدداً صحيحاً")
    .min(0, "الترتيب لا يقل عن 0")
    .max(999, "الترتيب لا يتجاوز 999")
    .default(0),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

// Partial for updates (all fields optional)
export const categoryUpdateSchema = categorySchema.partial();
export type CategoryUpdateValues = z.infer<typeof categoryUpdateSchema>;

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export const productOptionValueSchema = z.object({
  value: z.string().trim().min(1, "القيمة مطلوبة"),
  price: z.number().min(0, "السعر لا يقل عن 0").nullable().optional(),
});

export const productOptionSchema = z.object({
  name: z.string().trim().min(1, "اسم الخيار مطلوب"),
  hasCustomPrice: z.boolean().default(false),
  values: z.array(productOptionValueSchema).min(1, "يجب إضافة قيمة واحدة على الأقل"),
});

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "اسم المنتج مطلوب")
    // 60-char cap prevents WhatsApp pre-fill URL truncation (see whatsapp.ts)
    .max(60, "اسم المنتج لا يتجاوز 60 حرفاً — لضمان ظهوره كاملاً في واتساب"),

  price: z
    .number()
    .min(0, "السعر لا يقل عن 0")
    .max(9_999_999.99, "السعر مرتفع جداً"),

  category_id: z
    .string()
    .uuid("الفئة غير صالحة")
    .nullable()
    .optional()
    .default(null),

  is_active: z.boolean().default(true),
  is_available: z.boolean().default(true),

  sort_order: z
    .number()
    .int("الترتيب يجب أن يكون عدداً صحيحاً")
    .min(0)
    .max(999)
    .default(0),

  // image_url is handled separately via the upload endpoint
  image_url: z.string().url("رابط الصورة غير صالح").nullable().optional().default(null),

  options: z.array(productOptionSchema).nullable().optional().default([]),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export const productUpdateSchema = productSchema.partial();
export type ProductUpdateValues = z.infer<typeof productUpdateSchema>;

// ---------------------------------------------------------------------------
// Store settings (used in Phase 4 settings page — defined now for completeness)
// ---------------------------------------------------------------------------

export const storeSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "اسم المتجر مطلوب")
    .max(80, "اسم المتجر لا يتجاوز 80 حرفاً"),

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(4, "رابط المتجر لا يقل عن 4 أحرف")
    .max(48, "رابط المتجر لا يتجاوز 48 حرفاً")
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "الرابط يحتوي على أحرف صغيرة وأرقام وشرطة فقط"),

  whatsapp_raw: z
    .string()
    .trim()
    .min(7, "رقم الهاتف قصير جداً")
    .max(20, "رقم الهاتف طويل جداً"),

  currency_code: z
    .enum(["TRY", "SAR", "AED", "EGP", "IQD", "KWD", "QAR", "OMR", "JOD", "MAD", "USD", "EUR", "SYP"])
    .default("TRY"),

  logo_url: z.string().url("رابط الشعار غير صالح").nullable().optional().default(null),
});

export type StoreSettingsFormValues = z.infer<typeof storeSettingsSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely parses form data and returns typed result or formatted error map.
 * Use in both API route handlers and client components.
 */
export function parseFormData<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  // Zod v4: .issues (was .errors in v3)
  result.error.issues.forEach((issue) => {
    const path = issue.path.join(".");
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  });

  return { success: false, errors };
}
