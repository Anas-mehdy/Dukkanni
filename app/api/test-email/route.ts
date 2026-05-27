/**
 * app/api/test-email/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Email Integration Testing API
 *
 * GET /api/test-email?email=...&type=...
 * POST /api/test-email { email: "...", type: "invoice" | "support" }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest } from "next/server";
import { EmailService } from "@/lib/email";

function err(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function ok(data: any) {
  return Response.json({ data });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const email = searchParams.get("email");
  const type = searchParams.get("type") || "invoice"; // invoice or support

  if (!email) {
    return err("يرجى تزويد البريد الإلكتروني المستلم '?email=test@example.com' في الرابط");
  }

  try {
    let result;
    if (type === "invoice") {
      result = await EmailService.sendSubscriptionInvoice(
        email,
        "التاجر التجريبي 🏪",
        "yearly",
        "50"
      );
    } else if (type === "support") {
      result = await EmailService.sendSupportTicket(
        email,
        "تحديث حالة الشحن لمتجري",
        "هذه رسالة اختبار تلقائية تم إرسالها للتحقق من تكامل خوادم UniOne للمراسلات الفورية مع منصة دكاني ⚡. كل شيء يعمل بشكل ممتاز!"
      );
    } else {
      return err("نوع الرسالة غير معروف. الخيارات المتاحة: 'invoice' أو 'support'");
    }

    if (!result.success) {
      return err(result.error || "فشل إرسال البريد الإلكتروني عبر UniOne");
    }

    return ok({
      success: true,
      message: `تم إرسال البريد الإلكتروني التجريبي بنجاح إلى (${email})!`,
      jobId: result.messageId,
    });
  } catch (e: any) {
    console.error("[GET /api/test-email]", e);
    return err(e.message || "حدث خطأ غير متوقع");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, type } = body;

    if (!email) {
      return err("يرجى إرسال بريد إلكتروني في محتوى الطلب");
    }

    let result;
    if (type === "support") {
      result = await EmailService.sendSupportTicket(
        email,
        "تذكرة اختبار الدعم الفني",
        "رسالة تأكيد تكامل الأنظمة البريدية 🚀."
      );
    } else {
      result = await EmailService.sendSubscriptionInvoice(
        email,
        "تاجر دكاني الذكي ⚡",
        "monthly",
        "5"
      );
    }

    if (!result.success) {
      return err(result.error || "فشل التوصيل عبر خوادم UniOne");
    }

    return ok({
      success: true,
      message: `تم الإرسال بنجاح إلى (${email})`,
      jobId: result.messageId,
    });
  } catch (e: any) {
    console.error("[POST /api/test-email]", e);
    return err(e.message || "خطأ في معالجة الطلب");
  }
}
