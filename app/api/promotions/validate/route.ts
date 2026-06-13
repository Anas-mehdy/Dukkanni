/**
 * app/api/promotions/validate/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Public Coupon Validation Endpoint
 *
 * POST /api/promotions/validate
 *
 * Body: {
 *   storeSlug: string
 *   code:      string
 *   subtotal:  number
 * }
 *
 * Response: {
 *   valid:          boolean
 *   promotionId?:   string
 *   code?:          string
 *   discountType?:  "percentage" | "fixed"
 *   discountValue?: number
 *   discountAmount?: number
 *   message?:       string
 * }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok<T>(data: T, status = 200) {
  return Response.json({ data }, { status });
}

function err(message: string, status = 400, code = "INVALID") {
  return Response.json({ error: message, code }, { status });
}

export async function POST(request: NextRequest) {
  const supabase = createPublicClient();

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: any;
  try {
    body = await request.json();
  } catch {
    return err("بيانات غير صالحة", 400);
  }

  const { storeSlug, code, subtotal } = body;

  if (!storeSlug || typeof storeSlug !== "string") {
    return err("اسم المتجر مطلوب", 400, "MISSING_STORE");
  }

  if (!code || typeof code !== "string" || code.trim() === "") {
    return err("رمز الكوبون مطلوب", 400, "MISSING_CODE");
  }

  const cleanCode = code.trim().toUpperCase();
  const parsedSubtotal = Number(subtotal || 0);

  // ── Fetch store ───────────────────────────────────────────────────────────
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, is_active")
    .eq("slug", storeSlug)
    .single();

  if (storeError || !store) {
    return err("المتجر غير موجود", 404, "STORE_NOT_FOUND");
  }

  if (!store.is_active) {
    return err("المتجر غير نشط حالياً", 403, "STORE_INACTIVE");
  }

  // ── Fetch promotion ───────────────────────────────────────────────────────
  const { data: promo, error: promoError } = await supabase
    .from("promotions")
    .select("id, code, name, discount_type, discount_value, start_date, end_date, is_active, max_uses")
    .eq("store_id", store.id)
    .eq("code", cleanCode)
    .maybeSingle();

  if (promoError || !promo) {
    return err("كود الخصم غير صالح أو منتهي الصلاحية", 404, "COUPON_NOT_FOUND");
  }

  // ── Validate active status ────────────────────────────────────────────────
  if (!promo.is_active) {
    return err("هذا الكوبون غير نشط حالياً", 400, "COUPON_INACTIVE");
  }

  // ── Validate dates ────────────────────────────────────────────────────────
  const now = new Date();
  const startDate = new Date(promo.start_date);
  const endDate = new Date(promo.end_date);

  if (now < startDate) {
    return err("هذا الكوبون لم يبدأ تفعيله بعد", 400, "COUPON_NOT_STARTED");
  }

  if (now > endDate) {
    return err("هذا الكوبون منتهي الصلاحية", 400, "COUPON_EXPIRED");
  }

  // ── Validate usage limits ─────────────────────────────────────────────────
  if (promo.max_uses != null) {
    // Count orders in DB that used this promotion
    const { count, error: countError } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("promotion_id", promo.id);

    if (countError) {
      console.error("[POST /api/promotions/validate] countUses:", countError);
      return err("فشل التحقق من حدود استخدام الكوبون", 500, "LIMIT_CHECK_FAILED");
    }

    const currentUses = count ?? 0;
    if (currentUses >= promo.max_uses) {
      return err("لقد استنفد هذا الكوبون الحد الأقصى للاستخدام", 400, "COUPON_LIMIT_REACHED");
    }
  }

  // ── Calculate discount amount ─────────────────────────────────────────────
  let discountAmount = 0;
  if (promo.discount_type === "percentage") {
    discountAmount = (parsedSubtotal * promo.discount_value) / 100;
  } else if (promo.discount_type === "fixed") {
    discountAmount = Math.min(parsedSubtotal, promo.discount_value);
  }

  // Round to 2 decimal places
  discountAmount = Math.round((discountAmount + Number.EPSILON) * 100) / 100;

  return ok({
    valid: true,
    promotionId: promo.id,
    code: promo.code,
    name: promo.name,
    discountType: promo.discount_type,
    discountValue: promo.discount_value,
    discountAmount,
  });
}
