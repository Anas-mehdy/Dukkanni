import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "دكاني — متجرك الإلكتروني على واتساب",
    template: "%s | دكاني",
  },
  description:
    "أنشئ متجرك الإلكتروني في دقائق واستقبل الطلبات مباشرة على واتساب. منصة تجارة مبسّطة للمحلات الصغيرة وبائعي إنستغرام وتيك توك.",
  keywords: ["متجر واتساب", "تجارة إلكترونية", "كتالوج منتجات", "دكاني"],
  authors: [{ name: "Dukkanni" }],
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "ar_SA",
    siteName: "دكاني",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevent zoom on input focus (mobile UX)
  themeColor: "#0f0f14",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script>
          {`
            (function() {
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'light') {
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.remove('light');
                }
              } catch (e) {}
            })();
          `}
        </script>
      </head>
      <body className="min-h-dvh flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
