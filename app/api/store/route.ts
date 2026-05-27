/**
 * app/api/store/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Merchant Store Settings API
 *
 * GET  /api/store         → fetch authenticated merchant's store config
 * PATCH /api/store        → update store settings (partial update)
 *
 * PATCH body (all fields optional):
 * {
 *   name?:          string
 *   slug?:          string        (validated: unique + not reserved)
 *   whatsapp?:      string        (raw input — sanitized to E.164 server-side)
 *   countryHint?:   string        ("TR" | "SA" | "AE" | "EG" | ...)
 *   currency_code?: string        (ISO 4217)
 *   logo_url?:      string | null (Supabase Storage CDN URL)
 * }
 *
 * SECURITY:
 *   - store_id resolved from auth.uid() — never trusted from client
 *   - Slug uniqueness verified against DB (excluding own store)
 *   - Reserved slug list enforced
 *   - Phone sanitized to strict E.164 before write
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sanitizePhone } from "@/lib/whatsapp";
import { RESERVED_SLUGS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Validation schema (PATCH — all fields optional)
// ---------------------------------------------------------------------------

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

const patchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "اسم المتجر قصير جداً")
    .max(60, "اسم المتجر طويل جداً")
    .optional(),

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(4, "الرابط قصير جداً (4 أحرف على الأقل)")
    .max(48, "الرابط طويل جداً")
    .regex(
      SLUG_REGEX,
      "يجب أن يحتوي أحرف إنجليزية صغيرة وأرقام وشرطات (-) فقط"
    )
    .optional(),

  whatsapp: z.string().trim().min(7, "رقم الواتساب قصير").max(20).optional(),

  countryHint: z
    .enum(["TR", "SA", "AE", "EG", "IQ", "KW", "QA", "OM", "JO", "BH", "MA", "DZ", "TN", "LY"])
    .default("TR"),

  currency_code: z
    .enum(["TRY", "SAR", "AED", "EGP", "IQD", "USD", "EUR", "KWD", "QAR", "OMR", "JOD", "MAD"])
    .optional(),

  logo_url: z.string().url("رابط الشعار غير صالح").nullable().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok<T>(data: T, status = 200) {
  return Response.json({ data }, { status });
}

function err(message: string, status = 400, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

// ---------------------------------------------------------------------------
// GET — fetch current store for the authenticated merchant
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return err("غير مصرح لك", 401);

  const { data: store, error: storeErr } = await supabase
    .from("stores")
    .select("id, name, slug, whatsapp_e164, currency_code, logo_url, is_active, plan_type, trial_ends_at, subscription_status, subscription_ends_at")
    .eq("owner_id", user.id)
    .single();

  if (storeErr || !store) return err("المتجر غير موجود", 404);

  return ok(store);
}

// ---------------------------------------------------------------------------
// PATCH — update store settings (partial)
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return err("غير مصرح لك", 401);

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("بيانات غير صالحة", 400);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const issues: Record<string, string> = {};
    parsed.error.issues.forEach((i) => {
      const path = i.path.join(".");
      if (!issues[path]) issues[path] = i.message;
    });
    return err(Object.values(issues)[0] ?? "بيانات غير صحيحة", 422, issues);
  }

  const { name, slug, whatsapp, countryHint, currency_code, logo_url } =
    parsed.data;

  // ── Resolve merchant's store ─────────────────────────────────────────────────
  const { data: store, error: storeErr } = await supabase
    .from("stores")
    .select("id, slug")
    .eq("owner_id", user.id)
    .single();

  if (storeErr || !store) return err("المتجر غير موجود", 404);

  // ── Slug validation (only if slug is changing) ───────────────────────────────
  if (slug && slug !== store.slug) {
    // 1. Reserved system keywords
    if (RESERVED_SLUGS.has(slug)) {
      return err("هذا الرابط محجوز للنظام ولا يمكن استخدامه", 409);
    }

    // 2. Uniqueness check (exclude current store)
    const { data: conflict } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", slug)
      .neq("id", store.id)
      .maybeSingle();

    if (conflict) {
      return err("هذا الرابط مستخدم بالفعل. اختر رابطاً مختلفاً", 409);
    }
  }

  // ── Phone sanitization ────────────────────────────────────────────────────────
  let whatsapp_e164: string | undefined;
  if (whatsapp) {
    const sanitized = sanitizePhone(
      whatsapp,
      (countryHint ?? "TR") as Parameters<typeof sanitizePhone>[1]
    );
    if (!sanitized) {
      return err(
        "رقم الواتساب غير صالح. تأكد من إدخال رمز الدولة (مثل: 905321234567)",
        422
      );
    }
    whatsapp_e164 = sanitized;
  }

  // ── Build update payload ──────────────────────────────────────────────────────
  const updatePayload: Record<string, unknown> = {};
  if (name)             updatePayload.name          = name;
  if (slug)             updatePayload.slug          = slug;
  if (whatsapp_e164)    updatePayload.whatsapp_e164 = whatsapp_e164;
  if (currency_code)    updatePayload.currency_code = currency_code;
  if (logo_url !== undefined) updatePayload.logo_url = logo_url; // null is valid (clear logo)

  if (Object.keys(updatePayload).length === 0) {
    return err("لا توجد حقول للتحديث", 400);
  }

  // ── Persist ───────────────────────────────────────────────────────────────────
  const { data: updated, error: updateErr } = await supabase
    .from("stores")
    .update(updatePayload)
    .eq("id", store.id)
    .select("id, name, slug, whatsapp_e164, currency_code, logo_url")
    .single();

  if (updateErr) {
    console.error("[PATCH /api/store]", updateErr);
    return err("خطأ في الحفظ. حاول مجدداً", 500);
  }

  return ok(updated);
}
