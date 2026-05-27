"use client";

/**
 * components/ui/Toast.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Toast Notification System
 *
 * Zero-dependency, portal-rendered toast stack.
 * Supports: success | error | warning | info
 * Auto-dismisses after 4s. RTL-aware positioning.
 *
 * Usage:
 *   1. Wrap your layout with <ToastProvider>
 *   2. Use the useToast() hook: const { toast } = useToast()
 *   3. Call toast.success("تم الحفظ بنجاح") / toast.error("حدث خطأ")
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

type ToastAction =
  | { type: "ADD"; toast: ToastItem }
  | { type: "REMOVE"; id: string };

interface ToastContextValue {
  toast: {
    success: (message: string, duration?: number) => void;
    error:   (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info:    (message: string, duration?: number) => void;
  };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null);

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function reducer(state: ToastItem[], action: ToastAction): ToastItem[] {
  switch (action.type) {
    case "ADD":
      // Cap at 4 visible toasts
      return [...state.slice(-3), action.toast];
    case "REMOVE":
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, []);

  const add = useCallback((message: string, variant: ToastVariant, duration = 4000) => {
    const id = String(Math.random().toString(36).slice(2) + Date.now().toString(36));
    dispatch({ type: "ADD", toast: { id, message, variant, duration } });
  }, []);

  const ctx: ToastContextValue = {
    toast: {
      success: (m, d) => add(m, "success", d),
      error:   (m, d) => add(m, "error",   d),
      warning: (m, d) => add(m, "warning", d),
      info:    (m, d) => add(m, "info",    d),
    },
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <ToastPortal toasts={toasts} dispatch={dispatch} />
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ---------------------------------------------------------------------------
// Portal renderer
// ---------------------------------------------------------------------------

function ToastPortal({
  toasts,
  dispatch,
}: {
  toasts: ToastItem[];
  dispatch: React.Dispatch<ToastAction>;
}) {
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-label="إشعارات"
      style={{
        position: "fixed",
        top: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        width: "calc(100% - 2rem)",
        maxWidth: "400px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          toast={t}
          onDismiss={() => dispatch({ type: "REMOVE", id: t.id })}
        />
      ))}
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Single Toast item
// ---------------------------------------------------------------------------

const VARIANT_CONFIG: Record<ToastVariant, { icon: string; bg: string; border: string; color: string }> = {
  success: { icon: "✓", bg: "var(--color-success-muted)", border: "var(--color-success)", color: "var(--color-success)" },
  error:   { icon: "✕", bg: "var(--color-danger-muted)",  border: "var(--color-danger)",  color: "var(--color-danger)"  },
  warning: { icon: "!", bg: "var(--color-warning-muted)", border: "var(--color-warning)", color: "var(--color-warning)" },
  info:    { icon: "i", bg: "var(--color-primary-muted)", border: "var(--color-primary)", color: "var(--color-primary)" },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const { icon, bg, border, color } = VARIANT_CONFIG[toast.variant];
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(timerRef.current);
  }, [toast.duration, onDismiss]);

  return (
    <div
      role="alert"
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           "0.75rem",
        background:    bg,
        border:        `1.5px solid ${border}`,
        borderRadius:  "var(--radius-md)",
        padding:       "0.875rem 1rem",
        boxShadow:     "var(--shadow-md)",
        pointerEvents: "all",
        animation:     "toast-in 0.25s ease-out",
        fontFamily:    "var(--font-cairo), sans-serif",
        fontSize:      "0.9375rem",
        fontWeight:    "500",
        color:         "var(--color-text)",
        direction:     "rtl",
      }}
    >
      {/* Icon badge */}
      <span
        style={{
          width:          "28px",
          height:         "28px",
          borderRadius:   "50%",
          background:     color,
          color:          "#fff",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontWeight:     "700",
          fontSize:       "0.875rem",
          flexShrink:     0,
        }}
      >
        {icon}
      </span>

      {/* Message */}
      <span style={{ flex: 1 }}>{toast.message}</span>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        aria-label="إغلاق الإشعار"
        style={{
          background:  "none",
          border:      "none",
          cursor:      "pointer",
          color:       "var(--color-text-muted)",
          fontSize:    "1.1rem",
          lineHeight:  1,
          padding:     "2px",
          flexShrink:  0,
        }}
      >
        ×
      </button>

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
