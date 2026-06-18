/**
 * app/api/admin/affiliates/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Super Admin Affiliate Partners API
 *
 * GET  /api/admin/affiliates → List all partners with aggregated stats
 * POST /api/admin/affiliates → Create a new affiliate partner
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function err(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function ok<T>(data: T) {
  return Response.json({ data });
}

// Verify that the user is the Super Admin
async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmail = process.env.SUPER_ADMIN_EMAIL;

  if (!user || !adminEmail || user.email !== adminEmail) {
    return { authorized: false };
  }
  return { authorized: true };
}

// Helper function to calculate simulated revenue for a referred store
export function calculateStoreRevenue(store: any) {
  if (store.plan_tier === "free" || !store.plan_tier) return 0;
  
  const price = store.plan_tier === "starter" ? 5 : (store.plan_tier === "pro" ? 15 : 0);
  if (price === 0) return 0;

  const regDate = new Date(store.referral_date || store.created_at);
  const now = new Date();

  if (store.subscription_status === "active") {
    if (store.plan_type === "yearly") {
      const msElapsed = now.getTime() - regDate.getTime();
      const years = Math.max(1, Math.ceil(msElapsed / (365 * 24 * 60 * 60 * 1000)));
      return price * 12 * years;
    } else {
      const msElapsed = now.getTime() - regDate.getTime();
      const months = Math.max(1, Math.ceil(msElapsed / (30 * 24 * 60 * 60 * 1000)));
      return price * months;
    }
  } else {
    // expired or suspended
    if (store.subscription_ends_at) {
      const endDate = new Date(store.subscription_ends_at);
      const msElapsed = endDate.getTime() - regDate.getTime();
      if (msElapsed <= 0) return price; // Min 1 month payment if they had it
      
      if (store.plan_type === "yearly") {
        const years = Math.max(1, Math.ceil(msElapsed / (365 * 24 * 60 * 60 * 1000)));
        return price * 12 * years;
      } else {
        const months = Math.max(1, Math.ceil(msElapsed / (30 * 24 * 60 * 60 * 1000)));
        return price * months;
      }
    }
    return price; // Fallback to 1 month payment
  }
}

export async function GET() {
  const { authorized } = await verifyAdmin();
  if (!authorized) {
    return err("غير مصرح لك بالوصول", 403);
  }

  try {
    const adminDb = createAdminClient();

    // 1. Fetch all partners
    const { data: partners, error: partnersErr } = await adminDb
      .from("affiliate_partners" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (partnersErr) throw partnersErr;

    // 2. Fetch all stores with referral/affiliate linkage
    const { data: stores, error: storesErr } = await adminDb
      .from("stores" as any)
      .select("id, name, owner_name, owner_email, plan_tier, plan_type, subscription_status, subscription_ends_at, affiliate_id, referral_code, referral_date, created_at");

    if (storesErr) throw storesErr;

    // 3. Compute stats for each partner in-memory
    const enrichedPartners = (partners || []).map((partner: any) => {
      const partnerStores = (stores || []).filter((s: any) => s.affiliate_id === partner.id);
      
      const totalReferredStores = partnerStores.length;
      const activeStores = partnerStores.filter((s: any) => s.subscription_status === "active").length;
      const paidStores = partnerStores.filter((s: any) => s.subscription_status === "active" && s.plan_tier !== "free").length;
      
      const totalRevenueGenerated = partnerStores.reduce((sum: number, s: any) => {
        return sum + calculateStoreRevenue(s);
      }, 0);
      
      const estimatedCommission = totalRevenueGenerated * 0.30;

      // Compute monthly commission (active paid stores commission rate for current month)
      const monthlyCommission = partnerStores
        .filter((s: any) => s.subscription_status === "active" && s.plan_tier !== "free")
        .reduce((sum: number, s: any) => {
          const price = s.plan_tier === "starter" ? 5 : (s.plan_tier === "pro" ? 15 : 0);
          return sum + (price * 0.30);
        }, 0);

      return {
        ...partner,
        totalReferredStores,
        activeStores,
        paidStores,
        totalRevenueGenerated,
        estimatedCommission,
        monthlyCommission
      };
    });

    return ok(enrichedPartners);
  } catch (e: any) {
    console.error("[GET /api/admin/affiliates]", e);
    return err("حدث خطأ أثناء تحميل الشركاء", 500);
  }
}

export async function POST(request: NextRequest) {
  const { authorized } = await verifyAdmin();
  if (!authorized) {
    return err("غير مصرح لك بالوصول", 403);
  }

  try {
    const body = await request.json();
    const { name, email, referral_code, notes } = body;

    if (!name || !name.trim()) {
      return err("الاسم مطلوب", 400);
    }
    if (!referral_code || !referral_code.trim()) {
      return err("كود الإحالة مطلوب", 400);
    }

    const cleanCode = referral_code.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (!cleanCode) {
      return err("كود الإحالة غير صالح (يجب أن يحتوي أحرف إنجليزية وأرقام فقط)", 400);
    }

    const adminDb = createAdminClient();

    // Check code uniqueness
    const { data: existing } = await adminDb
      .from("affiliate_partners" as any)
      .select("id")
      .eq("referral_code", cleanCode)
      .maybeSingle();

    if (existing) {
      return err("كود الإحالة هذا مستخدم بالفعل لمسوق آخر", 400);
    }

    // Insert partner
    const { data: partner, error } = await adminDb
      .from("affiliate_partners" as any)
      .insert({
        name: name.trim(),
        email: email?.trim() || null,
        referral_code: cleanCode,
        notes: notes?.trim() || null,
        is_active: true
      })
      .select("*")
      .single();

    if (error) throw error;

    return ok(partner);
  } catch (e: any) {
    console.error("[POST /api/admin/affiliates]", e);
    return err("حدث خطأ أثناء إنشاء الشريك", 500);
  }
}
