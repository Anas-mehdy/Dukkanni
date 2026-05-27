"use client";

import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="تبديل المظهر"
      className="p-2 rounded-full bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] text-[var(--color-text)] cursor-pointer transition-all duration-200 shadow-sm flex items-center justify-center hover:scale-105"
      style={{ width: "38px", height: "38px" }}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
