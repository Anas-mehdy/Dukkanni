"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import { useToast } from "@/components/ui/Toast";
import UpgradePlanModal from "@/components/dashboard/UpgradePlanModal";

interface RowData {
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  images: string[];
}

interface ValidationError {
  row: number;
  errors: string[];
}

export default function ImportWizard() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [rawData, setRawData] = useState<RowData[]>([]);
  const [validation, setValidation] = useState<{
    errors: ValidationError[];
    newCategoriesList: string[];
    limitsViolated: string[];
  }>({ errors: [], newCategoriesList: [], limitsViolated: [] });

  const [planUsage, setPlanUsage] = useState<any>(null);
  const [currentCategories, setCurrentCategories] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalType, setUpgradeModalType] = useState<string>("products");

  // Fetch current store stats and categories on mount
  useEffect(() => {
    const initData = async () => {
      try {
        const usageRes = await fetch("/api/store/plan-usage");
        const usageData = await usageRes.json();
        if (usageRes.ok) {
          setPlanUsage(usageData.data);
        }

        const catsRes = await fetch("/api/categories");
        const catsData = await catsRes.json();
        if (catsRes.ok) {
          const catNames = new Set<string>((catsData.data || []).map((c: any) => c.name.toLowerCase().trim()));
          setCurrentCategories(catNames);
        }
      } catch (err) {
        console.error("Failed to load initial import state:", err);
      }
    };
    initData();
  }, []);

  // Run validation when data or plan/category states change
  useEffect(() => {
    if (rawData.length === 0 || !planUsage) return;

    const errors: ValidationError[] = [];
    const newCategories = new Set<string>();

    rawData.forEach((p, idx) => {
      const rowErrors: string[] = [];
      const rowNum = idx + 1;

      // 1. Name Check
      if (!p.name) {
        rowErrors.push("اسم المنتج مطلوب.");
      } else if (p.name.length > 60) {
        rowErrors.push("اسم المنتج طويل جداً (الحد الأقصى 60 حرفاً).");
      }

      // 2. Price Check
      if (p.price === null || p.price === undefined || p.price < 0) {
        rowErrors.push("السعر مطلوب ويجب أن يكون 0 أو أكبر.");
      } else if (p.price > 9999999.99) {
        rowErrors.push("السعر مرتفع جداً (الحد الأقصى 9,999,999.99).");
      }

      // 3. Category Check
      if (p.category && p.category.length > 60) {
        rowErrors.push("اسم الفئة طويل جداً (الحد الأقصى 60 حرفاً).");
      } else if (p.category) {
        const catLower = p.category.toLowerCase().trim();
        if (!currentCategories.has(catLower)) {
          newCategories.add(p.category.trim());
        }
      }

      // 4. Image URL checks
      const urlPattern = /^https?:\/\/.+/;
      if (p.image_url && !urlPattern.test(p.image_url)) {
        rowErrors.push("رابط الصورة الأولى غير صالح.");
      }
      p.images.forEach((img: string, imgIdx: number) => {
        if (!urlPattern.test(img)) {
          rowErrors.push(`رابط الصورة رقم ${imgIdx + 1} غير صالح.`);
        }
      });

      // 5. Image limits per product check
      if (planUsage.limits.maxImagesPerProduct !== -1 && p.images.length > planUsage.limits.maxImagesPerProduct) {
        rowErrors.push(`عدد الصور (${p.images.length}) يتجاوز الحد الأقصى المسموح به في الباقة الحالية (${planUsage.limits.maxImagesPerProduct} صور للمنتج).`);
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, errors: rowErrors });
      }
    });

    // 6. Plan limits check
    const totalNewProducts = rawData.length;
    const totalNewCategories = newCategories.size;
    const limitsViolated: string[] = [];

    if (planUsage.limits.maxProducts !== -1 && planUsage.usage.products + totalNewProducts > planUsage.limits.maxProducts) {
      limitsViolated.push(
        `تتجاوز المنتجات المستوردة (${totalNewProducts}) الحد الأقصى للمنتجات في باقتك الحالية (المسموح لك بإضافته: ${Math.max(0, planUsage.limits.maxProducts - planUsage.usage.products)} منتج).`
      );
    }

    if (planUsage.limits.maxCategories !== -1 && planUsage.usage.categories + totalNewCategories > planUsage.limits.maxCategories) {
      limitsViolated.push(
        `تتجاوز الفئات الجديدة المطلوب إنشاؤها (${totalNewCategories}) الحد الأقصى للفئات في باقتك الحالية (المسموح لك بإضافته: ${Math.max(0, planUsage.limits.maxCategories - planUsage.usage.categories)} فئة).`
      );
    }

    setValidation({
      errors,
      newCategoriesList: Array.from(newCategories),
      limitsViolated,
    });
  }, [rawData, planUsage, currentCategories]);

  // Parsing Excel/CSV files via SheetJS
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension !== "csv" && extension !== "xlsx") {
        toast.error("صيغة الملف غير مدعومة. يرجى رفع ملف Excel أو CSV فقط.");
        return;
      }
      parseFile(file);
    }
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        if (rows.length === 0) {
          toast.error("الملف المرفوع فارغ أو لا يحتوي على بيانات صحيحة.");
          return;
        }

        const mapped = rows.map((r: any) => {
          const keys = Object.keys(r);
          const findKey = (patterns: string[]) => {
            return keys.find(k => patterns.some(p => k.trim().toLowerCase() === p.toLowerCase()));
          };

          const nameKey = findKey(["Product Name", "اسم المنتج", "name", "الاسم"]);
          const descKey = findKey(["Description", "الوصف", "desc", "وصف المنتج"]);
          const priceKey = findKey(["Price", "السعر", "price", "سعر المنتج"]);
          const catKey = findKey(["Category", "الفئة", "category", "فئة المنتج"]);
          const img1Key = findKey(["Image URL 1", "رابط الصورة 1", "image 1", "الصورة 1", "image_url"]);
          const img2Key = findKey(["Image URL 2", "رابط الصورة 2", "image 2", "الصورة 2"]);
          const img3Key = findKey(["Image URL 3", "رابط الصورة 3", "image 3", "الصورة 3"]);

          const name = nameKey ? String(r[nameKey] ?? "").trim() : "";
          const description = descKey ? String(r[descKey] ?? "").trim() : "";

          let price = 0;
          if (priceKey) {
            const rawVal = r[priceKey];
            if (typeof rawVal === "number") {
              price = rawVal;
            } else if (rawVal) {
              const cleaned = String(rawVal).replace(/[^\d.]/g, "");
              const parsed = parseFloat(cleaned);
              price = isNaN(parsed) ? -1 : parsed;
            }
          }

          const category = catKey ? String(r[catKey] ?? "").trim() : "";
          const img1 = img1Key ? String(r[img1Key] ?? "").trim() : "";
          const img2 = img2Key ? String(r[img2Key] ?? "").trim() : "";
          const img3 = img3Key ? String(r[img3Key] ?? "").trim() : "";

          const images = [img1, img2, img3].filter(url => url.length > 0);

          return {
            name,
            description,
            price,
            category,
            image_url: img1 || null,
            images,
          };
        });

        setRawData(mapped);
        setStep(2);
      } catch (err) {
        console.error(err);
        toast.error("فشل في تحليل ملف البيانات المرفوع.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportSubmit = async () => {
    if (importing) return;
    setImporting(true);

    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: rawData,
          categories: validation.newCategoriesList,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json.error === "PLAN_LIMIT_REACHED") {
          setUpgradeModalType(json.limitType);
          setShowUpgradeModal(true);
          throw new Error(json.message || "لقد تجاوزت حدود الباقة الحالية.");
        }
        throw new Error(json.error || "فشل استيراد المنتجات.");
      }

      toast.success(`تم استيراد ${json.data.importedProductsCount} منتجات و إنشاء ${json.data.createdCategoriesCount} فئة جديدة بنجاح! 🎉`);
      router.push("/dashboard/products");
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ ما أثناء إتمام عملية الاستيراد");
    } finally {
      setImporting(false);
    }
  };

  const handleTriggerUpgrade = (type: "products" | "categories" | "images") => {
    setUpgradeModalType(type);
    setShowUpgradeModal(true);
  };

  return (
    <div style={{ paddingBottom: "3rem", fontFamily: "var(--font-cairo), sans-serif", direction: "rtl" }}>
      {/* Back button */}
      <Link
        href="/dashboard/products"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          color: "var(--color-text-muted)",
          textDecoration: "none",
          fontSize: "0.8125rem",
          fontWeight: 700,
          marginBottom: "1rem",
        }}
      >
        ← العودة لقائمة المنتجات
      </Link>

      {/* Title */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-text)" }}>📥 استيراد المنتجات جماعياً</h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
          قم برفع ملف Excel أو CSV لإضافة المنتجات وإنشاء الفئات تلقائياً بضغطة زر واحدة.
        </p>
      </div>

      {/* Steps Progress Indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          background: "var(--color-surface-2)",
          padding: "1rem",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)",
        }}
      >
        {[
          { stepNum: 1, label: "رفع الملف" },
          { stepNum: 2, label: "معاينة الصفوف" },
          { stepNum: 3, label: "تقرير التحقق" },
          { stepNum: 4, label: "التأكيد والرفع" },
        ].map((s) => {
          const isActive = step === s.stepNum;
          const isCompleted = step > s.stepNum;
          return (
            <div key={s.stepNum} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8125rem",
                  fontWeight: 800,
                  background: isCompleted
                    ? "var(--color-success)"
                    : isActive
                    ? "var(--color-primary)"
                    : "var(--color-surface-3)",
                  color: isCompleted || isActive ? "#fff" : "var(--color-text-muted)",
                  border: isActive ? "2px solid var(--color-primary-glow)" : "none",
                  boxShadow: isActive ? "0 0 10px var(--color-primary-glow)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {isCompleted ? "✓" : s.stepNum}
              </div>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: isActive ? 800 : 500,
                  color: isActive ? "var(--color-text)" : "var(--color-text-muted)",
                  marginTop: "6px",
                  textAlign: "center",
                }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* STEP 1: UPLOAD FILE */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Download Template Box */}
          <div
            className="card"
            style={{
              padding: "1.25rem",
              background: "linear-gradient(135deg, var(--color-primary-muted), var(--color-surface))",
              borderColor: "var(--color-primary)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <h3 style={{ fontSize: "0.875rem", fontWeight: 800, color: "var(--color-text)" }}>ملف النموذج الجاهز</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                قم بتحميل النموذج القياسي لتعبئة بيانات منتجاتك بشكل متوافق تماماً مع المنصة.
              </p>
            </div>
            <a
              href="/templates/products_import_template.csv"
              download="products_import_template.csv"
              className="btn-primary"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.8125rem",
                padding: "0.5rem 1rem",
                minHeight: "36px",
                fontWeight: 700,
              }}
            >
              📥 تحميل النموذج (.csv)
            </a>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? "var(--color-primary)" : "var(--color-border)"}`,
              borderRadius: "var(--radius-lg)",
              padding: "3rem 1.5rem",
              textAlign: "center",
              background: dragOver ? "var(--color-surface-2)" : "var(--color-surface)",
              cursor: "pointer",
              transition: "all 0.15s ease-in-out",
            }}
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📁</div>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "0.5rem" }}>
              اسحب وأفلت الملف هنا
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
              يدعم الملفات بصيغة Excel (.xlsx) و CSV (.csv) فقط.
            </p>
            <button type="button" className="btn-secondary" style={{ pointerEvents: "none", fontSize: "0.8125rem" }}>
              اختر ملفاً من جهازك
            </button>
            <input
              id="file-upload"
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>عدد المنتجات المكتشفة: {rawData.length} منتج</span>
            <button
              onClick={() => {
                setRawData([]);
                setStep(1);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-danger)",
                fontWeight: 700,
                fontSize: "0.8125rem",
                cursor: "pointer",
              }}
            >
              ✕ إلغاء وإعادة الرفع
            </button>
          </div>

          {/* Table Container */}
          <div
            className="card"
            style={{
              overflowX: "auto",
              padding: 0,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem", textAlign: "right" }}>
              <thead>
                <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                  <th style={{ padding: "0.75rem", fontWeight: 700 }}>الصف</th>
                  <th style={{ padding: "0.75rem", fontWeight: 700 }}>الاسم</th>
                  <th style={{ padding: "0.75rem", fontWeight: 700 }}>السعر</th>
                  <th style={{ padding: "0.75rem", fontWeight: 700 }}>الفئة</th>
                  <th style={{ padding: "0.75rem", fontWeight: 700 }}>الوصف</th>
                  <th style={{ padding: "0.75rem", fontWeight: 700, textAlign: "center" }}>الصور المرفقة</th>
                </tr>
              </thead>
              <tbody>
                {rawData.slice(0, 10).map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "0.75rem", color: "var(--color-text-muted)" }}>{idx + 1}</td>
                    <td style={{ padding: "0.75rem", fontWeight: 700, whiteSpace: "nowrap" }}>{r.name || "—"}</td>
                    <td style={{ padding: "0.75rem" }}>{r.price >= 0 ? `${r.price} ₺` : "غير صالح"}</td>
                    <td style={{ padding: "0.75rem" }}>
                      {r.category ? <span className="badge badge-primary">{r.category}</span> : "—"}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        maxWidth: "150px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {r.description || "—"}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "center", color: "var(--color-primary)", fontWeight: 700 }}>
                      {r.images.length} صور
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rawData.length > 10 && (
              <div
                style={{
                  padding: "0.75rem",
                  textAlign: "center",
                  background: "var(--color-surface-2)",
                  fontSize: "0.75rem",
                  color: "var(--color-text-muted)",
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                + يظهر هذا الجدول أول 10 منتجات فقط من أصل {rawData.length} منتج.
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button onClick={() => setStep(1)} className="btn-secondary">
              السابق
            </button>
            <button onClick={() => setStep(3)} className="btn-primary">
              التحقق من البيانات ←
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: VALIDATION REPORT */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Title Summary */}
          <div>
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 800 }}>نتائج فحص البيانات والقيود</h3>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
              قمنا بالتحقق من صحة المدخلات ومطابقتها لحدود خطة اشتراكك الحالية.
            </p>
          </div>

          {/* 1. Limits Violation Warn Card */}
          {validation.limitsViolated.length > 0 && (
            <div
              style={{
                background: "var(--color-danger-muted)",
                border: "1.5px solid var(--color-danger)",
                borderRadius: "var(--radius-lg)",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <h4 style={{ fontSize: "0.875rem", fontWeight: 800, color: "var(--color-danger)" }}>
                ⚠️ تم تجاوز حدود الباقة الحالية
              </h4>
              <ul style={{ paddingRight: "1.25rem", fontSize: "0.8125rem", color: "var(--color-danger)", display: "flex", flexDirection: "column", gap: "4px" }}>
                {validation.limitsViolated.map((errText, idx) => (
                  <li key={idx}>{errText}</li>
                ))}
              </ul>
              <div style={{ borderTop: "1px solid rgba(239, 68, 68, 0.2)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
                  يرجى ترقية خطة الاشتراك لتتمكن من استيراد هذه الدفعة بالكامل أو إزالة المنتجات الزائدة من ملف البيانات.
                </p>
                <button
                  onClick={() => handleTriggerUpgrade("products")}
                  className="btn-primary"
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.375rem 0.75rem",
                    minHeight: "30px",
                    fontWeight: 700,
                  }}
                >
                  ترقية الخطة الآن 🚀
                </button>
              </div>
            </div>
          )}

          {/* 2. Row Level Errors List */}
          {validation.errors.length > 0 ? (
            <div
              style={{
                background: "rgba(245, 158, 11, 0.08)",
                border: "1.5px solid var(--color-warning)",
                borderRadius: "var(--radius-lg)",
                padding: "1.25rem",
              }}
            >
              <h4 style={{ fontSize: "0.875rem", fontWeight: 800, color: "var(--color-warning)", marginBottom: "0.5rem" }}>
                ❌ تم اكتشاف أخطاء في تعبئة بعض الصفوف ({validation.errors.length} صف غير صالح)
              </h4>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
                يجب تعديل الأخطاء التالية في ملف البيانات الخاص بك وإعادة رفعه، لا يمكن إتمام الاستيراد بوجود صفوف خاطئة.
              </p>
              <div
                style={{
                  maxHeight: "250px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  paddingLeft: "0.25rem",
                }}
              >
                {validation.errors.map((rowErr) => (
                  <div
                    key={rowErr.row}
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      padding: "0.75rem",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: "0.8125rem", color: "var(--color-text)" }}>
                      الصف رقم {rowErr.row}:
                    </span>
                    <ul style={{ paddingRight: "1.25rem", marginTop: "4px", fontSize: "0.75rem", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: "2px" }}>
                      {rowErr.errors.map((msg, idx) => (
                        <li key={idx} style={{ color: "var(--color-danger)" }}>
                          {msg}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            validation.limitsViolated.length === 0 && (
              <div
                style={{
                  background: "var(--color-success-muted)",
                  border: "1.5px solid var(--color-success)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.25rem",
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: "2rem" }}>✅</span>
                <h4 style={{ fontSize: "0.9375rem", fontWeight: 800, color: "var(--color-success)", marginTop: "0.5rem" }}>
                  جميع الفحوصات سليمة!
                </h4>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                  لم يتم العثور على أي أخطاء في صياغة المدخلات أو تجاوز لقيود الباقة الحالية.
                </p>
              </div>
            )
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button onClick={() => setStep(2)} className="btn-secondary">
              السابق
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={validation.errors.length > 0 || validation.limitsViolated.length > 0}
              className="btn-primary"
            >
              الذهاب للتأكيد ←
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: CONFIRMATION */}
      {step === 4 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Summary Details */}
          <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 800, borderBottom: "1px solid var(--color-border)", paddingBottom: "0.75rem" }}>
              الملخص النهائي للاستيراد 📊
            </h3>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>المنتجات الجاهزة للاستيراد:</span>
              <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--color-primary)" }}>{rawData.length} منتج</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>الفئات الجديدة التي سيتم إنشاؤها:</span>
              <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--color-success)" }}>
                {validation.newCategoriesList.length} فئة جديدة
              </span>
            </div>
            {validation.newCategoriesList.length > 0 && (
              <div
                style={{
                  background: "var(--color-surface-2)",
                  padding: "0.75rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.75rem",
                  color: "var(--color-text-muted)",
                }}
              >
                الفئات المكتشفة للتسجيل التلقائي: {validation.newCategoriesList.join("، ")}
              </div>
            )}
          </div>

          {/* Import Action Notice */}
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", lineHeight: 1.6, textAlign: "center" }}>
            عند النقر على "تأكيد واستيراد"، سيقوم النظام برفع كافة البيانات دفعة واحدة بشكل آمن. قد تستغرق العملية بضع ثوانٍ بحسب حجم البيانات.
          </p>

          {/* Action buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button onClick={() => setStep(3)} className="btn-secondary" disabled={importing}>
              السابق
            </button>
            <button onClick={handleImportSubmit} className="btn-primary" disabled={importing} style={{ minWidth: "140px" }}>
              {importing ? "جاري الاستيراد... ⏳" : "تأكيد واستيراد المنتجات 🚀"}
            </button>
          </div>
        </div>
      )}

      {/* Reusable Plan Upgrade Modal */}
      {planUsage && (
        <UpgradePlanModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          limitType={upgradeModalType}
          limitValue={planUsage.limits[upgradeModalType === "products" ? "maxProducts" : upgradeModalType === "categories" ? "maxCategories" : "maxImagesPerProduct"]}
          currentValue={planUsage.usage[upgradeModalType === "products" ? "products" : upgradeModalType === "categories" ? "categories" : "images"]}
        />
      )}
    </div>
  );
}
