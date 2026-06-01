/**
 * app/api/admin/funnel-track/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Platform Funnel Analytics Tracker
 *
 * POST /api/admin/funnel-track
 *
 * Logs anonymous registration funnel events for platform-wide analytics.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, eventName } = await request.json();

    if (!sessionId || !eventName) {
      return Response.json({ error: "معاملات غير مكتملة" }, { status: 400 });
    }

    const ALLOWED_EVENTS = new Set([
      "register_viewed",
      "step1_started",
      "step1_completed",
      "step2_started",
      "register_success",
    ]);

    if (!ALLOWED_EVENTS.has(eventName)) {
      return Response.json({ error: "حدث غير صالح" }, { status: 400 });
    }

    const adminDb = createAdminClient();
    const { error } = await adminDb
      .from("platform_funnel_events")
      .insert({
        session_id: sessionId,
        event_name: eventName,
      });

    if (error) {
      console.error("[POST /api/admin/funnel-track] DB error:", error);
      return Response.json({ error: "فشل تسجيل الحدث" }, { status: 500 });
    }

    return Response.json({ success: true }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/funnel-track] Unexpected error:", e);
    return Response.json({ error: "خطأ غير متوقع" }, { status: 500 });
  }
}
