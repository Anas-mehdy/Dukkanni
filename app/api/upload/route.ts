/**
 * app/api/upload/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Secure Supabase Storage Upload URL Generator
 *
 * POST /api/upload
 * Body: { filename: string, contentType: string }
 *
 * Returns: { signedUrl: string, path: string, publicUrl: string }
 *
 * Flow:
 *   1. Authenticate the merchant (must be logged in).
 *   2. Generate a unique storage path: products/<store_id>/<uuid>.<ext>
 *   3. Return a signed upload URL (valid 60s) for the client to PUT the file.
 *   4. Client uploads the compressed file directly to Supabase Storage.
 *   5. Client then sends publicUrl in the product create/update request.
 *
 * Security:
 *   - Only authenticated merchants can get signed URLs.
 *   - Path is namespaced by store_id (prevents cross-tenant access).
 *   - The anon key bucket policy allows public read but requires signed URLs for write.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "product-images";
const SIGNED_URL_EXPIRY_SECONDS = 60;

// Allowed MIME types for product images
const ALLOWED_TYPES = new Set([
  "image/webp",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/avif",
]);

function ok<T>(data: T) {
  return Response.json({ data }, { status: 200 });
}

function err(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return err("غير مصرح لك", 401);

  // ── Resolve store ─────────────────────────────────────────────────────────
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (storeError || !store) return err("المتجر غير موجود", 404);

  // ── Parse and validate body ───────────────────────────────────────────────
  let body: { filename?: string; contentType?: string };
  try {
    body = await request.json();
  } catch {
    return err("بيانات غير صالحة", 400);
  }

  const { filename, contentType } = body;

  if (!filename || typeof filename !== "string") {
    return err("اسم الملف مطلوب", 400);
  }
  if (!contentType || !ALLOWED_TYPES.has(contentType)) {
    return err("نوع الملف غير مدعوم. يرجى استخدام JPEG أو WebP أو PNG", 400);
  }

  // ── Build storage path ────────────────────────────────────────────────────
  // Namespaced by store_id → prevents any cross-tenant path guessing
  // folder param: "products" (default) | "logos" (for store logos)
  const folderParam = request.nextUrl.searchParams.get("folder");
  const folder      = folderParam === "logos" ? "logos" : "products";
  const ext         = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const uuid        = crypto.randomUUID();
  const path        = `${folder}/${store.id}/${uuid}.${ext}`;

  // ── Create signed upload URL ──────────────────────────────────────────────
  const { data: signedData, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (signedError || !signedData) {
    console.error("[POST /api/upload] createSignedUploadUrl failed:", signedError);
    return err("تعذّر إنشاء رابط الرفع. حاول مجدداً", 500);
  }

  // ── Build public URL (for storing in products.image_url) ─────────────────
  const { data: publicUrlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return ok({
    signedUrl: signedData.signedUrl,
    path,
    publicUrl: publicUrlData.publicUrl,
    token:     signedData.token,
  });
}
