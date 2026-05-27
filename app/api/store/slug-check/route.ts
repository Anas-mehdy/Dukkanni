/**
 * app/api/store/slug-check/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Real-Time Slug Availability Checker
 *
 * GET /api/store/slug-check?slug=my-store
 *
 * Used by the onboarding wizard and settings page to show live
 * availability feedback while the user is typing.
 *
 * Response: { available: boolean, reason?: string }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RESERVED_SLUGS } from "@/lib/constants";

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim().toLowerCase();

  if (!slug) {
    return Response.json({ available: false, reason: "الرابط مطلوب" });
  }

  // ── Client-side-checkable rules (format) ──────────────────────────────────
  if (slug.length < 4) {
    return Response.json({ available: false, reason: "الرابط قصير جداً (4 أحرف على الأقل)" });
  }
  if (slug.length > 48) {
    return Response.json({ available: false, reason: "الرابط طويل جداً" });
  }
  if (!SLUG_REGEX.test(slug)) {
    return Response.json({ available: false, reason: "أحرف غير مسموح بها في الرابط" });
  }

  // ── Reserved keywords ──────────────────────────────────────────────────────
  if (RESERVED_SLUGS.has(slug)) {
    return Response.json({ available: false, reason: "هذا الرابط محجوز للنظام" });
  }

  // ── DB uniqueness check ────────────────────────────────────────────────────
  const supabase = await createClient();

  // Get the current user's store ID so we can exclude it
  // (slug-check is accessible even during onboarding, so user might not have a store)
  const { data: { user } } = await supabase.auth.getUser();
  let currentStoreId: string | null = null;
  if (user) {
    const { data: myStore } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();
    currentStoreId = myStore?.id ?? null;
  }

  const query = supabase
    .from("stores")
    .select("id")
    .eq("slug", slug);

  // Exclude own store from conflict check
  if (currentStoreId) {
    query.neq("id", currentStoreId);
  }

  const { data: conflict } = await query.maybeSingle();

  if (conflict) {
    return Response.json({ available: false, reason: "هذا الرابط مستخدم بالفعل" });
  }

  return Response.json({ available: true });
}
