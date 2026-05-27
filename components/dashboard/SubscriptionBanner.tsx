"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface SubscriptionBannerProps {
  planType: string;
  trialEndsAt: string;
}

export default function SubscriptionBanner({ planType, trialEndsAt }: SubscriptionBannerProps) {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!trialEndsAt) return;
    const calculateDays = () => {
      const trialEnds = new Date(trialEndsAt);
      const diffTime = trialEnds.getTime() - new Date().getTime();
      const days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      setDaysRemaining(days);
    };

    calculateDays();
    // Re-verify every hour
    const timer = setInterval(calculateDays, 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [trialEndsAt]);

  if (planType !== "trial") return null;

  return (
    <div
      style={{
        position: "sticky",
        top: "var(--header-h)",
        left: 0,
        right: 0,
        zIndex: 90,
        background: "linear-gradient(90deg, rgba(217, 119, 6, 0.9) 0%, rgba(245, 158, 11, 0.9) 100%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(245, 158, 11, 0.2)",
        padding: "0.625rem 1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        fontSize: "0.8125rem",
        fontWeight: 700,
        fontFamily: "var(--font-cairo), sans-serif",
        textAlign: "center",
        direction: "rtl",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
        <span>
          ⏳ أنت في الفترة التجريبية المجانية، متبقي لك{" "}
          <strong style={{ textDecoration: "underline", fontSize: "0.875rem" }}>
            {daysRemaining !== null ? daysRemaining : "..."}
          </strong>{" "}
          أيام للاستفادة من كامل الميزات.
        </span>
        <Link
          href="/subscription"
          style={{
            background: "#ffffff",
            color: "#d97706",
            padding: "0.2rem 0.75rem",
            borderRadius: "var(--radius-full)",
            fontSize: "0.75rem",
            fontWeight: 800,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          اشترك الآن ←
        </Link>
      </div>
    </div>
  );
}
