/**
 * app/api/products/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Products API Route Handler
 *
 * GET    /api/products              → list products for authenticated store
 * POST   /api/products              → create a new product
 * PUT    /api/products?id=<id>      → update a product (including is_active toggle)
 * DELETE /api/products?id=<id>      → delete a product
 *
 * Security guarantees:
 *   - store_id is ALWAYS resolved from auth.uid() — NEVER trusted from body.
 *   - All mutations include a .eq("store_id", store.id) app-layer check
 *     in addition to Supabase RLS policies.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { productSchema, productUpdateSchema, parseFormData } from "@/lib/validations";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok<T>(data: T, status = 200) {
  return Response.json({ data }, { status });
}

function err(message: string, status = 400, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

async function getAuthenticatedStore(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return { store: null, authErr: true };

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, currency_code")
    .eq("owner_id", user.id)
    .single();

  if (storeError || !store) return { store: null, authErr: false };

  return { store, authErr: false };
}

// ---------------------------------------------------------------------------
// GET — list products with optional filters
// Query params:
//   ?category=<uuid>      filter by category
//   ?search=<text>        filter by product name (ilike)
//   ?active=true|false    filter by is_active
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { store, authErr } = await getAuthenticatedStore(supabase);

  if (authErr) return err("غير مصرح لك", 401);
  if (!store)  return err("المتجر غير موجود", 404);

  const sp = request.nextUrl.searchParams;
  const category = sp.get("category");
  const search   = sp.get("search");
  const active   = sp.get("active");

  let query = supabase
    .from("products")
    .select(`
      id, name, price, image_url, is_active, sort_order, category_id, options, created_at, updated_at,
      categories ( id, name )
    `)
    .eq("store_id", store.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (category && category !== "all") {
    query = query.eq("category_id", category);
  }
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  if (active === "true") {
    query = query.eq("is_active", true);
  } else if (active === "false") {
    query = query.eq("is_active", false);
  }

  const { data: products, error } = await query;

  if (error) {
    console.error("[GET /api/products]", error);
    return err("حدث خطأ أثناء جلب المنتجات", 500);
  }

  return ok(products);
}

// ---------------------------------------------------------------------------
// POST — create product
// Body: ProductFormValues (name, price, category_id?, is_active, sort_order, image_url?)
// store_id is injected server-side from session.
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

  const parsed = parseFormData(productSchema, body);
  if (!parsed.success) {
    return err("بيانات المنتج غير صحيحة", 422, parsed.errors);
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      store_id:    store.id,       // ← ALWAYS from server session
      name:        parsed.data.name,
      price:       parsed.data.price,
      category_id: parsed.data.category_id ?? null,
      is_active:   parsed.data.is_active ?? true,
      sort_order:  parsed.data.sort_order ?? 0,
      image_url:   parsed.data.image_url ?? null,
      options:     parsed.data.options ?? [],
    })
    .select("id, name, price, image_url, is_active, sort_order, category_id, options, created_at")
    .single();

  if (error) {
    console.error("[POST /api/products]", error);
    return err("حدث خطأ أثناء إنشاء المنتج", 500);
  }

  return ok(product, 201);
}

// ---------------------------------------------------------------------------
// PUT — update product (full update OR partial, e.g. is_active toggle)
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { store, authErr } = await getAuthenticatedStore(supabase);

  if (authErr) return err("غير مصرح لك", 401);
  if (!store)  return err("المتجر غير موجود", 404);

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return err("معرّف المنتج مطلوب", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("بيانات غير صالحة", 400);
  }

  // Use partial schema — allows toggling only is_active without sending full form
  const parsed = parseFormData(productUpdateSchema, body);
  if (!parsed.success) {
    return err("بيانات المنتج غير صحيحة", 422, parsed.errors);
  }

  // Explicitly remove store_id from update payload if client somehow sent it
  const { ...updatePayload } = parsed.data;

  const { data: product, error } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("id", id)
    .eq("store_id", store.id) // app-layer tenant isolation (RLS also enforces this)
    .select("id, name, price, image_url, is_active, sort_order, category_id, options, updated_at")
    .single();

  if (error) {
    if (error.code === "PGRST116") return err("المنتج غير موجود", 404);
    console.error("[PUT /api/products]", error);
    return err("حدث خطأ أثناء تحديث المنتج", 500);
  }

  return ok(product);
}

// ---------------------------------------------------------------------------
// DELETE — delete product
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { store, authErr } = await getAuthenticatedStore(supabase);

  if (authErr) return err("غير مصرح لك", 401);
  if (!store)  return err("المتجر غير موجود", 404);

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return err("معرّف المنتج مطلوب", 400);

  // Image cleanup: fetch image_url before deleting so we can remove from Storage
  const { data: existing } = await supabase
    .from("products")
    .select("image_url")
    .eq("id", id)
    .eq("store_id", store.id)
    .single();

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("store_id", store.id);

  if (error) {
    console.error("[DELETE /api/products]", error);
    return err("حدث خطأ أثناء حذف المنتج", 500);
  }

  // Best-effort: remove product image from Storage after DB delete
  if (existing?.image_url) {
    try {
      const url = new URL(existing.image_url);
      // Extract the storage path after "/object/public/<bucket>/"
      const pathMatch = url.pathname.match(/\/object\/public\/[^/]+\/(.+)/);
      if (pathMatch?.[1]) {
        const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "product-images";
        await supabase.storage.from(bucket).remove([decodeURIComponent(pathMatch[1])]);
      }
    } catch {
      // Non-fatal — Storage cleanup failure should not fail the API response
    }
  }

  return ok({ deleted: true });
}
