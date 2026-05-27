"use client";

/**
 * app/[slug]/not-found.tsx
 * Shown when a store slug doesn't exist or the store is inactive.
 */

import Link from "next/link";

export default function StoreNotFound() {
  return (
    <div
      style={{
        minHeight:      "100dvh",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "2rem 1.5rem",
        textAlign:      "center",
        background:     "var(--color-bg)",
        fontFamily:     "var(--font-cairo), sans-serif",
      }}
    >
      <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🏪</div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.5rem" }}>
        المتجر غير موجود
      </h1>
      <p style={{ color: "var(--color-text-muted)", maxWidth: "300px", lineHeight: 1.6 }}>
        هذا الرابط غير صحيح أو أن المتجر لم يعد متاحاً.
      </p>
      <Link
        href="/"
        style={{
          marginTop:      "1.5rem",
          padding:        "0.75rem 1.5rem",
          background:     "var(--color-primary)",
          color:          "#fff",
          borderRadius:   "var(--radius-full)",
          textDecoration: "none",
          fontWeight:     700,
          fontSize:       "0.9375rem",
        }}
      >
        العودة للرئيسية
      </Link>
    </div>
  );
}
