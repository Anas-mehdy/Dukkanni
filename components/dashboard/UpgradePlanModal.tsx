"use client";

import { useState, useEffect } from "react";

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType?: string;
  limitValue?: number;
  currentValue?: number;
}

export default function UpgradePlanModal({
  isOpen,
  onClose,
  limitType,
  limitValue,
  currentValue,
}: UpgradePlanModalProps) {
  const [storeInfo, setStoreInfo] = useState<{ name: string; slug: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/store")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setStoreInfo(res.data);
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const typeLabelsAr: Record<string, string> = {
    products: "المنتجات",
    categories: "الفئات",
    images: "صور المنتج",
    orders: "الطلبات الشهرية",
  };

  const currentLabel = typeLabelsAr[limitType || ""] || "العناصر";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 15, 20, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        direction: "rtl",
        fontFamily: "var(--font-cairo), sans-serif",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth: "420px",
          padding: "1.75rem",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1.25rem",
            left: "1.25rem",
            background: "none",
            border: "none",
            color: "var(--color-text-faint)",
            cursor: "pointer",
            fontSize: "1.25rem",
            padding: "4px",
            lineHeight: 1,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-faint)")}
        >
          ✕
        </button>

        {/* Warning Icon Badge */}
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "var(--color-warning-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            margin: "0.5rem auto 0 auto",
            border: "2.5px solid var(--color-warning)",
            boxShadow: "0 4px 12px var(--color-warning-muted)",
          }}
        >
          ⚡
        </div>

        {/* Content */}
        <div style={{ textAlign: "center" }}>
          <h3
            style={{
              fontSize: "1.125rem",
              fontWeight: 800,
              color: "var(--color-text)",
              marginBottom: "0.5rem",
            }}
          >
            لقد وصلت إلى حد الباقة الحالية
          </h3>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
              lineHeight: 1.6,
            }}
          >
            لقد استهلكت الحد الأقصى المسموح به لـ <strong>{currentLabel}</strong> في باقتك الحالية
            {limitValue !== undefined && currentValue !== undefined && (
              <span> ({currentValue} من أصل {limitValue})</span>
            )}
            .
            <br />
            ترقية باقة اشتراكك تمكّنك من الاستمرار في تنمية متجرك وزيادة المبيعات.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button
            onClick={() => {
              onClose();
              const text = `مرحباً، أريد ترقية باقة متجري ${storeInfo?.name || ""} (${storeInfo?.slug || ""}) في منصة دكاني ⚡`;
              window.open(`https://wa.me/905350215375?text=${encodeURIComponent(text)}`, "_blank");
            }}
            className="btn-primary"
            style={{
              width: "100%",
              padding: "0.875rem",
              fontWeight: 800,
              fontSize: "0.9375rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            ترقية الباقة الآن 🚀
          </button>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{
              width: "100%",
              padding: "0.875rem",
              color: "var(--color-text-muted)",
              fontSize: "0.875rem",
              borderColor: "var(--color-border)",
            }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
