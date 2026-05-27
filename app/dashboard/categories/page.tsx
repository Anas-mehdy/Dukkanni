"use client";

/**
 * app/(dashboard)/categories/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Category Management Page
 *
 * Features:
 *   - Inline add form (no modal)
 *   - Edit in-place (tap row → expands editor)
 *   - Up/Down sort order controls
 *   - Delete with confirmation guard
 *   - Skeleton loading state
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import type { CategoryRow } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryWithEditing extends CategoryRow {
  _editing?: boolean;
  _editName?: string;
  _editOrder?: number;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function CategorySkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: "64px", borderRadius: "var(--radius-md)" }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CategoriesPage() {
  const { toast } = useToast();

  const [categories, setCategories]   = useState<CategoryWithEditing[]>([]);
  const [loading, setLoading]         = useState(true);
  const [adding, setAdding]           = useState(false);
  const [newName, setNewName]         = useState("");
  const [newOrder, setNewOrder]       = useState(0);
  const [saving, setSaving]           = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/categories");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "خطأ في جلب الفئات");
      setCategories(json.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطأ في جلب الفئات");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // ── Add ───────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newName.trim()) { toast.error("اسم الفئة مطلوب"); return; }
    setSaving(true);
    try {
      const res  = await fetch("/api/categories", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: newName.trim(), sort_order: newOrder }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "خطأ في إضافة الفئة");
      setCategories((prev) => [...prev, json.data]);
      setNewName("");
      setNewOrder(0);
      setAdding(false);
      toast.success("تمت إضافة الفئة بنجاح ✓");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطأ في إضافة الفئة");
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle edit ───────────────────────────────────────────────────────────
  const toggleEdit = (id: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, _editing: !c._editing, _editName: c.name, _editOrder: c.sort_order }
          : { ...c, _editing: false }
      )
    );
    setConfirmDelete(null);
  };

  // ── Save edit ─────────────────────────────────────────────────────────────
  const handleSaveEdit = async (cat: CategoryWithEditing) => {
    if (!cat._editName?.trim()) { toast.error("اسم الفئة مطلوب"); return; }
    setSaving(true);
    try {
      const res  = await fetch(`/api/categories?id=${cat.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: cat._editName.trim(), sort_order: cat._editOrder ?? 0 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "خطأ في تحديث الفئة");
      setCategories((prev) =>
        prev.map((c) =>
          c.id === cat.id
            ? { ...json.data, _editing: false }
            : c
        )
      );
      toast.success("تم تحديث الفئة ✓");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطأ في تحديث الفئة");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res  = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "خطأ في حذف الفئة");
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setConfirmDelete(null);
      toast.success("تم حذف الفئة");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطأ في حذف الفئة");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Sort helpers ──────────────────────────────────────────────────────────
  const moveSort = async (cat: CategoryWithEditing, direction: "up" | "down") => {
    const idx   = categories.findIndex((c) => c.id === cat.id);
    const other = direction === "up" ? categories[idx - 1] : categories[idx + 1];
    if (!other) return;

    // Optimistic swap
    const newOrder1 = other.sort_order;
    const newOrder2 = cat.sort_order;

    setCategories((prev) =>
      prev
        .map((c) => {
          if (c.id === cat.id)   return { ...c, sort_order: newOrder1 };
          if (c.id === other.id) return { ...c, sort_order: newOrder2 };
          return c;
        })
        .sort((a, b) => a.sort_order - b.sort_order)
    );

    try {
      await Promise.all([
        fetch(`/api/categories?id=${cat.id}`,   { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: newOrder1 }) }),
        fetch(`/api/categories?id=${other.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: newOrder2 }) }),
      ]);
    } catch {
      toast.error("خطأ في تغيير الترتيب");
      fetchCategories(); // revert
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-text)" }}>
            الفئات
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
            {categories.length} فئة
          </p>
        </div>
        <button
          id="add-category-btn"
          onClick={() => { setAdding(true); setNewName(""); setNewOrder(categories.length); }}
          className="btn-primary"
          style={{ fontSize: "0.875rem", padding: "0.6rem 1rem", minHeight: "42px", gap: "0.375rem" }}
        >
          <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>+</span>
          إضافة فئة
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div
          className="card-2"
          style={{ padding: "1rem", marginBottom: "1rem", borderColor: "var(--color-primary)" }}
        >
          <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-primary)", marginBottom: "0.75rem" }}>
            فئة جديدة
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <input
              id="new-category-name"
              className="input-base"
              type="text"
              placeholder="اسم الفئة (مثال: ألبان، مشروبات)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
              maxLength={60}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", flexShrink: 0 }}>
                ترتيب العرض:
              </label>
              <input
                className="input-base"
                type="number"
                min={0}
                max={999}
                value={newOrder}
                onChange={(e) => setNewOrder(Number(e.target.value))}
                style={{ width: "80px", textAlign: "center" }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button id="save-category-btn" onClick={handleAdd} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button onClick={() => setAdding(false)} className="btn-ghost" style={{ flex: 1 }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <CategorySkeleton />
      ) : categories.length === 0 ? (
        <div
          className="card"
          style={{ padding: "2.5rem 1rem", textAlign: "center" }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📂</div>
          <p style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>لا توجد فئات بعد</p>
          <p style={{ color: "var(--color-text-faint)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
            أضف فئتك الأولى لتنظيم منتجاتك
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {categories.map((cat, idx) => (
            <div key={cat.id} className="card-2" style={{ overflow: "visible" }}>
              {/* Row */}
              <div
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  gap:            "0.625rem",
                  padding:        "0.875rem 1rem",
                  cursor:         "pointer",
                  borderRadius:   "var(--radius-md)",
                  transition:     "background 0.15s",
                }}
                onClick={() => toggleEdit(cat.id)}
              >
                {/* Sort order badge */}
                <span
                  style={{
                    minWidth:       "28px",
                    height:         "28px",
                    background:     "var(--color-primary-muted)",
                    color:          "var(--color-primary)",
                    borderRadius:   "var(--radius-sm)",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    fontSize:       "0.75rem",
                    fontWeight:     700,
                    flexShrink:     0,
                  }}
                >
                  {cat.sort_order}
                </span>

                {/* Name */}
                <span style={{ flex: 1, fontWeight: 600, fontSize: "0.9375rem", color: "var(--color-text)" }}>
                  {cat.name}
                </span>

                {/* Sort buttons */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: "2px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="btn-icon"
                    style={{ width: "28px", height: "28px", border: "none", background: "transparent" }}
                    onClick={() => moveSort(cat, "up")}
                    disabled={idx === 0}
                    aria-label="تحريك للأعلى"
                    title="تحريك للأعلى"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
                  </button>
                  <button
                    className="btn-icon"
                    style={{ width: "28px", height: "28px", border: "none", background: "transparent" }}
                    onClick={() => moveSort(cat, "down")}
                    disabled={idx === categories.length - 1}
                    aria-label="تحريك للأسفل"
                    title="تحريك للأسفل"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </div>

                {/* Edit chevron */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-text-faint)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ transition: "transform 0.2s", transform: cat._editing ? "rotate(-90deg)" : "rotate(90deg)" }}
                >
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>

              {/* Edit panel */}
              {cat._editing && (
                <div style={{ padding: "0 1rem 1rem 1rem", borderTop: "1px solid var(--color-border)" }}>
                  <div style={{ paddingTop: "0.875rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                    <input
                      className="input-base"
                      type="text"
                      placeholder="اسم الفئة"
                      value={cat._editName ?? cat.name}
                      onChange={(e) =>
                        setCategories((prev) =>
                          prev.map((c) => c.id === cat.id ? { ...c, _editName: e.target.value } : c)
                        )
                      }
                      maxLength={60}
                      autoFocus
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <label style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", flexShrink: 0 }}>
                        ترتيب العرض:
                      </label>
                      <input
                        className="input-base"
                        type="number"
                        min={0}
                        max={999}
                        value={cat._editOrder ?? cat.sort_order}
                        onChange={(e) =>
                          setCategories((prev) =>
                            prev.map((c) => c.id === cat.id ? { ...c, _editOrder: Number(e.target.value) } : c)
                          )
                        }
                        style={{ width: "80px", textAlign: "center" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button onClick={() => handleSaveEdit(cat)} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
                        {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
                      </button>
                      {confirmDelete === cat.id ? (
                        <button
                          onClick={() => handleDelete(cat.id)}
                          disabled={deletingId === cat.id}
                          className="btn-danger"
                          style={{ flex: 1 }}
                        >
                          {deletingId === cat.id ? "جاري الحذف..." : "تأكيد الحذف"}
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(cat.id)}
                          className="btn-ghost"
                          style={{ flex: 1, color: "var(--color-danger)", borderColor: "var(--color-danger)" }}
                        >
                          حذف
                        </button>
                      )}
                    </div>
                    {confirmDelete === cat.id && (
                      <p style={{ fontSize: "0.75rem", color: "var(--color-danger)", textAlign: "center" }}>
                        ⚠ سيتم إلغاء ربط المنتجات بهذه الفئة (لن تُحذف المنتجات)
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
