"use client";

/**
 * app/(dashboard)/products/new/page.tsx
 * Create new product — thin wrapper around the shared ProductForm.
 */

import ProductForm from "@/components/dashboard/ProductForm";

export default function NewProductPage() {
  return <ProductForm product={null} />;
}
