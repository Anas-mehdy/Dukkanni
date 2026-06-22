/**
 * app/api/admin/subscriptions/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Super Admin Operations API
 *
 * GET   /api/admin/subscriptions → Retrieve all stores & KPI metrics
 * PATCH /api/admin/subscriptions → Perform manual tier action (monthly / yearly / suspend)
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

// Helper to verify Super Admin Auth using the standard secure client
async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmail = process.env.SUPER_ADMIN_EMAIL;

  if (!user || !adminEmail || user.email !== adminEmail) {
    return { authorized: false };
  }

  return { authorized: true };
}

export async function GET() {
  const { authorized } = await verifyAdmin();
  if (!authorized) {
    return err("غير مصرح لك بالوصول", 403);
  }

  try {
    // Use the privileged admin client to select all stores, bypassing standard merchant RLS policies
    const adminDb = createAdminClient();
    
    // 1. Fetch all stores
    const { data: stores, error } = await adminDb
      .from("stores")
      .select(`
        id,
        name,
        slug,
        whatsapp_e164,
        plan_type,
        plan_tier,
        subscription_status,
        trial_ends_at,
        subscription_ends_at,
        owner_id,
        owner_email,
        owner_name,
        products (
          id
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 2. Fetch total page view visitors count platform-wide
    const { count: totalViews, error: viewsError } = await adminDb
      .from("store_analytics")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "view");

    if (viewsError) throw viewsError;

    // 3. Fetch total WhatsApp clicks count platform-wide
    const { count: totalClicks, error: clicksError } = await adminDb
      .from("store_analytics")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "whatsapp_click");

    if (clicksError) throw clicksError;

    // 4. Fetch platform registration funnel metrics
    let funnelStats = {
      register_viewed: 0,
      step1_started: 0,
      step1_completed: 0,
      step2_started: 0,
      register_success: 0
    };

    try {
      const [
        rViewed,
        rStep1Start,
        rStep1End,
        rStep2Start,
        rSuccess
      ] = await Promise.all([
        adminDb.rpc("get_unique_funnel_count", { target_event: "register_viewed" }),
        adminDb.rpc("get_unique_funnel_count", { target_event: "step1_started" }),
        adminDb.rpc("get_unique_funnel_count", { target_event: "step1_completed" }),
        adminDb.rpc("get_unique_funnel_count", { target_event: "step2_started" }),
        adminDb.rpc("get_unique_funnel_count", { target_event: "register_success" })
      ]);

      funnelStats = {
        register_viewed: Number(rViewed.data ?? 0),
        step1_started: Number(rStep1Start.data ?? 0),
        step1_completed: Number(rStep1End.data ?? 0),
        step2_started: Number(rStep2Start.data ?? 0),
        register_success: Number(rSuccess.data ?? 0)
      };
    } catch (e) {
      console.error("Funnel aggregation RPC error, falling back:", e);
    }

    const enrichedStores = (stores || []).map((s: any) => {
      return {
        ...s,
        owner_email: s.owner_email || "غير متوفر",
        owner_phone: s.whatsapp_e164 || "غير متوفر",
        owner_name: s.owner_name || "غير متوفر",
        products_count: s.products ? s.products.length : 0,
      };
    });

    return ok({ 
      stores: enrichedStores,
      totalViews: totalViews ?? 0,
      totalClicks: totalClicks ?? 0,
      funnelStats
    });
  } catch (e: any) {
    console.error("[GET /api/admin/subscriptions]", e);
    return err("خطأ أثناء تحميل البيانات", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const { authorized } = await verifyAdmin();
  if (!authorized) {
    return err("غير مصرح لك بالوصول", 403);
  }

  try {
    const body = await request.json();
    const { storeId, action, planTier } = body;

    if (!storeId || !["monthly", "yearly", "suspend", "activate", "set_plan_tier"].includes(action)) {
      return err("معاملات غير صالحة", 400);
    }

    const updatePayload: Record<string, any> = {};

    if (action === "set_plan_tier") {
      if (!["free", "starter", "pro"].includes(planTier)) {
        return err("فئة الخطة غير صالحة", 400);
      }
      updatePayload.plan_tier = planTier;
      // When explicitly setting a plan tier, ensure store is active and ends is set to null (indefinite admin override)
      updatePayload.subscription_status = "active";
      updatePayload.subscription_ends_at = null;
    } else if (action === "monthly") {
      updatePayload.plan_type = "monthly";
      updatePayload.subscription_status = "active";
      const ends = new Date();
      ends.setDate(ends.getDate() + 30);
      updatePayload.subscription_ends_at = ends.toISOString();
    } else if (action === "yearly") {
      updatePayload.plan_type = "yearly";
      updatePayload.subscription_status = "active";
      const ends = new Date();
      ends.setDate(ends.getDate() + 365);
      updatePayload.subscription_ends_at = ends.toISOString();
    } else if (action === "suspend") {
      updatePayload.subscription_status = "suspended";
    } else if (action === "activate") {
      updatePayload.subscription_status = "active";
      updatePayload.subscription_ends_at = null;
    }

    // Use the privileged admin client to update the target store, bypassing RLS
    const adminDb = createAdminClient();
    const { data: updated, error } = await adminDb
      .from("stores")
      .update(updatePayload)
      .eq("id", storeId)
      .select("id, name, plan_type, plan_tier, subscription_status")
      .single();

    if (error) throw error;

    return ok({ success: true, store: updated });
  } catch (e: any) {
    console.error("[PATCH /api/admin/subscriptions]", e);
    return err("خطأ أثناء تحديث بيانات الاشتراك", 500);
  }
}
