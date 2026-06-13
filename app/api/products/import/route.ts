/**
 * app/api/products/import/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Bulk Products Import API Endpoint
 *
 * POST /api/products/import → Validate and import products in bulk
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStorePlanUsage } from "@/lib/plans";
import { productSchema, parseFormData } from "@/lib/validations";
import { z } from "zod";

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

// Validation schema for incoming bulk items
const bulkImportProductSchema = z.object({
  name: z.string().trim().min(1, "اسم المنتج مطلوب").max(60, "الاسم لا يتجاوز 60 حرفاً"),
  description: z.string().trim().max(1000, "الوصف لا يتجاوز 1000 حرف").nullable().optional(),
  price: z.number().min(0, "السعر لا يقل عن 0").max(9999999.99, "السعر مرتفع جداً"),
  category: z.string().trim().max(60, "الفئة لا تتجاوز 60 حرفاً").nullable().optional(),
  image_url: z.string().url("رابط الصورة غير صالح").nullable().optional(),
  images: z.array(z.string().url("رابط الصورة غير صالح")).nullable().optional().default([]),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { store, authErr } = await getAuthenticatedStore(supabase);

  if (authErr) return err("غير مصرح لك", 401);
  if (!store)  return err("المتجر غير موجود", 404);

  let body: { products?: any[]; categories?: string[] };
  try {
    body = await request.json();
  } catch {
    return err("بيانات غير صالحة", 400);
  }

  const { products = [], categories = [] } = body;

  if (products.length === 0) {
    return err("لا توجد منتجات للاستيراد", 400);
  }

  // 1. Validate Row Schema Checks
  const rowErrors: Array<{ row: number; errors: Record<string, string> }> = [];
  const validatedProducts: any[] = [];

  products.forEach((p, idx) => {
    const result = bulkImportProductSchema.safeParse(p);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path.join(".")] = issue.message;
      });
      rowErrors.push({ row: idx + 1, errors: fieldErrors });
    } else {
      validatedProducts.push(result.data);
    }
  });

  if (rowErrors.length > 0) {
    return err("توجد أخطاء في بعض الصفوف", 422, { rowErrors });
  }

  // 2. Resolve Plan Limits & Count Usage
  let planUsage;
  try {
    planUsage = await getStorePlanUsage(supabase, store.id);
  } catch (planErr) {
    console.error("[POST /api/products/import] plan limits check error:", planErr);
    return err("حدث خطأ أثناء فحص حدود الباقة الحالية", 500);
  }

  // 3. Count how many new categories will be created
  // Fetch current store categories
  const { data: currentCats, error: currentCatsError } = await supabase
    .from("categories")
    .select("name")
    .eq("store_id", store.id);

  if (currentCatsError) {
    console.error("[POST /api/products/import] fetch categories error:", currentCatsError);
    return err("حدث خطأ أثناء جلب الفئات الحالية", 500);
  }

  const currentCatNames = new Set(
    (currentCats || []).map((c: any) => c.name.toLowerCase().trim())
  );

  const uniqueCategoriesToImport = Array.from(
    new Set(
      categories
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
    )
  );

  const missingCategories = uniqueCategoriesToImport.filter(
    (c) => !currentCatNames.has(c.toLowerCase())
  );

  // 4. Validate limits
  // A. Check Product limits
  const incomingCount = validatedProducts.length;
  if (
    planUsage.limits.maxProducts !== -1 &&
    planUsage.usage.products + incomingCount > planUsage.limits.maxProducts
  ) {
    return Response.json({
      error: "PLAN_LIMIT_REACHED",
      limitType: "products",
      limitValue: planUsage.limits.maxProducts,
      currentValue: planUsage.usage.products,
      incomingValue: incomingCount,
      message: `لا يمكنك استيراد ${incomingCount} منتجات لأنها تتجاوز الحد الأقصى لباقة اشتراكك الحالي (المتبقي لك: ${Math.max(0, planUsage.limits.maxProducts - planUsage.usage.products)} منتج).`
    }, { status: 403 });
  }

  // B. Check Category limits
  const newCatCount = missingCategories.length;
  if (
    planUsage.limits.maxCategories !== -1 &&
    planUsage.usage.categories + newCatCount > planUsage.limits.maxCategories
  ) {
    return Response.json({
      error: "PLAN_LIMIT_REACHED",
      limitType: "categories",
      limitValue: planUsage.limits.maxCategories,
      currentValue: planUsage.usage.categories,
      incomingValue: newCatCount,
      message: `لا يمكنك إنشاء ${newCatCount} فئات جديدة لأنها تتجاوز الحد الأقصى للفئات في باقة اشتراكك الحالي (المتبقي لك: ${Math.max(0, planUsage.limits.maxCategories - planUsage.usage.categories)} فئة).`
    }, { status: 403 });
  }

  // C. Check Image limits per product
  if (planUsage.limits.maxImagesPerProduct !== -1) {
    for (let i = 0; i < validatedProducts.length; i++) {
      const productImages = validatedProducts[i].images || [];
      if (productImages.length > planUsage.limits.maxImagesPerProduct) {
        return Response.json({
          error: "PLAN_LIMIT_REACHED",
          limitType: "images",
          limitValue: planUsage.limits.maxImagesPerProduct,
          currentValue: productImages.length,
          message: `الصف رقم ${i + 1} يحتوي على ${productImages.length} صور وهو ما يتجاوز الحد الأقصى المسموح به للصور في باقتك الحالية (${planUsage.limits.maxImagesPerProduct} صور للمنتج).`
        }, { status: 403 });
      }
    }
  }

  // 5. Structure payload for RPC database function
  // We need to transform verified products into the format database expects
  const rpcProducts = validatedProducts.map((p) => {
    const images = Array.isArray(p.images) ? p.images : [];
    // If cover image is specified, ensure it is included as first image in images array
    const hasCoverImage = p.image_url && p.image_url.trim().length > 0;
    const galleryImages = hasCoverImage ? Array.from(new Set([p.image_url, ...images])) : images;

    const optionsPayload = {
      variants: [],
      description: p.description?.trim() || null,
      images: galleryImages,
    };

    return {
      name: p.name,
      price: p.price,
      category_name: p.category || null,
      image_url: p.image_url || null,
      options: optionsPayload,
    };
  });

  // 6. Call the database RPC transaction
  const { error: rpcError } = await supabase.rpc("import_products_and_categories", {
    p_store_id: store.id,
    p_categories: uniqueCategoriesToImport,
    p_products: rpcProducts,
  });

  if (rpcError) {
    console.error("[POST /api/products/import] database RPC error:", rpcError);
    return err("حدث خطأ في قاعدة البيانات أثناء حفظ المنتجات المستوردة", 500);
  }

  return ok({
    success: true,
    importedProductsCount: incomingCount,
    createdCategoriesCount: newCatCount,
  });
}
