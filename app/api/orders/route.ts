/**
 * app/api/orders/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Public Order Creation Endpoint
 *
 * POST /api/orders
 *
 * Body: {
 *   storeSlug:    string
 *   customerName: string
 *   items:        Array<{ productId: string; quantity: number }>
 * }
 *
 * Response: {
 *   data: {
 *     orderId:      string
 *     storePhone:   string   (E.164 — for wa.me redirect)
 *     storeName:    string
 *     currencyCode: string
 *     customerName: string
 *     items:        Array<{ name, quantity, unitPrice, lineTotal }>
 *     totalAmount:  number
 *   }
 * }
 *
 * SECURITY:
 *   - store_id is resolved server-side from slug (never trusted from client)
 *   - Unit prices are fetched from DB (never trusted from client)
 *   - Each product must belong to the resolved store and be active
 *   - Rate limiting handled by middleware (15 req/10 min per IP)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest } from "next/server";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import { parseProductOptions } from "@/lib/validations";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const orderSchema = z.object({
  storeSlug: z
    .string()
    .trim()
    .min(4, "المتجر غير صالح")
    .max(48, "المتجر غير صالح"),

  customerName: z
    .string()
    .trim()
    .min(1, "اسم الزبون مطلوب")
    .max(80, "الاسم طويل جداً"),

  customerPhone: z
    .string()
    .trim()
    .min(7, "رقم الهاتف غير صالح")
    .max(30, "رقم الهاتف طويل جداً"),

  items: z
    .array(
      z.object({
        productId: z.string().uuid("معرف المنتج غير صالح"),
        quantity:  z.number().int().min(1).max(999),
        selectedOptions: z
          .array(
            z.object({
              name: z.string(),
              value: z.string(),
              price: z.number().nullable().optional(),
            })
          )
          .optional(),
      })
    )
    .min(1, "السلة فارغة")
    .max(50, "عدد المنتجات كبير جداً"),
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
// GET — pending order count for dashboard overview
//   ?status=pending&count=true → returns { count: number }
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return err("غير مصرح لك", 401);

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!store) return err("المتجر غير موجود", 404);

  const status = request.nextUrl.searchParams.get("status");
  const isCount = request.nextUrl.searchParams.get("count") === "true";

  if (isCount && status === "pending") {
    const { count, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.id)
      .eq("fulfillment_status", "pending");

    if (error) return err("خطأ في جلب العدد", 500);
    return ok({ count: count ?? 0 });
  }

  return err("طلب غير صالح", 400);
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const supabase = createPublicClient();

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("بيانات الطلب غير صالحة", 400);
  }

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const path = issue.path.join(".");
      if (!errors[path]) errors[path] = issue.message;
    });
    return err("بيانات الطلب غير مكتملة", 422, errors);
  }

  const { storeSlug, customerName, customerPhone, items } = parsed.data;

  // ── Resolve store (server-side — source of truth for store_id & phone) ────
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, whatsapp_e164, currency_code, is_active")
    .eq("slug", storeSlug)
    .single();

  if (storeError || !store) {
    return err("المتجر غير موجود", 404);
  }
  if (!store.is_active) {
    return err("هذا المتجر غير نشط حالياً", 403);
  }

  // ── Resolve product prices from DB (never trust client prices) ────────────
  const productIds = items.map((i) => i.productId);

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, price, options, is_active")
    .in("id", productIds)
    .eq("store_id", store.id)  // Critical: ensure products belong to THIS store
    .eq("is_active", true);

  if (productsError) {
    console.error("[POST /api/orders] products fetch:", productsError);
    return err("خطأ في التحقق من المنتجات", 500);
  }

  // Verify every requested product exists and belongs to the store
  const productMap = new Map<string, { id: string; name: string; price: number; options: any; is_active: boolean }>(
    (products ?? []).map((p: any) => [p.id, p])
  );
  const missingProducts = productIds.filter((id) => !productMap.has(id));

  if (missingProducts.length > 0) {
    return err(
      "بعض المنتجات غير متوفرة أو تم حذفها. يرجى تحديث صفحة المتجر والمحاولة مجدداً",
      409
    );
  }

  // ── Build order line items with DB prices ─────────────────────────────────
  const lineItems = items.map((item) => {
    const product = productMap.get(item.productId) as { id: string; name: string; price: number; options: any; is_active: boolean };
    
    // Parse cumulative options pricing modifiers
    let resolvedPrice = product.price;
    const details: string[] = [];
    const { variants: productOptions } = parseProductOptions(product.options);

    if (item.selectedOptions && item.selectedOptions.length > 0) {
      item.selectedOptions.forEach((selOpt) => {
        const matchOpt = productOptions.find((o) => o.name === selOpt.name);
        if (matchOpt && matchOpt.hasCustomPrice) {
          const matchVal = matchOpt.values?.find((v: any) => v.value === selOpt.value);
          if (matchVal && matchVal.price != null) {
            resolvedPrice += matchVal.price; // Add cumulative modifier
          }
        }
        details.push(`${selOpt.name}: ${selOpt.value}`);
      });
    }

    const formattedName = product.name + (details.length > 0 ? ` (${details.join(", ")})` : "");

    return {
      product_id:   item.productId,
      product_name: formattedName,
      unit_price:   resolvedPrice,
      quantity:     item.quantity,
    };
  });

  const totalAmount = lineItems.reduce(
    (sum, li) => sum + li.unit_price * li.quantity,
    0
  );

  // ── Insert order ──────────────────────────────────────────────────────────
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      store_id:           store.id,
      customer_name:      customerName,
      customer_phone:     customerPhone,
      total_amount:       totalAmount,
      currency_code:      store.currency_code,
      payment_status:     "cod_pending",
      fulfillment_status: "pending",
      whatsapp_sent_at:   null,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("[POST /api/orders] order insert:", orderError);
    return err("حدث خطأ أثناء إنشاء الطلب. يرجى المحاولة مجدداً", 500);
  }

  // ── Insert order items (denormalized with store_id for flat RLS) ──────────
  const orderItemRows = lineItems.map((li) => ({
    order_id:     order.id,
    store_id:     store.id,  // Denormalized — avoids JOIN in RLS policy
    product_id:   li.product_id,
    product_name: li.product_name,
    unit_price:   li.unit_price,
    quantity:     li.quantity,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItemRows);

  if (itemsError) {
    console.error("[POST /api/orders] items insert:", itemsError);
    // Order was created — log but still return success so customer gets WA link
    // The merchant can see the order without items in a corner case
  }

  // ── Mark order as WhatsApp-sent ───────────────────────────────────────────
  await supabase
    .from("orders")
    .update({ whatsapp_sent_at: new Date().toISOString() })
    .eq("id", order.id);

  // ── Return data needed by client to build WA message ─────────────────────
  return ok(
    {
      orderId:      order.id,
      storePhone:   store.whatsapp_e164,
      storeName:    store.name,
      currencyCode: store.currency_code,
      customerName,
      totalAmount,
      items: lineItems.map((li) => ({
        name:      li.product_name,
        quantity:  li.quantity,
        unitPrice: li.unit_price,
        lineTotal: li.unit_price * li.quantity,
      })),
    },
    201
  );
}
