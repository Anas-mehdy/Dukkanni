"use client";

/**
 * app/(dashboard)/products/[id]/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Edit Product page — fetches the product by ID then renders ProductForm.
 * Shows a skeleton while loading and a 404 message if not found.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProductForm from "@/components/dashboard/ProductForm";
import type { ProductRow } from "@/types/database";

function EditSkeleton() {
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="skeleton" style={{ height: "40px", width: "60%", borderRadius: "var(--radius-md)" }} />
      <div className="skeleton" style={{ height: "200px", borderRadius: "var(--radius-lg)" }} />
      <div className="skeleton" style={{ height: "200px", borderRadius: "var(--radius-lg)" }} />
      <div className="skeleton" style={{ height: "120px", borderRadius: "var(--radius-lg)" }} />
    </div>
  );
}

export default function EditProductPage() {
  const { id }           = useParams<{ id: string }>();
  const router           = useRouter();
  const [product, setProduct] = useState<ProductRow | null | "not_found">(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/products?id=${id}`)
      .then((r) => r.json())
      .then((j) => {
        // The list endpoint returns an array — find our product
        const found = Array.isArray(j.data)
          ? j.data.find((p: ProductRow) => p.id === id) ?? "not_found"
          : "not_found";
        setProduct(found);
      })
      .catch(() => setProduct("not_found"));
  }, [id]);

  if (product === null) return <EditSkeleton />;

  if (product === "not_found") {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center", paddingTop: "3rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text)" }}>
          المنتج غير موجود
        </h2>
        <p style={{ color: "var(--color-text-muted)", marginTop: "0.5rem", marginBottom: "1.5rem" }}>
          ربما تم حذفه أو أن الرابط غير صحيح.
        </p>
        <button onClick={() => router.push("/dashboard/products")} className="btn-primary">
          العودة إلى المنتجات
        </button>
      </div>
    );
  }

  return <ProductForm product={product} />;
}
