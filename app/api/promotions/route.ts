/**
 * app/api/promotions/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Promotions & Coupons CRUD API Route Handler
 *
 * GET    /api/promotions          → list all promotions and coupons with analytics
 * POST   /api/promotions          → create a new promotion or coupon code
 * PUT    /api/promotions?id=<id>  → update a promotion or coupon code
 * DELETE /api/promotions?id=<id>  → delete a promotion or coupon code
 *
 * Security: store_id is resolved from auth.uid() server-side (enforced by RLS).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { promotionSchema, promotionUpdateSchema, parseFormData } from "@/lib/validations";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok<T>(data: T, status = 200) {
  return Response.json({ data }, { status });
}

function err(message: string, status = 400, details?: unknown) {
  return Response.json({ error: message, details }, { status });
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
// GET — list promotions with stats
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = await createClient();
  const { store, authErr } = await getAuthenticatedStore(supabase);

  if (authErr) return err("غير مصرح لك", 401);
  if (!store)  return err("المتجر غير موجود", 404);

  // Fetch all promotions, with their nested orders that were placed using this promotion.
  // This allows calculating analytics (uses, discount total, generated orders) on the fly.
  const { data: promotions, error } = await supabase
    .from("promotions")
    .select(`
      id,
      store_id,
      name,
      code,
      discount_type,
      discount_value,
      start_date,
      end_date,
      is_active,
      max_uses,
      target_type,
      target_id,
      created_at,
      orders (
        id,
        customer_name,
        total_amount,
        discount_amount,
        created_at
      )
    `)
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/promotions]", error);
    return err("حدث خطأ أثناء جلب العروض والكوبونات", 500);
  }

  // Calculate usage and discount statistics per promotion
  const promotionsWithStats = (promotions ?? []).map((p: any) => {
    const orders = p.orders ?? [];
    const totalUses = orders.length;
    const totalDiscountAmount = orders.reduce((sum: number, o: any) => sum + Number(o.discount_amount || 0), 0);
    
    // Sort generated orders by created_at DESC
    const sortedOrders = orders.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
      id: p.id,
      store_id: p.store_id,
      name: p.name,
      code: p.code,
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      start_date: p.start_date,
      end_date: p.end_date,
      is_active: p.is_active,
      max_uses: p.max_uses,
      target_type: p.target_type,
      target_id: p.target_id,
      created_at: p.created_at,
      stats: {
        totalUses,
        totalDiscountAmount,
        orders: sortedOrders,
      }
    };
  });

  return ok(promotionsWithStats);
}

// ---------------------------------------------------------------------------
// POST — create promotion/coupon
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { store, authErr } = await getAuthenticatedStore(supabase);

  if (authErr) return err("غير مصرح لك", 401);
  if (!store)  return err("المتجر غير موجود", 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("بيانات غير صالحة", 400);
  }

  const parsed = parseFormData(promotionSchema, body);
  if (!parsed.success) {
    return err("بيانات العرض غير صحيحة", 422, parsed.errors);
  }

  const {
    name,
    code,
    discount_type,
    discount_value,
    start_date,
    end_date,
    is_active,
    max_uses,
    target_type,
    target_id,
  } = parsed.data;

  // Clean code: uppercase, trim, and set to null if empty string
  const cleanCode = code && code.trim() !== "" ? code.trim().toUpperCase() : null;

  // Check unique coupon code constraint in application layer as a backup to SQL constraint
  if (cleanCode) {
    const { data: existingCode } = await supabase
      .from("promotions")
      .select("id")
      .eq("store_id", store.id)
      .eq("code", cleanCode)
      .maybeSingle();

    if (existingCode) {
      return err("كود الخصم هذا مستخدم بالفعل في عرض آخر", 409, { code: "رمز الكوبون هذا مكرر ومستخدم بالفعل" });
    }
  }

  const { data: promotion, error } = await supabase
    .from("promotions")
    .insert({
      store_id: store.id,
      name,
      code: cleanCode,
      discount_type,
      discount_value,
      start_date,
      end_date,
      is_active,
      max_uses,
      target_type,
      target_id: target_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/promotions]", error);
    return err("حدث خطأ أثناء إنشاء العرض", 500);
  }

  return ok(promotion, 201);
}

// ---------------------------------------------------------------------------
// PUT — update promotion/coupon
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { store, authErr } = await getAuthenticatedStore(supabase);

  if (authErr) return err("غير مصرح لك", 401);
  if (!store)  return err("المتجر غير موجود", 404);

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return err("معرّف العرض مطلوب", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("بيانات غير صالحة", 400);
  }

  const parsed = parseFormData(promotionUpdateSchema, body);
  if (!parsed.success) {
    return err("بيانات العرض غير صحيحة", 422, parsed.errors);
  }

  // Check if updating code and code is already taken in another promotion
  if (parsed.data.code !== undefined) {
    const cleanCode = parsed.data.code && parsed.data.code.trim() !== "" ? parsed.data.code.trim().toUpperCase() : null;
    if (cleanCode) {
      const { data: existingCode } = await supabase
        .from("promotions")
        .select("id")
        .eq("store_id", store.id)
        .eq("code", cleanCode)
        .neq("id", id)
        .maybeSingle();

      if (existingCode) {
        return err("كود الخصم هذا مستخدم بالفعل في عرض آخر", 409, { code: "رمز الكوبون هذا مكرر ومستخدم بالفعل" });
      }
    }
  }

  // Normalize code update if present
  const updateData: any = { ...parsed.data };
  if (updateData.code !== undefined) {
    updateData.code = updateData.code && updateData.code.trim() !== "" ? updateData.code.trim().toUpperCase() : null;
  }
  if (updateData.target_id === "") {
    updateData.target_id = null;
  }

  // Update promotion
  const { data: promotion, error } = await supabase
    .from("promotions")
    .update(updateData)
    .eq("id", id)
    .eq("store_id", store.id) // double check RLS
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") return err("العرض غير موجود", 404);
    console.error("[PUT /api/promotions]", error);
    return err("حدث خطأ أثناء تحديث العرض", 500);
  }

  return ok(promotion);
}

// ---------------------------------------------------------------------------
// DELETE — delete promotion/coupon
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { store, authErr } = await getAuthenticatedStore(supabase);

  if (authErr) return err("غير مصرح لك", 401);
  if (!store)  return err("المتجر غير موجود", 404);

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return err("معرّف العرض مطلوب", 400);

  const { error } = await supabase
    .from("promotions")
    .delete()
    .eq("id", id)
    .eq("store_id", store.id); // double check RLS

  if (error) {
    console.error("[DELETE /api/promotions]", error);
    return err("حدث خطأ أثناء حذف العرض", 500);
  }

  return ok({ deleted: true });
}
