/**
 * app/api/admin/affiliates/[id]/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Super Admin Single Affiliate Partner API
 *
 * GET   /api/admin/affiliates/[id] → Get partner detail and referred stores
 * PATCH /api/admin/affiliates/[id] → Update partner details or reassign a store's referral
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateStoreRevenue } from "../route";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { authorized } = await verifyAdmin();
  if (!authorized) {
    return err("غير مصرح لك بالوصول", 403);
  }

  try {
    const adminDb = createAdminClient();

    // 1. Fetch partner details
    const { data: partner, error: partnerErr } = await adminDb
      .from("affiliate_partners" as any)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (partnerErr) throw partnerErr;
    if (!partner) {
      return err("المسوق غير موجود", 404);
    }

    // 2. Fetch referred stores
    const { data: stores, error: storesErr } = await adminDb
      .from("stores" as any)
      .select("id, name, owner_name, owner_email, plan_tier, plan_type, subscription_status, subscription_ends_at, affiliate_id, referral_code, referral_date, created_at")
      .eq("affiliate_id", id)
      .order("created_at", { ascending: false });

    if (storesErr) throw storesErr;

    // 3. Compute stats for each referred store
    const enrichedStores = (stores || []).map((store: any) => {
      const totalPayments = calculateStoreRevenue(store);
      const lifetimeCommission = totalPayments * 0.30;
      
      const price = store.plan_tier === "starter" ? 5 : (store.plan_tier === "pro" ? 15 : 0);
      const monthlyCommission = (store.subscription_status === "active" && store.plan_tier !== "free")
        ? price * 0.30
        : 0;

      return {
        ...store,
        totalPayments,
        lifetimeCommission,
        monthlyCommission
      };
    });

    // 4. Summarize statistics
    const totalReferredStores = enrichedStores.length;
    const activeStores = enrichedStores.filter((s: any) => s.subscription_status === "active").length;
    const paidStores = enrichedStores.filter((s: any) => s.subscription_status === "active" && s.plan_tier !== "free").length;
    const totalRevenueGenerated = enrichedStores.reduce((sum: number, s: any) => sum + s.totalPayments, 0);
    const estimatedCommission = totalRevenueGenerated * 0.30;
    const monthlyCommissionTotal = enrichedStores.reduce((sum: number, s: any) => sum + s.monthlyCommission, 0);

    return ok({
      partner: {
        ...partner,
        totalReferredStores,
        activeStores,
        paidStores,
        totalRevenueGenerated,
        estimatedCommission,
        monthlyCommission: monthlyCommissionTotal
      },
      stores: enrichedStores
    });
  } catch (e: any) {
    console.error("[GET /api/admin/affiliates/[id]]", e);
    return err("حدث خطأ أثناء تحميل تفاصيل المسوق", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { authorized } = await verifyAdmin();
  if (!authorized) {
    return err("غير مصرح لك بالوصول", 403);
  }

  try {
    const body = await request.json();
    const { action, storeId, newAffiliateId, name, email, notes, is_active } = body;
    const adminDb = createAdminClient();

    // ── CASE 1: Reassign store referral ──────────────────────────────────────
    if (action === "reassign_store") {
      if (!storeId) {
        return err("معرف المتجر مطلوب لإعادة التعيين", 400);
      }

      if (!newAffiliateId) {
        // Option A: Remove referral completely
        // Update store
        const { error: storeErr } = await adminDb
          .from("stores" as any)
          .update({
            affiliate_id: null,
            referral_code: null,
            referral_date: null
          })
          .eq("id", storeId);

        if (storeErr) throw storeErr;

        // Delete referral log
        const { error: refErr } = await adminDb
          .from("affiliate_referrals" as any)
          .delete()
          .eq("store_id", storeId);

        if (refErr) throw refErr;

        return ok({ success: true, message: "تمت إزالة الإحالة للمتجر بنجاح" });
      } else {
        // Option B: Reassign to another affiliate
        const { data: newPartner, error: partnerErr } = await adminDb
          .from("affiliate_partners" as any)
          .select("id, referral_code")
          .eq("id", newAffiliateId)
          .maybeSingle();

        if (partnerErr) throw partnerErr;
        if (!newPartner) {
          return err("المسوق الجديد غير موجود", 404);
        }

        // Update store
        const { error: storeErr } = await adminDb
          .from("stores" as any)
          .update({
            affiliate_id: newPartner.id,
            referral_code: newPartner.referral_code,
            referral_date: new Date().toISOString()
          })
          .eq("id", storeId);

        if (storeErr) throw storeErr;

        // Upsert referral log
        // First delete if exists, then insert to avoid conflicts
        await adminDb
          .from("affiliate_referrals" as any)
          .delete()
          .eq("store_id", storeId);

        const { error: refErr } = await adminDb
          .from("affiliate_referrals" as any)
          .insert({
            affiliate_id: newPartner.id,
            store_id: storeId,
            referral_code: newPartner.referral_code
          });

        if (refErr) throw refErr;

        return ok({ success: true, message: "تمت إعادة تعيين إحالة المتجر بنجاح" });
      }
    }

    // ── CASE 2: Update partner details ────────────────────────────────────────
    const updatePayload: any = {};
    if (name !== undefined) {
      if (!name.trim()) return err("الاسم لا يمكن أن يكون فارغاً", 400);
      updatePayload.name = name.trim();
    }
    if (email !== undefined) {
      updatePayload.email = email.trim() || null;
    }
    if (notes !== undefined) {
      updatePayload.notes = notes.trim() || null;
    }
    if (is_active !== undefined) {
      updatePayload.is_active = !!is_active;
    }

    const { data: updatedPartner, error: updateErr } = await adminDb
      .from("affiliate_partners" as any)
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (updateErr) throw updateErr;

    return ok(updatedPartner);
  } catch (e: any) {
    console.error("[PATCH /api/admin/affiliates/[id]]", e);
    return err("حدث خطأ أثناء تعديل بيانات المسوق", 500);
  }
}
