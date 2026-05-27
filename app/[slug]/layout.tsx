/**
 * app/[slug]/layout.tsx
 * Minimal layout for public store pages — no dashboard chrome.
 * Inherits RTL/Cairo from root app/layout.tsx.
 */

import type { ReactNode } from "react";

export default function StoreLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
