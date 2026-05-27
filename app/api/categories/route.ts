/**
 * app/api/categories/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Categories API Route Handler
 *
 * GET    /api/categories          → list all categories for the authenticated store
 * POST   /api/categories          → create a new category
 * PUT    /api/categories?id=<id>  → update a category
 * DELETE /api/categories?id=<id>  → delete a category
 *
 * Security: store_id is ALWAYS resolved from auth.uid() server-side.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { categorySchema, categoryUpdateSchema, parseFormData } from "@/lib/validations";

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
// GET — list categories
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = await createClient();
  const { store, authErr } = await getAuthenticatedStore(supabase);

  if (authErr) return err("غير مصرح لك", 401);
  if (!store)  return err("المتجر غير موجود", 404);

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, sort_order, created_at")
    .eq("store_id", store.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[GET /api/categories]", error);
    return err("حدث خطأ أثناء جلب الفئات", 500);
  }

  return ok(categories);
}

// ---------------------------------------------------------------------------
// POST — create category
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

  const parsed = parseFormData(categorySchema, body);
  if (!parsed.success) {
    return err("بيانات الفئة غير صحيحة", 422, parsed.errors);
  }

  const { data: category, error } = await supabase
    .from("categories")
    .insert({
      store_id:   store.id,
      name:       parsed.data.name,
      sort_order: parsed.data.sort_order ?? 0,
    })
    .select("id, name, sort_order, created_at")
    .single();

  if (error) {
    console.error("[POST /api/categories]", error);
    return err("حدث خطأ أثناء إنشاء الفئة", 500);
  }

  return ok(category, 201);
}

// ---------------------------------------------------------------------------
// PUT — update category
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { store, authErr } = await getAuthenticatedStore(supabase);

  if (authErr) return err("غير مصرح لك", 401);
  if (!store)  return err("المتجر غير موجود", 404);

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return err("معرّف الفئة مطلوب", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("بيانات غير صالحة", 400);
  }

  const parsed = parseFormData(categoryUpdateSchema, body);
  if (!parsed.success) {
    return err("بيانات الفئة غير صحيحة", 422, parsed.errors);
  }

  // Security: verify this category belongs to the authenticated merchant's store
  const { data: category, error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id)
    .eq("store_id", store.id) // RLS double-check at app layer
    .select("id, name, sort_order, updated_at")
    .single();

  if (error) {
    if (error.code === "PGRST116") return err("الفئة غير موجودة", 404);
    console.error("[PUT /api/categories]", error);
    return err("حدث خطأ أثناء تحديث الفئة", 500);
  }

  return ok(category);
}

// ---------------------------------------------------------------------------
// DELETE — delete category
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { store, authErr } = await getAuthenticatedStore(supabase);

  if (authErr) return err("غير مصرح لك", 401);
  if (!store)  return err("المتجر غير موجود", 404);

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return err("معرّف الفئة مطلوب", 400);

  // Products with this category will have category_id SET NULL (per schema ON DELETE SET NULL)
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("store_id", store.id); // RLS double-check at app layer

  if (error) {
    console.error("[DELETE /api/categories]", error);
    return err("حدث خطأ أثناء حذف الفئة", 500);
  }

  return ok({ deleted: true });
}
