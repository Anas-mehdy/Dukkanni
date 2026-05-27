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
    const { data: stores, error } = await adminDb
      .from("stores")
      .select(`
        id,
        name,
        slug,
        whatsapp_e164,
        plan_type,
        subscription_status,
        trial_ends_at,
        subscription_ends_at,
        owner_id,
        owner_email,
        owner_name
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const enrichedStores = (stores || []).map((s: any) => {
      return {
        ...s,
        owner_email: s.owner_email || "غير متوفر",
        owner_phone: s.whatsapp_e164 || "غير متوفر",
        owner_name: s.owner_name || "غير متوفر",
      };
    });

    return ok({ stores: enrichedStores });
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
    const { storeId, action } = body;

    if (!storeId || !["monthly", "yearly", "suspend"].includes(action)) {
      return err("معاملات غير صالحة", 400);
    }

    const now = new Date();
    let plan_type: string | undefined;
    let subscription_status: string;
    let subscription_ends_at: string | null = null;

    if (action === "monthly") {
      plan_type = "monthly";
      subscription_status = "active";
      const ends = new Date();
      ends.setDate(now.getDate() + 30);
      subscription_ends_at = ends.toISOString();
    } else if (action === "yearly") {
      plan_type = "yearly";
      subscription_status = "active";
      const ends = new Date();
      ends.setDate(now.getDate() + 365);
      subscription_ends_at = ends.toISOString();
    } else {
      // suspend
      subscription_status = "suspended";
    }

    const updatePayload: Record<string, any> = {
      subscription_status,
    };

    if (plan_type) {
      updatePayload.plan_type = plan_type;
    }
    if (action !== "suspend") {
      updatePayload.subscription_ends_at = subscription_ends_at;
    }

    // Use the privileged admin client to update the target store, bypassing RLS
    const adminDb = createAdminClient();
    const { data: updated, error } = await adminDb
      .from("stores")
      .update(updatePayload)
      .eq("id", storeId)
      .select("id, name, plan_type, subscription_status")
      .single();

    if (error) throw error;

    return ok({ success: true, store: updated });
  } catch (e: any) {
    console.error("[PATCH /api/admin/subscriptions]", e);
    return err("خطأ أثناء تحديث بيانات الاشتراك", 500);
  }
}
