/**
 * app/api/store/plan-usage/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Plan Usage Statistics API
 *
 * GET /api/store/plan-usage  → returns limits and usage for the current merchant's store.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from "@/lib/supabase/server";
import { getStorePlanUsage } from "@/lib/plans";

function ok<T>(data: T, status = 200) {
  return Response.json({ data }, { status });
}

function err(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return err("غير مصرح لك", 401);

  const { data: store, error: storeErr } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (storeErr || !store) return err("المتجر غير موجود", 404);

  try {
    const planUsage = await getStorePlanUsage(supabase, store.id);
    return ok(planUsage);
  } catch (error) {
    console.error("[GET /api/store/plan-usage]", error);
    return err("حدث خطأ أثناء جلب إحصائيات الباقة", 500);
  }
}
