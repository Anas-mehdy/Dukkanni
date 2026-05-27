/**
 * lib/email.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Transactional Email Service (UniOne Web API)
 *
 * Utilizes UniOne transactional endpoint to dispatch beautiful HTML emails.
 * Uses native node fetch to avoid heavy third-party dependencies.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import crypto from "crypto";

interface UniOneRecipient {
  email: string;
}

interface UniOneMessage {
  recipients: UniOneRecipient[];
  subject: string;
  from_email: string;
  from_name: string;
  body: {
    html: string;
    plaintext: string;
  };
}

interface UniOnePayload {
  idempotency_key: string;
  message: UniOneMessage;
}

export const EmailService = {
  /**
   * Helper function to dispatch raw payloads to UniOne
   */
  async sendEmail(to: string, subject: string, htmlBody: string, plainText: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = process.env.UNIONE_API_KEY;
    const senderEmail = process.env.UNIONE_SENDER_EMAIL;

    if (!apiKey || !senderEmail) {
      console.warn("⚠️ [EmailService] UNIONE_API_KEY or UNIONE_SENDER_EMAIL is not set inside environment variables.");
      return { success: false, error: "Email configurations missing on server." };
    }

    const payload: UniOnePayload = {
      idempotency_key: crypto.randomUUID(),
      message: {
        recipients: [{ email: to }],
        subject,
        from_email: senderEmail,
        from_name: "دكاني ⚡",
        body: {
          html: htmlBody,
          plaintext: plainText,
        },
      },
    };

    try {
      const response = await fetch("https://api.unione.io/en/transactional/api/v1/email/send.json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok || responseData.status === "error") {
        console.error("❌ [EmailService] UniOne API error:", responseData);
        return { success: false, error: responseData.message || "Failed to deliver email through UniOne." };
      }

      return { success: true, messageId: responseData.job_id };
    } catch (e: any) {
      console.error("❌ [EmailService] Network exception:", e);
      return { success: false, error: e.message || "Network exception during email dispatch." };
    }
  },

  /**
   * Sends a modern emerald-green receipt/invoice upon subscribing
   */
  async sendSubscriptionInvoice(to: string, merchantName: string, planName: string, price: string) {
    const subject = "🧾 فاتورة اشتراكك في منصة دكاني ⚡";

    const planLabel = planName === "monthly" ? "الباقة الشهرية (النمو السريع)" : "الباقة السنوية (التاجر الجاد)";
    const currency = "USD";

    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فاتورة اشتراك دكاني</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    body {
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1f2937;
      direction: rtl;
      text-align: right;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f3f4f6;
      padding: 20px 0;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    .header {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      padding: 30px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .header p {
      margin: 5px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 30px 24px;
    }
    .welcome-text {
      font-size: 16px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 12px;
      color: #111827;
    }
    .body-text {
      font-size: 14px;
      line-height: 1.6;
      color: #4b5563;
      margin-bottom: 24px;
    }
    .receipt-card {
      background-color: #f9fafb;
      border: 1.5px dashed #d1d5db;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .receipt-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
      margin-bottom: 0;
    }
    .label {
      font-size: 13px;
      font-weight: 600;
      color: #6b7280;
    }
    .value {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
    }
    .price-value {
      font-size: 18px;
      font-weight: 800;
      color: #059669;
    }
    .btn-container {
      text-align: center;
      margin: 30px 0 10px;
    }
    .btn {
      display: inline-block;
      background-color: #10b981;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 30px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 30px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px 24px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #9ca3af;
    }
    .footer a {
      color: #10b981;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <h1>دكاني ⚡</h1>
        <p>تأكيد تفعيل الاشتراك بنجاح</p>
      </div>
      
      <!-- Content -->
      <div class="content">
        <h2 class="welcome-text">مرحباً يا ${merchantName}، 👋</h2>
        <p class="body-text">
          يسعدنا إبلاغك بأنه تم تفعيل اشتراكك بنجاح في منصة دكاني. لقد أصبحت الآن قادراً على الاستمتاع بكافة ميزات المنصة المتقدمة واستقبال طلبات زبائنك بلا حدود. ستجد أدناه تفاصيل الفاتورة وإيصال الدفع:
        </p>
        
        <!-- Receipt Details -->
        <div class="receipt-card">
          <div class="receipt-row">
            <span class="label">اسم المشترك:</span>
            <span class="value">${merchantName}</span>
          </div>
          <div class="receipt-row">
            <span class="label">الباقة المفعلة:</span>
            <span class="value">${planLabel}</span>
          </div>
          <div class="receipt-row">
            <span class="label">حالة الدفع:</span>
            <span class="value" style="color: #059669;">مدفوع بالكامل 🟢</span>
          </div>
          <div class="receipt-row">
            <span class="label">قيمة الاشتراك المالي:</span>
            <span class="price-value">$${price} ${currency}</span>
          </div>
          <div class="receipt-row">
            <span class="label">طريقة التفعيل:</span>
            <span class="value">تنشيط إداري يدوي 💳</span>
          </div>
        </div>
        
        <p class="body-text" style="font-size: 13px; color: #6b7280;">
          * لتجديد اشتراكك لاحقاً أو مراجعة فترتك، يرجى التوجه لصفحة "اشتراكي" داخل لوحة التحكم الخاصة بك.
        </p>

        <!-- CTA Button -->
        <div class="btn-container">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard" class="btn">دخول لوحة التحكم 🚀</a>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>حقوق الطبع محفوظة © 2026 دكاني. صُنع لتمكين مبيعاتك المحلية.</p>
        <p>إذا كان لديك أي استفسار، تواصل معنا عبر <a href="mailto:support@dukkanni.com">support@dukkanni.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const plaintext = `
مرحباً يا ${merchantName}،
يسعدنا إبلاغك بأنه تم تفعيل اشتراكك بنجاح في منصة دكاني.
لقد أصبحت الآن قادراً على الاستمتاع بكافة ميزات المنصة واستقبال طلبات زبائنك بلا حدود.

تفاصيل الفاتورة:
------------------------------------------
اسم المشترك: ${merchantName}
الباقة المفعلة: ${planLabel}
حالة الدفع: مدفوع بالكامل
قيمة الاشتراك: $${price} USD
طريقة التفعيل: تنشيط إداري يدوي

دخول لوحة التحكم: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard
دكاني ⚡
    `;

    return this.sendEmail(to, subject, html, plaintext);
  },

  /**
   * Sends a beautiful ticket/support email alert
   */
  async sendSupportTicket(to: string, ticketSubject: string, message: string) {
    const subject = `🎫 تذكرة دعم فني جديدة: ${ticketSubject} — دكاني`;

    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تذكرة دعم فني جديدة</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    body {
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1f2937;
      direction: rtl;
      text-align: right;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f3f4f6;
      padding: 20px 0;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    .header {
      background-color: #111827;
      padding: 24px;
      text-align: center;
      color: #ffffff;
      border-bottom: 4px solid #10b981;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
    }
    .content {
      padding: 30px 24px;
    }
    .welcome-text {
      font-size: 16px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 12px;
      color: #111827;
    }
    .body-text {
      font-size: 14px;
      line-height: 1.6;
      color: #4b5563;
      margin-bottom: 24px;
    }
    .ticket-body {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      font-size: 13.5px;
      color: #374151;
      white-space: pre-line;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px 24px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <h1>دعم دكاني الفني 🎫</h1>
      </div>
      
      <!-- Content -->
      <div class="content">
        <h2 class="welcome-text">تحديث بخصوص تذكرة الدعم الفني:</h2>
        <p class="body-text">
          أهلاً بك، لقد تلقينا طلباً/تذكرة جديدة بخصوص الدعم الفني لمتجرك في منصة دكاني. سنعمل جاهدين على معالجة طلبك والرد عليك في أقرب فرصة ممكنة. تفاصيل رسالتك مرسلة بالأسفل للتوثيق:
        </p>
        
        <!-- Ticket Body -->
        <div class="ticket-body"><strong>عنوان الطلب:</strong> ${ticketSubject}

<strong>مضمون الرسالة:</strong>
${message}</div>
        
        <p class="body-text" style="font-size: 13px; color: #6b7280;">
          * إذا رغبت بإضافة المزيد من التوضيحات، يرجى الرد مباشرة على هذا البريد الإلكتروني.
        </p>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>حقوق الطبع محفوظة © 2026 دكاني. صُنع لتمكين مبيعاتك المحلية.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const plaintext = `
دعم دكاني الفني 🎫
أهلاً بك، لقد تلقينا طلباً/تذكرة جديدة بخصوص الدعم الفني.

تفاصيل التذكرة:
------------------------------------------
عنوان الطلب: ${ticketSubject}

الرسالة:
${message}

فريق دعم دكاني ⚡
    `;

    return this.sendEmail(to, subject, html, plaintext);
  },
};
