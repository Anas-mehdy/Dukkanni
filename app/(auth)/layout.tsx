"use client";

/**
 * app/(auth)/layout.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Auth Pages Layout
 *
 * Provides the outer shell for /login and /register.
 * Renders a full-screen centered container with a branded background
 * (subtle radial gradient + grid) and no navigation bars.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight:      "100dvh",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "1.25rem",
        fontFamily:     "var(--font-cairo), sans-serif",
        direction:      "rtl",
        position:       "relative",
        overflow:       "hidden",
        background:     "var(--color-bg)",
      }}
    >
      {/* Decorative background glows */}
      <div
        aria-hidden
        style={{
          position:     "absolute",
          top:          "-120px",
          right:        "-80px",
          width:        "400px",
          height:       "400px",
          borderRadius: "50%",
          background:   "radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%)",
          pointerEvents:"none",
        }}
      />
      <div
        aria-hidden
        style={{
          position:     "absolute",
          bottom:       "-100px",
          left:         "-60px",
          width:        "300px",
          height:       "300px",
          borderRadius: "50%",
          background:   "radial-gradient(circle, #7c6af710 0%, transparent 70%)",
          pointerEvents:"none",
        }}
      />

      {/* Brand mark */}
      <div style={{ textAlign: "center", marginBottom: "1.5rem", position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img
          src="/logo.png"
          alt="دكاني"
          style={{
            height:       "48px",
            width:        "auto",
            objectFit:    "contain",
            marginBottom: "0.5rem",
          }}
        />
        <p
          style={{
            fontSize:      "1.375rem",
            fontWeight:    900,
            letterSpacing: "-0.02em",
            background:    "linear-gradient(135deg, var(--color-primary) 0%, #a89af9 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor:  "transparent",
            backgroundClip:       "text",
          }}
        >
          دكاني
        </p>
        <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", marginTop: "2px" }}>
          منصة التجارة عبر الواتساب
        </p>
      </div>

      {/* Page content */}
      <div style={{ width: "100%", maxWidth: "420px", position: "relative" }}>
        {children}
      </div>

      {/* Footer */}
      <p
        style={{
          fontSize:   "0.6875rem",
          color:      "var(--color-text-faint)",
          marginTop:  "2rem",
          textAlign:  "center",
          position:   "relative",
          lineHeight: 1.6,
        }}
      >
        بالتسجيل توافق على{" "}
        <a href="/terms" style={{ color: "var(--color-primary)", textDecoration: "none" }}>
          شروط الخدمة
        </a>{" "}
        و{" "}
        <a href="/privacy" style={{ color: "var(--color-primary)", textDecoration: "none" }}>
          سياسة الخصوصية
        </a>
      </p>
    </div>
  );
}
