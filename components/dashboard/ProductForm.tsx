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

interface ProductOptionValue {
  value: string;
  price: number | null;
}

interface ProductOption {
  name: string;
  hasCustomPrice: boolean;
  values: ProductOptionValue[];
}

interface FormState {
  name:        string;
  price:       string;   // kept as string for input control, parsed on submit
  category_id: string;
  is_active:   boolean;
  sort_order:  string;
  image_url:   string | null;
  options:     ProductOption[];
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
    options:     (product?.options as unknown as ProductOption[]) ?? [],
  });

  const addOption = () => {
    setForm((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        { name: "", hasCustomPrice: false, values: [] },
      ],
    }));
  };

  const removeOption = (index: number) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const updateOption = (index: number, fields: Partial<ProductOption>) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === index ? { ...opt, ...fields } : opt
      ),
    }));
  };

  const updateOptionName = (index: number, name: string) => {
    updateOption(index, { name });
  };

  const updateOptionPriceToggle = (index: number, checked: boolean) => {
    const opt = form.options[index];
    const newValues = opt.values.map((v) => ({
      ...v,
      price: checked ? (v.price ?? 0) : null,
    }));
    updateOption(index, { hasCustomPrice: checked, values: newValues });
  };

  const updateOptionValuePrice = (optIdx: number, valIdx: number, rawPrice: string) => {
    setForm((prev) => {
      const newOptions = [...prev.options];
      const opt = { ...newOptions[optIdx] };
      const vals = [...opt.values];
      const parsedPrice = parseFloat(rawPrice);
      vals[valIdx] = {
        ...vals[valIdx],
        price: rawPrice === "" || isNaN(parsedPrice) ? null : parsedPrice,
      };
      opt.values = vals;
      newOptions[optIdx] = opt;
      return { ...prev, options: newOptions };
    });
  };

  const handleValuesChange = (index: number, rawText: string) => {
    const inputNames = rawText.split(/[,،]/).map((v) => v.trim()).filter((v) => v.length > 0);
    const currentValues = form.options[index].values;
    
    const newValues = inputNames.map((name) => {
      const existing = currentValues.find((cv) => cv.value === name);
      return {
        value: name,
        price: existing ? existing.price : null,
      };
    });

    updateOption(index, { values: newValues });
  };

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

    // Validate options
    form.options.forEach((opt, idx) => {
      if (!opt.name.trim()) {
        errs.general = `يرجى تحديد اسم الخيار رقم ${idx + 1}`;
      }
      if (opt.values.length === 0) {
        errs.general = `يرجى إضافة قيمة واحدة على الأقل للخيار "${opt.name || (idx + 1)}"`;
      }
    });

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
        options:     form.options.filter((opt) => opt.name.trim().length > 0 && opt.values.length > 0),
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

      {/* ── Product Options Section ── */}
      <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--color-text)" }}>خيارات المنتج الإضافية</h3>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
            أضف مقاسات، ألوان، أو أحجام مختلفة لمنتجك بأسعار إضافية مخصصة. (اختياري)
          </p>
        </div>

        {form.options.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {form.options.map((opt, optIdx) => (
              <div
                key={optIdx}
                className="card-2"
                style={{
                  padding: "1rem",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.875rem",
                  borderColor: "var(--color-border-light)"
                }}
              >
                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => removeOption(optIdx)}
                  style={{
                    position: "absolute",
                    top: "0.75rem",
                    left: "0.75rem",
                    background: "none",
                    border: "none",
                    color: "var(--color-danger)",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                  }}
                >
                  حذف الخيار ✕
                </button>

                {/* Option Name Input */}
                <div style={{ maxWidth: "80%" }}>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "0.375rem" }}>
                    اسم الخيار (مثال: المقاس، الحجم، اللون)
                  </label>
                  <input
                    type="text"
                    className="input-base"
                    placeholder="مثال: الحجم"
                    value={opt.name}
                    onChange={(e) => updateOptionName(optIdx, e.target.value)}
                    disabled={saving}
                    style={{ fontSize: "0.875rem", padding: "0.625rem 0.875rem" }}
                  />
                </div>

                {/* Values Input (Comma separated) */}
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "0.375rem" }}>
                    القيم (مفصولة بفواصل)
                  </label>
                  <input
                    type="text"
                    className="input-base"
                    placeholder="مثال: 100 مل, 200 مل, 500 مل"
                    value={opt.values.map((v) => v.value).join(", ")}
                    onChange={(e) => handleValuesChange(optIdx, e.target.value)}
                    disabled={saving}
                    style={{ fontSize: "0.875rem", padding: "0.625rem 0.875rem" }}
                  />
                  <span style={{ fontSize: "0.7rem", color: "var(--color-text-faint)", marginTop: "0.25rem", display: "block" }}>
                    اكتب القيم وافصل بينها بفاصلة لإنشائها تلقائياً
                  </span>
                </div>

                {/* Has Custom Price Toggle */}
                {opt.values.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                    <input
                      type="checkbox"
                      id={`custom-price-toggle-${optIdx}`}
                      checked={opt.hasCustomPrice}
                      onChange={(e) => updateOptionPriceToggle(optIdx, e.target.checked)}
                      disabled={saving}
                      style={{
                        width: "16px",
                        height: "16px",
                        accentColor: "var(--color-primary)",
                        cursor: "pointer"
                      }}
                    />
                    <label
                      htmlFor={`custom-price-toggle-${optIdx}`}
                      style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-text-muted)", cursor: "pointer" }}
                    >
                      هل تريد تحديد سعر إضافي خاص لكل قيمة؟
                    </label>
                  </div>
                )}

                {/* Custom price modifier inputs */}
                {opt.hasCustomPrice && opt.values.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                      gap: "0.625rem",
                      background: "var(--color-surface-3)",
                      padding: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      marginTop: "0.25rem"
                    }}
                  >
                    {opt.values.map((val, valIdx) => (
                      <div key={valIdx}>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
                          + {val.value}
                        </label>
                        <div style={{ position: "relative" }}>
                          <input
                            type="number"
                            className="input-base"
                            placeholder="0.00"
                            value={val.price === null ? "" : val.price}
                            onChange={(e) => updateOptionValuePrice(optIdx, valIdx, e.target.value)}
                            disabled={saving}
                            min={0}
                            step="0.01"
                            style={{
                              fontSize: "0.8125rem",
                              padding: "0.5rem 0.5rem 0.5rem 1.75rem",
                              textAlign: "right"
                            }}
                          />
                          <span
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "0.5rem",
                              transform: "translateY(-50%)",
                              fontSize: "0.75rem",
                              color: "var(--color-text-faint)",
                              pointerEvents: "none"
                            }}
                          >
                            ₺
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addOption}
          disabled={saving}
          className="btn-ghost"
          style={{
            width: "100%",
            fontSize: "0.875rem",
            minHeight: "44px",
            borderStyle: "dashed",
            borderColor: "var(--color-primary)"
          }}
        >
          + إضافة خيار للمنتج
        </button>

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
