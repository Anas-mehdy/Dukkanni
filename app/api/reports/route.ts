/**
 * app/api/reports/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Analytics & Advanced Reporting API Route Handler
 *
 * GET /api/reports?range=today|week|month
 *
 * Security: store_id is ALWAYS resolved from auth.uid() server-side.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Response Helpers
// ---------------------------------------------------------------------------

function ok<T>(data: T) {
  return Response.json({ data }, { status: 200 });
}

function err(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

/** Resolves the store that belongs to the currently authenticated user. */
async function getAuthenticatedStore(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { store: null, userId: null, authErr: true };
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, currency_code")
    .eq("owner_id", user.id)
    .single();

  if (storeError || !store) {
    return { store: null, userId: user.id, authErr: false };
  }

  return { store, userId: user.id, authErr: false };
}

// ---------------------------------------------------------------------------
// GET — Retrieve analytical reports
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // 1. Authenticate user and resolve store
  const { store, authErr } = await getAuthenticatedStore(supabase);

  if (authErr) {
    return err("غير مصرح بالدخول. يرجى تسجيل الدخول مجدداً.", 401);
  }
  if (!store) {
    return err("لم يتم العثور على المتجر الخاص بك. يرجى إتمام الإعداد.", 404);
  }

  // 2. Parse range query parameter
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? "week";

  // Calculate start boundary date (UTC)
  const now = new Date();
  const startDate = new Date();

  if (range === "today") {
    startDate.setHours(0, 0, 0, 0);
  } else if (range === "week") {
    startDate.setDate(now.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
  } else if (range === "month") {
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
  } else {
    // Default to last 7 days
    startDate.setDate(now.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
  }

  try {
    // 3. Query historical orders in time window
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        customer_name,
        total_amount,
        currency_code,
        fulfillment_status,
        created_at,
        order_items (
          id,
          product_id,
          product_name,
          unit_price,
          quantity
        )
      `)
      .eq("store_id", store.id)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (ordersError) {
      return err("حدث خطأ أثناء جلب تفاصيل المبيعات.", 500);
    }

    const safeOrders = orders ?? [];

    // 4. Calculate core macro metrics
    const totalOrdersCount = safeOrders.length;
    const totalCompletedFulfillments = safeOrders.filter(
      (o: any) => o.fulfillment_status === "delivered"
    ).length;

    const totalRevenue = safeOrders
      .filter((o: any) => o.fulfillment_status === "delivered")
      .reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);

    const deliveryRate = totalOrdersCount > 0 
      ? Math.round((totalCompletedFulfillments / totalOrdersCount) * 100)
      : 0;

    // 5. Aggregate top-selling products by quantity
    const productMap = new Map<
      string,
      { name: string; quantity: number; revenue: number; product_id: string | null }
    >();

    safeOrders.forEach((order: any) => {
      // Exclude cancelled/refunded orders from top product ranking if they exist
      if (order.fulfillment_status === "cancelled") return;

      (order.order_items ?? []).forEach((item: any) => {
        const key = item.product_id || item.product_name;
        const existing = productMap.get(key);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += Number(item.unit_price) * item.quantity;
        } else {
          productMap.set(key, {
            name: item.product_name,
            quantity: item.quantity,
            revenue: Number(item.unit_price) * item.quantity,
            product_id: item.product_id,
          });
        }
      });
    });

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity);

    // 6. Map product images for visual excellence
    const productIds = topProducts
      .map((p) => p.product_id)
      .filter((id): id is string => !!id);

    const imageMap = new Map<string, string>();

    if (productIds.length > 0) {
      const { data: storeProducts } = await supabase
        .from("products")
        .select("id, image_url")
        .in("id", productIds);

      if (storeProducts) {
        storeProducts.forEach((p: any) => {
          if (p.image_url) {
            imageMap.set(p.id, p.image_url);
          }
        });
      }
    }

    const topProductsWithImages = topProducts.map((p) => ({
      id: p.product_id,
      name: p.name,
      quantity: p.quantity,
      revenue: p.revenue,
      imageUrl: p.product_id ? (imageMap.get(p.product_id) ?? null) : null,
    }));

    // 7. Structure orders listing for client export
    const exportOrders = safeOrders.map((o: any) => ({
      id: o.id,
      customerName: o.customer_name,
      createdAt: o.created_at,
      totalAmount: Number(o.total_amount),
      fulfillmentStatus: o.fulfillment_status,
      currencyCode: o.currency_code,
    }));

    return ok({
      metrics: {
        totalRevenue,
        totalOrdersCount,
        totalCompletedFulfillments,
        deliveryRate,
        currencyCode: store.currency_code,
      },
      topProducts: topProductsWithImages,
      orders: exportOrders,
    });
  } catch (error) {
    return err("حدث خطأ غير متوقع أثناء معالجة التقارير.", 500);
  }
}
