"use client";

/**
 * app/(dashboard)/products/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Product Catalog Management
 *
 * Features:
 *   - Search bar with debounce
 *   - Category filter chips
 *   - Product list (WhatsApp Business catalog style)
 *   - Instant is_active inline toggle
 *   - Skeleton loading state
 *   - FAB (Floating Action Button) to add new product
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { getCurrencySymbol } from "@/lib/constants";
import type { CategoryRow, ProductRow } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductWithCategory extends ProductRow {
  categories: Pick<CategoryRow, "id" | "name"> | null;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ProductSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: "80px", borderRadius: "var(--radius-md)" }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product row
// ---------------------------------------------------------------------------

function ProductRow({
  product,
  currencySymbol,
  onToggle,
  onDelete,
}: {
  product: ProductWithCategory;
  currencySymbol: string;
  onToggle: (id: string, current: boolean) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setToggling(true);
    await onToggle(product.id, product.is_active);
    setToggling(false);
  };

  return (
    <div
      className="card-2"
      style={{
        display:    "flex",
        alignItems: "center",
        gap:        "0.75rem",
        padding:    "0.75rem",
        opacity:    product.is_active ? 1 : 0.6,
        transition: "opacity 0.2s",
      }}
    >
      {/* Product image */}
      <div
        style={{
          width:        "60px",
          height:       "60px",
          borderRadius: "var(--radius-sm)",
          overflow:     "hidden",
          flexShrink:   0,
          background:   "var(--color-surface-3)",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
        }}
      >
        {product.image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={product.image_url}
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: "1.5rem", opacity: 0.4 }}>📦</span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight:   700,
            fontSize:     "0.9375rem",
            color:        "var(--color-text)",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}
        >
          {product.name}
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--color-primary)", fontWeight: 700, marginTop: "2px" }}>
          {product.price.toLocaleString("ar")} {currencySymbol}
        </p>
        {product.categories && (
          <span
            className="badge badge-primary"
            style={{ marginTop: "4px", fontSize: "0.6875rem" }}
          >
            {product.categories.name}
          </span>
        )}
      </div>

      {/* Right side actions */}
      <div
        style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem", flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* is_active toggle */}
        <label
          className="toggle"
          style={{ gap: "0.375rem" }}
          title={product.is_active ? "متوفر" : "غير متوفر"}
        >
          <input
            type="checkbox"
            checked={product.is_active}
            onChange={handleToggle}
            disabled={toggling}
            aria-label={`تبديل توفر ${product.name}`}
          />
          <span className="toggle-track" />
          <span className="toggle-thumb" />
        </label>
        <span style={{ fontSize: "0.6875rem", color: product.is_active ? "var(--color-success)" : "var(--color-text-faint)", fontWeight: 600 }}>
          {product.is_active ? "متوفر" : "غير متوفر"}
        </span>

        {/* Edit / Delete */}
        <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.25rem" }}>
          <Link
            href={`/dashboard/products/${product.id}`}
            id={`edit-product-${product.id}`}
            className="btn-icon"
            aria-label={`تعديل ${product.name}`}
            style={{ width: "34px", height: "34px" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </Link>

          {confirmDel ? (
            <button
              className="btn-icon"
              onClick={() => onDelete(product.id)}
              aria-label="تأكيد الحذف"
              style={{ width: "34px", height: "34px", color: "var(--color-danger)", borderColor: "var(--color-danger)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
          ) : (
            <button
              className="btn-icon"
              onClick={() => setConfirmDel(true)}
              aria-label={`حذف ${product.name}`}
              style={{ width: "34px", height: "34px" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProductsPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [products, setProducts]     = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [currencySymbol, setCurrencySymbol] = useState("₺");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Fetch categories (for filter chips) ──────────────────────────────────
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((j) => setCategories(j.data ?? []))
      .catch(() => {});
  }, []);

  // ── Fetch store currency ──────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/store")
      .then((r) => r.json())
      .then((j) => { if (j.data?.currency_code) setCurrencySymbol(getCurrencySymbol(j.data.currency_code)); })
      .catch(() => {});
  }, []);

  // ── Fetch products (with debounced search) ────────────────────────────────
  const fetchProducts = useCallback(async (q: string, cat: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q)            params.set("search", q);
      if (cat !== "all") params.set("category", cat);
      const res  = await fetch(`/api/products?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "خطأ في جلب المنتجات");
      setProducts(json.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطأ في جلب المنتجات");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchProducts(search, activeCategory), 300);
    return () => clearTimeout(searchTimer.current);
  }, [search, activeCategory, fetchProducts]);

  // ── Toggle is_active ──────────────────────────────────────────────────────
  const handleToggle = async (id: string, currentValue: boolean) => {
    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => p.id === id ? { ...p, is_active: !currentValue } : p)
    );
    try {
      const res = await fetch(`/api/products?id=${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ is_active: !currentValue }),
      });
      if (!res.ok) throw new Error();
      toast.success(currentValue ? "المنتج أصبح غير متوفر" : "المنتج أصبح متوفراً ✓");
    } catch {
      // Revert on failure
      setProducts((prev) =>
        prev.map((p) => p.id === id ? { ...p, is_active: currentValue } : p)
      );
      toast.error("خطأ في تحديث حالة المنتج");
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      const res  = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "خطأ في حذف المنتج");
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("تم حذف المنتج");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطأ في حذف المنتج");
    }
  };

  const activeCount   = products.filter((p) => p.is_active).length;
  const inactiveCount = products.length - activeCount;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", paddingBottom: "5rem" }}>

      {/* Page header */}
      <div style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800 }}>المنتجات</h1>
        {!loading && (
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
            {products.length} منتج — {activeCount} متوفر
            {inactiveCount > 0 && ` · ${inactiveCount} غير متوفر`}
          </p>
        )}
      </div>

      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: "0.75rem" }}>
        <svg
          width="18" height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-text-faint)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ position: "absolute", top: "50%", right: "1rem", transform: "translateY(-50%)", pointerEvents: "none" }}
        >
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          id="product-search"
          className="input-base"
          type="search"
          placeholder="ابحث عن منتج..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingRight: "2.75rem" }}
        />
      </div>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div
          style={{
            display:    "flex",
            gap:        "0.5rem",
            overflowX:  "auto",
            paddingBottom: "0.5rem",
            marginBottom: "0.75rem",
            scrollbarWidth: "none",
          }}
        >
          {[{ id: "all", name: "الكل" }, ...categories].map((cat) => (
            <button
              key={cat.id}
              id={`filter-${cat.id}`}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                flexShrink:   0,
                padding:      "0.375rem 0.875rem",
                borderRadius: "var(--radius-full)",
                border:       `1.5px solid ${activeCategory === cat.id ? "var(--color-primary)" : "var(--color-border)"}`,
                background:   activeCategory === cat.id ? "var(--color-primary-muted)" : "var(--color-surface-2)",
                color:        activeCategory === cat.id ? "var(--color-primary)" : "var(--color-text-muted)",
                fontFamily:   "var(--font-cairo), sans-serif",
                fontWeight:   activeCategory === cat.id ? 700 : 500,
                fontSize:     "0.8125rem",
                cursor:       "pointer",
                transition:   "all 0.15s",
                whiteSpace:   "nowrap",
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Products list */}
      {loading ? (
        <ProductSkeleton />
      ) : products.length === 0 ? (
        <div className="card" style={{ padding: "2.5rem 1rem", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📦</div>
          <p style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>
            {search || activeCategory !== "all" ? "لا توجد نتائج" : "لا توجد منتجات بعد"}
          </p>
          {!search && activeCategory === "all" && (
            <button
              onClick={() => { router.push("/dashboard/products/new"); }}
              className="btn-primary"
              style={{ marginTop: "1rem" }}
            >
              إضافة أول منتج
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              currencySymbol={currencySymbol}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* FAB — add new product */}
      <Link
        href="/dashboard/products/new"
        id="fab-add-product"
        aria-label="إضافة منتج جديد"
        style={{
          position:       "fixed",
          bottom:         "calc(var(--bottom-nav-h) + 1.25rem)",
          left:           "50%",
          transform:      "translateX(-50%)",
          display:        "flex",
          alignItems:     "center",
          gap:            "0.5rem",
          background:     "var(--color-primary)",
          color:          "#fff",
          border:         "none",
          borderRadius:   "var(--radius-full)",
          padding:        "0.875rem 1.75rem",
          fontFamily:     "var(--font-cairo), sans-serif",
          fontSize:       "0.9375rem",
          fontWeight:     700,
          textDecoration: "none",
          boxShadow:      "0 4px 20px var(--color-primary-glow), var(--shadow-md)",
          zIndex:         50,
          transition:     "transform 0.15s, box-shadow 0.15s",
          whiteSpace:     "nowrap",
        }}
      >
        <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>+</span>
        إضافة منتج جديد
      </Link>
    </div>
  );
}
