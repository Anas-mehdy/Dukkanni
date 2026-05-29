/**
 * app/api/store/analytics/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Secure Analytics Fetch API
 *
 * GET /api/store/analytics   → returns views and clicks count for calendar month
 *
 * Security:
 *   - store_id resolved from auth.uid() — never trusted from client
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from "@/lib/supabase/server";

function ok<T>(data: T) {
  return Response.json({ data }, { status: 200 });
}

function err(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return err("غير مصرح لك", 401);

  // 1. Resolve merchant's store
  const { data: store, error: storeErr } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (storeErr || !store) return err("المتجر غير موجود", 404);

  // 2. Calculate start of current calendar month (boundaries)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // 3. Query views count
  const { count: viewsCount, error: viewsErr } = await supabase
    .from("store_analytics")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store.id)
    .eq("event_type", "view")
    .gte("created_at", startOfMonth.toISOString());

  // 4. Query clicks count
  const { count: clicksCount, error: clicksErr } = await supabase
    .from("store_analytics")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store.id)
    .eq("event_type", "whatsapp_click")
    .gte("created_at", startOfMonth.toISOString());

  if (viewsErr || clicksErr) {
    console.error("[GET /api/store/analytics]", viewsErr || clicksErr);
    return err("خطأ أثناء جلب إحصائيات المتجر", 500);
  }

  return ok({
    views: viewsCount ?? 0,
    clicks: clicksCount ?? 0,
  });
}
