/**
 * app/api/store/setup/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Initial Store Setup (Onboarding)
 *
 * POST /api/store/setup
 *
 * Creates the merchant's store record for the first time.
 * Called only from the onboarding wizard when no store exists yet.
 *
 * Body:
 * {
 *   name:          string   (2–60 chars)
 *   slug:          string   (4–48 chars, unique, not reserved)
 *   whatsapp:      string   (raw phone — sanitized to E.164)
 *   countryHint?:  string   (default: "TR")
 *   currency_code?: string  (default: "TRY")
 * }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sanitizePhone } from "@/lib/whatsapp";
import { RESERVED_SLUGS } from "@/lib/constants";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

const setupSchema = z.object({
  name: z.string().trim().min(2, "اسم المتجر قصير جداً").max(60),

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(4, "الرابط قصير جداً")
    .max(48, "الرابط طويل جداً")
    .regex(SLUG_REGEX, "الرابط غير صالح"),

  whatsapp: z.string().trim().min(7, "رقم الواتساب غير صالح").max(20),

  countryHint: z
    .enum(["TR", "SA", "AE", "EG", "IQ", "KW", "QA", "OM", "JO", "BH", "MA", "DZ", "TN", "LY"])
    .default("TR"),

  currency_code: z
    .enum(["TRY", "SAR", "AED", "EGP", "IQD", "USD", "EUR", "KWD", "QAR", "OMR", "JOD", "MAD", "SYP"])
    .default("TRY"),
});

function ok<T>(data: T, status = 200) {
  return Response.json({ data }, { status });
}
function err(message: string, status = 400, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return err("غير مصرح لك", 401);

  // ── Ensure store doesn't already exist ─────────────────────────────────────
  const { data: existing } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existing) {
    return err("المتجر موجود بالفعل. استخدم PATCH /api/store لتعديله", 409);
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("بيانات غير صالحة", 400);
  }

  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) {
    const issues: Record<string, string> = {};
    parsed.error.issues.forEach((i) => {
      const path = i.path.join(".");
      if (!issues[path]) issues[path] = i.message;
    });
    return err(Object.values(issues)[0] ?? "بيانات غير مكتملة", 422, issues);
  }

  const { name, slug, whatsapp, countryHint, currency_code } = parsed.data;

  // ── Slug: reserved + uniqueness ────────────────────────────────────────────
  if (RESERVED_SLUGS.has(slug)) {
    return err("هذا الرابط محجوز للنظام", 409);
  }

  const { data: slugConflict } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (slugConflict) {
    return err("هذا الرابط مستخدم مسبقاً. اختر رابطاً مختلفاً", 409);
  }

  // ── Phone sanitization ─────────────────────────────────────────────────────
  const whatsapp_e164 = sanitizePhone(
    whatsapp,
    countryHint as Parameters<typeof sanitizePhone>[1]
  );
  if (!whatsapp_e164) {
    return err(
      "رقم الواتساب غير صالح. أدخل رقمك مع رمز الدولة (مثال: 905321234567)",
      422
    );
  }

  // ── Read referral cookie and verify partner ──────────────────────────────
  let affiliateIdToLink: string | null = null;
  let referralCodeToLink: string | null = null;

  try {
    const cookieStore = await cookies();
    const cookieRef = cookieStore.get("dukkanni_referral")?.value;
    if (cookieRef) {
      const adminDb = createAdminClient();
      const { data: partner } = await adminDb
        .from("affiliate_partners" as any)
        .select("id, referral_code")
        .eq("referral_code", cookieRef)
        .eq("is_active", true)
        .maybeSingle();

      if (partner) {
        affiliateIdToLink = partner.id;
        referralCodeToLink = partner.referral_code;
      }
    }
  } catch (e) {
    console.error("Error checking referral cookie during registration:", e);
  }

  // ── Create store ───────────────────────────────────────────────────────────
  const insertPayload: any = {
    owner_id:     user.id,
    name,
    slug,
    whatsapp_e164,
    currency_code,
    is_active:    true,
    owner_email:  user.email,
    owner_name:   user.user_metadata?.full_name || user.email,
  };

  if (affiliateIdToLink) {
    insertPayload.affiliate_id = affiliateIdToLink;
    insertPayload.referral_code = referralCodeToLink;
    insertPayload.referral_date = new Date().toISOString();
  }

  const { data: store, error: insertErr } = await supabase
    .from("stores" as any)
    .insert(insertPayload)
    .select("id, name, slug, whatsapp_e164, currency_code")
    .single();

  if (insertErr || !store) {
    console.error("[POST /api/store/setup]", insertErr);
    return err("خطأ في إنشاء المتجر. حاول مجدداً", 500);
  }

  // ── Create affiliate referral log if linked ───────────────────────────────
  if (affiliateIdToLink && referralCodeToLink) {
    try {
      const adminDb = createAdminClient();
      await adminDb
        .from("affiliate_referrals" as any)
        .insert({
          affiliate_id: affiliateIdToLink,
          store_id: store.id,
          referral_code: referralCodeToLink,
        });
    } catch (refErr) {
      console.error("Error inserting affiliate referral log:", refErr);
    }
  }

  return ok(store, 201);
}
