"use client";

/**
 * components/dashboard/ProductForm.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Shared Product Create / Edit Form
 *
 * Handles:
 *   - All product fields with Arabic labels & validation
 *   - ImageUpload integration
 *   - Category dropdown (fetched client-side)
 *   - is_active toggle
 *   - Submits to /api/products (POST for new, PUT for edit)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/dashboard/ImageUpload";
import { useToast } from "@/components/ui/Toast";
import { PRODUCT_NAME_MAX_CHARS } from "@/lib/constants";
import type { CategoryRow, ProductRow } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductFormProps {
  /** When provided, we're in edit mode. Null = create mode. */
  product?: ProductRow | null;
}

interface FormState {
  name:        string;
  price:       string;   // kept as string for input control, parsed on submit
  category_id: string;
  is_active:   boolean;
  sort_order:  string;
  image_url:   string | null;
}

interface FormErrors {
  name?:       string;
  price?:      string;
  category_id?: string;
  sort_order?: string;
  general?:    string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProductForm({ product }: ProductFormProps) {
  const router  = useRouter();
  const { toast } = useToast();
  const isEdit  = !!product;

  const [form, setForm] = useState<FormState>({
    name:        product?.name        ?? "",
    price:       product?.price != null ? String(product.price) : "",
    category_id: product?.category_id ?? "",
    is_active:   product?.is_active   ?? true,
    sort_order:  product?.sort_order  != null ? String(product.sort_order) : "0",
    image_url:   product?.image_url   ?? null,
  });

  const [errors, setErrors]       = useState<FormErrors>({});
  const [saving, setSaving]       = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  // ── Fetch categories for select ───────────────────────────────────────────
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((j) => setCategories(j.data ?? []))
      .catch(() => {});
  }, []);

  // ── Field change helpers ──────────────────────────────────────────────────
  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
    };

  const setImageUrl = useCallback((url: string) => {
    setForm((prev) => ({ ...prev, image_url: url }));
  }, []);

  const clearImage = useCallback(() => {
    setForm((prev) => ({ ...prev, image_url: null }));
  }, []);

  // ── Client-side validation ────────────────────────────────────────────────
  function validate(): boolean {
    const errs: FormErrors = {};

    if (!form.name.trim()) {
      errs.name = "اسم المنتج مطلوب";
    } else if (form.name.trim().length > PRODUCT_NAME_MAX_CHARS) {
      errs.name = `الاسم لا يتجاوز ${PRODUCT_NAME_MAX_CHARS} حرفاً`;
    }

    const priceNum = parseFloat(form.price);
    if (form.price === "" || isNaN(priceNum)) {
      errs.price = "السعر مطلوب";
    } else if (priceNum < 0) {
      errs.price = "السعر لا يقل عن 0";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        name:        form.name.trim(),
        price:       parseFloat(form.price),
        category_id: form.category_id || null,
        is_active:   form.is_active,
        sort_order:  parseInt(form.sort_order, 10) || 0,
        image_url:   form.image_url ?? null,
      };

      const url    = isEdit ? `/api/products?id=${product!.id}` : "/api/products";
      const method = isEdit ? "PUT" : "POST";

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.details && typeof json.details === "object") {
          setErrors(json.details as FormErrors);
        } else {
          setErrors({ general: json.error ?? "حدث خطأ غير متوقع" });
        }
        return;
      }

      toast.success(isEdit ? "تم تحديث المنتج بنجاح ✓" : "تمت إضافة المنتج بنجاح ✓");
      router.push("/dashboard/products");
      router.refresh();
    } catch {
      setErrors({ general: "خطأ في الاتصال. تأكد من اتصالك بالإنترنت." });
    } finally {
      setSaving(false);
    }
  };

  const nameLength = form.name.length;
  const nameNearLimit = nameLength > 50;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "600px", margin: "0 auto" }}
    >
      {/* Page title */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-icon"
          aria-label="رجوع"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
          {isEdit ? "تعديل المنتج" : "إضافة منتج جديد"}
        </h1>
      </div>

      {/* General error */}
      {errors.general && (
        <div
          style={{
            background:   "var(--color-danger-muted)",
            border:       "1.5px solid var(--color-danger)",
            borderRadius: "var(--radius-md)",
            padding:      "0.75rem 1rem",
            color:        "var(--color-danger)",
            fontSize:     "0.875rem",
            fontWeight:   600,
          }}
        >
          ⚠ {errors.general}
        </div>
      )}

      {/* ── Image ── */}
      <div className="card" style={{ padding: "1rem" }}>
        <ImageUpload
          currentImageUrl={form.image_url}
          onUploadComplete={setImageUrl}
          onClear={clearImage}
          disabled={saving}
        />
      </div>

      {/* ── Core fields ── */}
      <div className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Product name */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
            <label htmlFor="product-name" style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-muted)" }}>
              اسم المنتج <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <span
              style={{
                fontSize: "0.75rem",
                color:    nameNearLimit ? "var(--color-warning)" : "var(--color-text-faint)",
                fontWeight: nameNearLimit ? 700 : 400,
              }}
            >
              {nameLength} / {PRODUCT_NAME_MAX_CHARS}
            </span>
          </div>
          <input
            id="product-name"
            className={`input-base${errors.name ? " input-error" : ""}`}
            type="text"
            placeholder="مثال: جبنة بيضاء بينار 500 جرام"
            value={form.name}
            onChange={set("name")}
            maxLength={PRODUCT_NAME_MAX_CHARS}
            disabled={saving}
            required
          />
          {errors.name && (
            <p style={{ color: "var(--color-danger)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
              {errors.name}
            </p>
          )}
          {nameNearLimit && !errors.name && (
            <p style={{ color: "var(--color-warning)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
              ⚠ الأسماء الطويلة قد تُقطع في رسالة واتساب
            </p>
          )}
        </div>

        {/* Price */}
        <div>
          <label htmlFor="product-price" style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "0.375rem" }}>
            السعر بالليرة التركية <span style={{ color: "var(--color-danger)" }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="product-price"
              className={`input-base${errors.price ? " input-error" : ""}`}
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={form.price}
              onChange={set("price")}
              min={0}
              step="0.01"
              disabled={saving}
              required
              style={{ paddingLeft: "2.5rem" }}
            />
            <span
              style={{
                position:  "absolute",
                top:       "50%",
                left:      "1rem",
                transform: "translateY(-50%)",
                color:     "var(--color-text-faint)",
                fontWeight: 700,
                fontSize:  "1rem",
                pointerEvents: "none",
              }}
            >
              ₺
            </span>
          </div>
          {errors.price && (
            <p style={{ color: "var(--color-danger)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
              {errors.price}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="product-category" style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "0.375rem" }}>
            الفئة
          </label>
          <select
            id="product-category"
            className="input-base"
            value={form.category_id}
            onChange={set("category_id")}
            disabled={saving}
          >
            <option value="">— بدون فئة —</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Settings ── */}
      <div className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* is_active toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "0.9375rem", fontWeight: 700 }}>متوفر في المتجر</p>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
              {form.is_active ? "يظهر للعملاء ويمكن إضافته للسلة" : "مخفي عن العملاء"}
            </p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              disabled={saving}
              id="product-is-active"
            />
            <span className="toggle-track" />
            <span className="toggle-thumb" />
          </label>
        </div>

        <div className="divider" style={{ margin: 0 }} />

        {/* Sort order */}
        <div>
          <label htmlFor="product-sort-order" style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "0.375rem" }}>
            ترتيب العرض
          </label>
          <input
            id="product-sort-order"
            className="input-base"
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            value={form.sort_order}
            onChange={set("sort_order")}
            disabled={saving}
            style={{ width: "100px" }}
          />
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", marginTop: "0.25rem" }}>
            الأرقام الأصغر تظهر أولاً
          </p>
        </div>
      </div>

      {/* ── Submit ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", paddingBottom: "1rem" }}>
        <button
          id="save-product-btn"
          type="submit"
          disabled={saving}
          className="btn-primary"
          style={{ width: "100%", fontSize: "1rem", minHeight: "52px" }}
        >
          {saving
            ? "جاري الحفظ..."
            : isEdit
            ? "حفظ التعديلات"
            : "إضافة المنتج"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={saving}
          className="btn-ghost"
          style={{ width: "100%" }}
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
