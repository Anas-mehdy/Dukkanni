"use client";

/**
 * components/dashboard/StatsCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Reusable KPI Stats Card
 *
 * Used on the Orders dashboard and potentially the Overview page.
 * Supports a loading skeleton state and an optional color accent.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AccentColor = "primary" | "success" | "warning" | "danger";

export interface StatsCardProps {
  /** The headline metric value */
  value:    string | number;
  /** Short Arabic label below the value */
  label:    string;
  /** Emoji or icon character */
  icon:     React.ReactNode;
  /** Accent color for the icon ring and value */
  color?:   AccentColor;
  /** Shows a skeleton pulse when true */
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Color map
// ---------------------------------------------------------------------------

const COLOR_MAP: Record<AccentColor, { value: string; bg: string; border: string }> = {
  primary: {
    value:  "var(--color-primary)",
    bg:     "var(--color-primary-muted)",
    border: "var(--color-primary)",
  },
  success: {
    value:  "var(--color-success)",
    bg:     "var(--color-success-muted)",
    border: "var(--color-success)",
  },
  warning: {
    value:  "var(--color-warning)",
    bg:     "var(--color-warning-muted)",
    border: "var(--color-warning)",
  },
  danger: {
    value:  "var(--color-danger)",
    bg:     "var(--color-danger-muted)",
    border: "var(--color-danger)",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatsCard({ value, label, icon, color = "primary", loading = false }: StatsCardProps) {
  const palette = COLOR_MAP[color];

  if (loading) {
    return (
      <div
        className="card"
        style={{
          padding:        "1rem",
          display:        "flex",
          flexDirection:  "column",
          gap:            "0.625rem",
          alignItems:     "flex-start",
        }}
      >
        {/* Icon skeleton */}
        <div className="skeleton" style={{ width: "40px", height: "40px", borderRadius: "var(--radius-sm)" }} />
        {/* Value skeleton */}
        <div className="skeleton" style={{ width: "60%", height: "28px", borderRadius: "var(--radius-sm)" }} />
        {/* Label skeleton */}
        <div className="skeleton" style={{ width: "80%", height: "14px", borderRadius: "var(--radius-sm)" }} />
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        padding:        "1rem",
        display:        "flex",
        flexDirection:  "column",
        gap:            "0.5rem",
        alignItems:     "flex-start",
        borderColor:    "transparent",
        transition:     "border-color 0.2s",
        overflow:       "hidden",
        position:       "relative",
      }}
    >
      {/* Subtle accent gradient in background */}
      <div
        aria-hidden
        style={{
          position:     "absolute",
          top:          "-20px",
          left:         "-20px",
          width:        "80px",
          height:       "80px",
          borderRadius: "50%",
          background:   palette.bg,
          opacity:      0.5,
          pointerEvents: "none",
        }}
      />

      {/* Icon */}
      <div
        style={{
          width:          "40px",
          height:         "40px",
          borderRadius:   "var(--radius-sm)",
          background:     palette.bg,
          border:         `1.5px solid ${palette.border}`,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       "1.25rem",
          flexShrink:     0,
          position:       "relative",
        }}
      >
        {icon}
      </div>

      {/* Value */}
      <p
        style={{
          fontSize:   "1.625rem",
          fontWeight: 800,
          color:      palette.value,
          lineHeight: 1.1,
          position:   "relative",
        }}
      >
        {value}
      </p>

      {/* Label */}
      <p
        style={{
          fontSize:   "0.75rem",
          fontWeight: 600,
          color:      "var(--color-text-muted)",
          lineHeight: 1.3,
          position:   "relative",
        }}
      >
        {label}
      </p>
    </div>
  );
}
