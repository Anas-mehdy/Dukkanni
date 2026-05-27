"use client";

/**
 * components/dashboard/ImageUpload.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Optimized Product Image Uploader
 *
 * Pipeline:
 *   1. User picks a file (any image type).
 *   2. Client-side: resize to max 800×800px + compress to <500KB as WebP.
 *   3. Request a signed upload URL from /api/upload.
 *   4. PUT the compressed blob directly to Supabase Storage.
 *   5. Call onUploadComplete(publicUrl) with the final CDN URL.
 *
 * Features:
 *   - Drag-and-drop + tap to pick
 *   - Live preview with loading state
 *   - File size display (before → after compression)
 *   - Clear / replace button
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useRef, useState } from "react";
import { IMAGE_MAX_SIZE_BYTES, IMAGE_MAX_HEIGHT_PX, IMAGE_MAX_WIDTH_PX } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onUploadComplete: (publicUrl: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  /** Storage folder: 'products' (default) | 'logos' */
  folder?:   "products" | "logos";
  /** Label shown above the drop zone */
  label?:    string;
  /** Shape of the preview: 'square' (default) | 'circle' */
  shape?:    "square" | "circle";
}

type UploadState = "idle" | "compressing" | "uploading" | "done" | "error";

// ---------------------------------------------------------------------------
// Image compression via Canvas API
// ---------------------------------------------------------------------------

async function compressImage(file: File): Promise<{ blob: Blob; originalKB: number; compressedKB: number }> {
  const originalKB = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Calculate target dimensions (preserve aspect ratio)
      let { width, height } = img;
      if (width > IMAGE_MAX_WIDTH_PX || height > IMAGE_MAX_HEIGHT_PX) {
        const ratio = Math.min(
          IMAGE_MAX_WIDTH_PX / width,
          IMAGE_MAX_HEIGHT_PX / height
        );
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }

      ctx.drawImage(img, 0, 0, width, height);

      // Try WebP first (best compression), fall back to JPEG
      const tryCompress = (quality: number, format: string): Promise<Blob | null> =>
        new Promise((res) => canvas.toBlob((b) => res(b), format, quality));

      const compress = async () => {
        const webpBlob = await tryCompress(0.82, "image/webp");
        if (webpBlob && webpBlob.size <= IMAGE_MAX_SIZE_BYTES) {
          return webpBlob;
        }
        // Lower quality if still over limit
        const webpLow = await tryCompress(0.65, "image/webp");
        if (webpLow && webpLow.size <= IMAGE_MAX_SIZE_BYTES) {
          return webpLow;
        }
        // Fall back to JPEG
        const jpegBlob = await tryCompress(0.80, "image/jpeg");
        if (jpegBlob) return jpegBlob;
        throw new Error("Compression failed");
      };

      compress()
        .then((blob) => {
          resolve({
            blob,
            originalKB,
            compressedKB: Math.round(blob.size / 1024),
          });
        })
        .catch(reject);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = objectUrl;
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImageUpload({
  currentImageUrl,
  onUploadComplete,
  onClear,
  disabled = false,
  folder    = "products",
  label     = folder === "logos" ? "شعار المتجر" : "صورة المنتج",
  shape     = folder === "logos" ? "circle" : "square",
}: ImageUploadProps) {
  const inputRef              = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl ?? null);
  const [state, setState]     = useState<UploadState>("idle");
  const [error, setError]     = useState<string | null>(null);
  const [sizeInfo, setSizeInfo] = useState<{ before: number; after: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("يرجى اختيار صورة (JPG، PNG، WebP)");
      return;
    }

    setError(null);
    setSizeInfo(null);
    setProgress(0);

    try {
      // 1. Compress
      setState("compressing");
      const { blob, originalKB, compressedKB } = await compressImage(file);
      setSizeInfo({ before: originalKB, after: compressedKB });

      // Show preview immediately after compression
      const localUrl = URL.createObjectURL(blob);
      setPreview(localUrl);

      // 2. Get signed upload URL
      setState("uploading");
      setProgress(20);

      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const uploadRes = await fetch(`/api/upload?folder=${folder}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          filename:    `product.${ext}`,
          contentType: blob.type,
        }),
      });

      if (!uploadRes.ok) {
        const { error: uploadErr } = await uploadRes.json();
        throw new Error(uploadErr ?? "فشل الحصول على رابط الرفع");
      }

      const { data: { signedUrl, publicUrl } } = await uploadRes.json();
      setProgress(40);

      // 3. PUT file directly to Supabase Storage
      const putRes = await fetch(signedUrl, {
        method:  "PUT",
        headers: { "Content-Type": blob.type },
        body:    blob,
      });

      if (!putRes.ok) throw new Error("فشل رفع الصورة إلى التخزين");
      setProgress(100);

      // Clean up local object URL
      URL.revokeObjectURL(localUrl);

      // Use the CDN public URL for display
      setPreview(publicUrl);
      setState("done");
      onUploadComplete(publicUrl);
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "حدث خطأ أثناء رفع الصورة");
    }
  }, [onUploadComplete]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const handleClear = () => {
    setPreview(null);
    setState("idle");
    setError(null);
    setSizeInfo(null);
    setProgress(0);
    onClear?.();
  };

  const isLoading = state === "compressing" || state === "uploading";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <label style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
        {label}
      </label>

      {preview ? (
        /* ── Preview ── */
        <div style={{ position: "relative", width: "100%" }}>
          <div
            style={{
              width:        shape === "circle" ? "120px" : "100%",
              height:       shape === "circle" ? "120px" : undefined,
              aspectRatio:  shape === "square" ? "1" : undefined,
              maxHeight:    shape === "circle" ? undefined : "240px",
              borderRadius: shape === "circle" ? "50%" : "var(--radius-lg)",
              overflow:     "hidden",
              border:       "1.5px solid var(--color-border)",
              background:   "var(--color-surface-2)",
              margin:       shape === "circle" ? "0 auto" : undefined,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="معاينة المنتج"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            {isLoading && (
              <div
                style={{
                  position:        "absolute",
                  inset:           0,
                  background:      "rgba(15,15,20,0.7)",
                  display:         "flex",
                  flexDirection:   "column",
                  alignItems:      "center",
                  justifyContent:  "center",
                  gap:             "0.75rem",
                  borderRadius:    "var(--radius-lg)",
                }}
              >
                <div style={{ color: "var(--color-text)", fontWeight: 600, fontSize: "0.875rem" }}>
                  {state === "compressing" ? "جاري ضغط الصورة..." : "جاري الرفع..."}
                </div>
                {/* Progress bar */}
                <div
                  style={{
                    width:        "70%",
                    height:       "4px",
                    background:   "var(--color-surface-3)",
                    borderRadius: "2px",
                    overflow:     "hidden",
                  }}
                >
                  <div
                    style={{
                      height:     "100%",
                      width:      `${progress}%`,
                      background: "var(--color-primary)",
                      borderRadius: "2px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions row */}
          {!isLoading && (
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="btn-ghost"
                style={{ flex: 1, fontSize: "0.875rem", minHeight: "40px" }}
              >
                تغيير الصورة
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={disabled}
                className="btn-danger"
                style={{ fontSize: "0.875rem", minHeight: "40px", padding: "0 0.75rem" }}
              >
                حذف
              </button>
            </div>
          )}

          {/* Size info */}
          {sizeInfo && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", textAlign: "center", marginTop: "0.25rem" }}>
              {sizeInfo.before} KB → {sizeInfo.after} KB ✓ تم الضغط
            </p>
          )}
        </div>
      ) : (
        /* ── Drop zone ── */
        <div
          role="button"
          tabIndex={0}
          aria-label="اختر صورة للمنتج"
          onClick={() => !disabled && inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          style={{
            width:         shape === "circle" ? "120px" : "100%",
            height:        shape === "circle" ? "120px" : undefined,
            aspectRatio:   shape === "square" ? "1" : undefined,
            maxHeight:     shape === "circle" ? undefined : "200px",
            borderRadius:  shape === "circle" ? "50%" : "var(--radius-lg)",
            border:        `2px dashed ${isDragging ? "var(--color-primary)" : "var(--color-border)"}`,
            background:    isDragging ? "var(--color-primary-muted)" : "var(--color-surface-2)",
            display:       "flex",
            flexDirection: "column",
            alignItems:    "center",
            justifyContent:"center",
            gap:           "0.75rem",
            cursor:        disabled ? "not-allowed" : "pointer",
            transition:    "border-color 0.2s, background 0.2s",
            opacity:       disabled ? 0.5 : 1,
            margin:        shape === "circle" ? "0 auto" : undefined,
          }}
        >
          <div style={{ fontSize: "2.5rem", opacity: 0.4 }}>🖼️</div>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "var(--color-text-muted)", fontWeight: 600, fontSize: "0.9rem" }}>
              اضغط لاختيار صورة
            </p>
            <p style={{ color: "var(--color-text-faint)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
              JPG، PNG، WebP — يتم الضغط تلقائياً إلى أقل من 500 كيلوبايت
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
        onChange={onInputChange}
        style={{ display: "none" }}
        disabled={disabled}
      />

      {/* Error message */}
      {error && (
        <p style={{ color: "var(--color-danger)", fontSize: "0.8125rem", fontWeight: 500 }}>
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
