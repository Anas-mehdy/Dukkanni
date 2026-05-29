"use client";

/**
 * components/store/StoreView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Premium Public Storefront
 *
 * 100% matches the screenshot:
 *   - Category groups with divider lines & soft circles
 *   - 2-column product grids
 *   - Quantitative steppers [- 0 +] visible by default
 *   - Header with custom circular store initials + checkout + back to admin link
 *   - Integrated Sun/Moon theme switcher choice
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { getCurrencySymbol } from "@/lib/constants";
import { useTheme } from "@/hooks/useTheme";
import type { CategoryRow, ProductRow, StoreRow } from "@/types/database";
import { locales } from "@/lib/locales";

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

interface StoreViewProps {
  store:      Pick<StoreRow, "id" | "name" | "slug" | "logo_url" | "currency_code"> & { announcement_text?: string | null; description?: string | null };
  categories: Pick<CategoryRow, "id" | "name" | "sort_order">[];
  products:   Pick<ProductRow, "id" | "name" | "price" | "image_url" | "is_active" | "is_available" | "sort_order" | "category_id" | "options">[];
}

// ---------------------------------------------------------------------------
// Helper: Map nice emojis based on category name
// ---------------------------------------------------------------------------

function getCategoryEmoji(name: string): string {
  const norm = name.trim();
  if (/بقوليات|حمص|عدس|فول/i.test(norm)) return "📦";
  if (/عصير|عصائر|مشروبات|كولا|ماء/i.test(norm)) return "🥤";
  if (/شيبس|تسالي|مقرمشات/i.test(norm)) return "🍟";
  if (/شوكولا|حلويات|سكاكر|كيك/i.test(norm)) return "🍫";
  if (/ألبان|أجبان|حليب|أجبان/i.test(norm)) return "🧀";
  if (/خضار|فواكه|تفاح/i.test(norm)) return "🍏";
  if (/منظفات|غسيل/i.test(norm)) return "🧼";
  return "📦";
}

// ---------------------------------------------------------------------------
// Premium Grid Product Card Component
// ---------------------------------------------------------------------------

function ProductCard({
  product,
  currencySymbol,
  quantity,
  onAdd,
  onIncrement,
  onDecrement,
  t,
  lang,
}: {
  product:       StoreViewProps["products"][number];
  currencySymbol: string;
  quantity:      number;
  onAdd:         () => void;
  onIncrement:   () => void;
  onDecrement:   () => void;
  t:             any;
  lang:          string;
}) {
  return (
    <div
      id={`product-${product.id}`}
      className="card"
      style={{
        display:        "flex",
        flexDirection:  "column",
        padding:        "0.75rem",
        position:       "relative",
        background:     "var(--color-surface)",
        borderColor:    "var(--color-border)",
        borderRadius:   "var(--radius-lg)",
        boxShadow:      "var(--shadow-sm)",
        transition:     "all 0.25s ease"
      }}
    >
      {/* Absolute Green Indicator Dot */}
      <span
        style={{
          position:     "absolute",
          top:          "8px",
          left:         "8px",
          width:        "8px",
          height:       "8px",
          borderRadius: "50%",
          background:   "var(--color-success)",
          boxShadow:    "0 0 0 3px var(--color-success-muted)",
          zIndex:       10
        }}
      />

      {/* Product Image Aspect Ratio Wrapper */}
      <div
        style={{
          width:          "100%",
          aspectRatio:    "1/1",
          borderRadius:   "var(--radius-md)",
          overflow:       "hidden",
          background:     "var(--color-surface-2)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          border:         "1px solid var(--color-border-light)",
          marginBottom:   "0.625rem",
          position:       "relative"
        }}
      >
        {product.image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "1.75rem", opacity: 0.25 }}>📦</span>
            <span style={{ fontSize: "0.625rem", color: "var(--color-text-faint)", fontWeight: 700 }}>
              {t.noImage}
            </span>
          </div>
        )}
      </div>

      {/* Product Metadata Info */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "0.625rem" }}>
        <p
          style={{
            fontWeight:   800,
            fontSize:     "0.875rem",
            color:        "var(--color-text)",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
            lineHeight:   1.3
          }}
        >
          {product.name}
        </p>
        <span style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", fontWeight: 600 }}>
          {t.piece}
        </span>
        {(() => {
          const opts = (product.options as any[]) ?? [];
          const hasCustomOptionPrices = opts.some((opt) => opt.hasCustomPrice && opt.values?.length > 0);
          
          if (hasCustomOptionPrices) {
            let minPrice: number | null = null;
            for (const opt of opts) {
              if (opt.hasCustomPrice && opt.values) {
                for (const v of opt.values) {
                  if (v.price != null) {
                    const priceVal = product.price + v.price;
                    if (minPrice === null || priceVal < minPrice) {
                      minPrice = priceVal;
                    }
                  }
                }
              }
            }

            if (minPrice !== null) {
              const formattedMinPrice = minPrice.toLocaleString(lang === "tr" ? "tr-TR" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const labelText = lang === "ar" 
                ? `تبدأ من ${currencySymbol}${formattedMinPrice}` 
                : lang === "tr" 
                ? `${currencySymbol}${formattedMinPrice}'den başlayan` 
                : `Starts from ${currencySymbol}${formattedMinPrice}`;
              
              return (
                <p
                  style={{
                    fontSize:   "0.8125rem",
                    fontWeight: 800,
                    color:      "var(--color-success)",
                    lineHeight: 1.1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                  title={labelText}
                >
                  {labelText}
                </p>
              );
            }
          }

          return (
            <p
              style={{
                fontSize:   "1rem",
                fontWeight: 800,
                color:      "var(--color-success)",
                lineHeight: 1
              }}
            >
              {currencySymbol}{product.price.toLocaleString(lang === "tr" ? "tr-TR" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          );
        })()}
      </div>

      {/* Sleek Pill quantitative adjuster stepper [- 0 +] OR Out of Stock Badge */}
      {product.is_available !== false ? (
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            background:     "var(--color-surface-2)",
            borderRadius:   "var(--radius-full)",
            padding:        "0.2rem",
            border:         "1.5px solid var(--color-border)",
            marginTop:      "auto"
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); if (quantity > 0) onDecrement(); }}
            disabled={quantity === 0}
            aria-label={lang === "ar" ? "تقليل" : lang === "tr" ? "azalt" : "decrease"}
            style={{
              width:        "26px",
              height:       "26px",
              borderRadius: "50%",
              background:   quantity > 0 ? "var(--color-surface-3)" : "transparent",
              color:        quantity > 0 ? "var(--color-text)" : "var(--color-text-faint)",
              border:       "none",
              fontSize:     "0.9rem",
              fontWeight:   800,
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              cursor:       quantity > 0 ? "pointer" : "default",
              transition:   "all 0.15s ease"
            }}
          >
            {quantity === 1 ? "×" : "−"}
          </button>

          <span
            style={{
              fontWeight: 800,
              fontSize:   "0.875rem",
              color:      quantity > 0 ? "var(--color-primary)" : "var(--color-text-muted)",
              minWidth:   "18px",
              textAlign:  "center"
            }}
          >
            {quantity}
          </span>

          <button
            onClick={(e) => { e.stopPropagation(); if (quantity === 0) onAdd(); else onIncrement(); }}
            aria-label={lang === "ar" ? "زيادة" : lang === "tr" ? "artır" : "increase"}
            style={{
              width:        "26px",
              height:       "26px",
              borderRadius: "50%",
              background:   "var(--color-success)",
              color:        "#ffffff",
              border:       "none",
              fontSize:     "1rem",
              fontWeight:   800,
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              cursor:       "pointer",
              boxShadow:    "0 1.5px 5px var(--color-success-muted)",
              transition:   "transform 0.1s"
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.9)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            +
          </button>
        </div>
      ) : (
        <button
          disabled
          style={{
            width: "100%",
            padding: "0.5rem",
            borderRadius: "var(--radius-full)",
            background: "var(--color-surface-3)",
            color: "var(--color-text-faint)",
            border: "1.5px dashed var(--color-border)",
            fontSize: "0.8125rem",
            fontWeight: 800,
            marginTop: "auto",
            cursor: "not-allowed",
            textAlign: "center"
          }}
        >
          {lang === "ar" ? "نفد من المخزون" : lang === "tr" ? "Tükendi" : "Out of Stock"}
        </button>
      )}

    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Storefront View
// ---------------------------------------------------------------------------

export default function StoreView({ store, categories, products }: StoreViewProps) {
  const { theme, toggleTheme } = useTheme();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const cart = useCart(store.slug);
  const currencySymbol = getCurrencySymbol(store.currency_code);

  // i18n states
  const [lang, setLang] = useState<"ar" | "tr" | "en">("ar");
  const [mounted, setMounted] = useState(false);

  // Translation caching states (scoped by language: 'tr' and 'en')
  const [translatedCategories, setTranslatedCategories] = useState<Record<"tr" | "en", Record<string, string>>>({
    tr: {},
    en: {}
  });
  const [translatedProducts, setTranslatedProducts] = useState<Record<"tr" | "en", Record<string, string>>>({
    tr: {},
    en: {}
  });
  const [translatedOptions, setTranslatedOptions] = useState<Record<"tr" | "en", Record<string, string>>>({
    tr: {},
    en: {}
  });
  const [translatedAnnouncements, setTranslatedAnnouncements] = useState<Record<"tr" | "en", string>>({
    tr: "",
    en: ""
  });
  const [translating, setTranslating] = useState(false);
  const [translatedLangs, setTranslatedLangs] = useState<Record<string, boolean>>({ ar: true });

  // Modal states for product options selection
  const [selectedProductForOptions, setSelectedProductForOptions] = useState<ProductRow | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({}); // option.name (Arabic) -> value (Arabic)

  // Cumulative Price calculation helper
  const getCumulativePrice = (product: any, selections: Record<string, string>) => {
    let totalPrice = product.price;
    const opts = (product.options as any[]) ?? [];
    opts.forEach((opt) => {
      const selectedVal = selections[opt.name];
      if (selectedVal && opt.hasCustomPrice) {
        const matchVal = opt.values?.find((v: any) => v.value === selectedVal);
        if (matchVal && matchVal.price != null) {
          totalPrice += matchVal.price;
        }
      }
    });
    return totalPrice;
  };

  useEffect(() => {
    const saved = localStorage.getItem("dukkanni_store_lang") as "ar" | "tr" | "en";
    if (saved && ["ar", "tr", "en"].includes(saved)) {
      setLang(saved);
    }
    setMounted(true);
  }, []);

  const t = mounted ? locales[lang] : locales["ar"];

  // Global document direction synchronization (fixes layout off-center/tilting-left bugs globally) + Log view event
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dir = t.dir;
    document.documentElement.lang = lang;

    // Asynchronously log store view event
    const logView = async () => {
      try {
        const { createPublicClient } = await import("@/lib/supabase/public");
        const supabasePublic = createPublicClient();
        await supabasePublic.from("store_analytics").insert({
          store_id: store.id,
          event_type: "view",
        });
      } catch (err) {
        console.error("Failed to log view event:", err);
      }
    };
    logView();
  }, [mounted, t.dir, lang, store.id]);

  // Effect to automatically translate category, product, and option names when language switches
  useEffect(() => {
    if (!mounted) return;
    if (lang === "ar") return; // Arabic is the source of truth
    if (translatedLangs[lang]) return; // Already translated this language

    const performTranslation = async () => {
      setTranslating(true);
      try {
        const categoryNames = categories.map((c) => c.name);
        const productNames = products.map((p) => p.name);
        
        // Extract all options names and values to translate
        const optionTexts: string[] = [];
        products.forEach((p) => {
          const opts = (p.options as any[]) ?? [];
          opts.forEach((opt) => {
            if (opt.name) optionTexts.push(opt.name);
            if (opt.values) {
              opt.values.forEach((v: any) => {
                if (v.value) optionTexts.push(v.value);
              });
            }
          });
        });
        
        const uniqueOptionTexts = Array.from(new Set(optionTexts));
        const allText = [...categoryNames, ...productNames, ...uniqueOptionTexts];

        // Add store.announcement_text to the end of the allText array for translation if it exists!
        let announcementIndex = -1;
        if (store.announcement_text) {
          announcementIndex = allText.length;
          allText.push(store.announcement_text);
        }

        if (allText.length === 0) return;

        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: allText, target: lang }),
        });

        if (!response.ok) throw new Error("Translation failed");

        const json = await response.json();
        const translatedArray: string[] = json.translations;

        const catTranslations: Record<string, string> = {};
        const prodTranslations: Record<string, string> = {};
        const optTranslations: Record<string, string> = {};
        let translatedAnn = "";

        let index = 0;
        categories.forEach((c) => {
          catTranslations[c.id] = translatedArray[index] || c.name;
          index++;
        });

        products.forEach((p) => {
          prodTranslations[p.id] = translatedArray[index] || p.name;
          index++;
        });

        uniqueOptionTexts.forEach((text) => {
          optTranslations[text] = translatedArray[index] || text;
          index++;
        });

        if (announcementIndex !== -1) {
          translatedAnn = translatedArray[announcementIndex] || store.announcement_text || "";
        }

        setTranslatedCategories((prev) => ({ ...prev, [lang]: catTranslations }));
        setTranslatedProducts((prev) => ({ ...prev, [lang]: prodTranslations }));
        setTranslatedOptions((prev) => ({ ...prev, [lang]: optTranslations }));
        if (translatedAnn) {
          setTranslatedAnnouncements((prev) => ({ ...prev, [lang]: translatedAnn }));
        }
        setTranslatedLangs((prev) => ({ ...prev, [lang]: true }));
      } catch (err) {
        console.error("Catalog translation failed:", err);
      } finally {
        setTranslating(false);
      }
    };

    performTranslation();
  }, [lang, mounted, categories, products, store.announcement_text]);

  const handleLangChange = (newLang: "ar" | "tr" | "en") => {
    setLang(newLang);
    localStorage.setItem("dukkanni_store_lang", newLang);
  };

  // Group products by category
  const groupedProducts = useMemo(() => {
    const list = activeCategory === "all"
      ? categories
      : categories.filter((cat) => cat.id === activeCategory);

    return list.map((cat) => {
      const catProducts = products.filter((p) => p.category_id === cat.id);
      return {
        id: cat.id,
        name: cat.name,
        products: catProducts,
      };
    }).filter((group) => group.products.length > 0);
  }, [activeCategory, categories, products]);

  // Catch orphans (products with no category assigned)
  const uncategorizedProducts = useMemo(() => {
    if (activeCategory !== "all") return [];
    return products.filter((p) => !p.category_id);
  }, [activeCategory, products]);

  // Cart Handlers
  const handleAdd = (product: StoreViewProps["products"][number], translatedName?: string) => {
    const opts = (product.options as any[]) ?? [];
    if (opts.length > 0) {
      setSelectedProductForOptions(product as any);
      
      // Auto-select the first value of each option group
      const initialSelections: Record<string, string> = {};
      opts.forEach((opt) => {
        if (opt.values && opt.values.length > 0) {
          initialSelections[opt.name] = opt.values[0].value;
        }
      });
      setSelectedOptions(initialSelections);
    } else {
      cart.addItem({
        productId: product.id,
        name:      translatedName ?? product.name,
        price:     product.price,
        imageUrl:  product.image_url,
      });
    }
  };

  const handleIncrement = (product: StoreViewProps["products"][number]) => {
    const opts = (product.options as any[]) ?? [];
    if (opts.length > 0) {
      // Re-open selection modal to add another variant combination
      handleAdd(product);
    } else {
      cart.updateQuantity(product.id, cart.getQuantity(product.id) + 1);
    }
  };

  const handleDecrement = (product: StoreViewProps["products"][number]) => {
    const opts = (product.options as any[]) ?? [];
    if (opts.length > 0) {
      // Find the last added cart item for this product and decrement it
      const matchingItems = cart.items.filter((i) => i.productId === product.id);
      if (matchingItems.length > 0) {
        const lastItem = matchingItems[matchingItems.length - 1];
        cart.updateQuantity(product.id, lastItem.quantity - 1, lastItem.selectedOptions);
      }
    } else {
      cart.updateQuantity(product.id, cart.getQuantity(product.id) - 1);
    }
  };

  const handleConfirmOptions = () => {
    if (!selectedProductForOptions) return;
    
    const p = selectedProductForOptions;
    const opts = (p.options as any[]) ?? [];
    
    // Prepare selectedOptions array for the CartItem (stores original Arabic keys/values)
    const selectedOptionsArray = opts.map((opt) => {
      const valName = selectedOptions[opt.name];
      const matchVal = opt.values?.find((v: any) => v.value === valName);
      return {
        name: opt.name,
        value: valName,
        price: opt.hasCustomPrice && matchVal ? matchVal.price : null,
      };
    });

    const finalPrice = getCumulativePrice(p, selectedOptions);
    const translatedName = lang === "ar" ? p.name : (translatedProducts[lang]?.[p.id] ?? p.name);

    cart.addItem({
      productId: p.id,
      name:      translatedName,
      price:     finalPrice,
      imageUrl:  p.image_url,
      selectedOptions: selectedOptionsArray,
    });

    setSelectedProductForOptions(null);
  };

  // Store first letter (like the "ج" circular avatar)
  const storeInitial = store.name.trim().charAt(0).toUpperCase();

  return (
    <div
      style={{
        width:      "100%",
        maxWidth:   "600px",
        margin:     "0 auto",
        minHeight:  "100dvh",
        background: "var(--color-bg)",
        fontFamily: lang === "ar" ? "var(--font-cairo), sans-serif" : "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
        direction:  t.dir,
        position:   "relative",
      }}
    >
      {/* Dukkanni Referral Banner */}
      <div
        style={{
          background: "var(--color-surface-2)",
          borderBottom: "1px solid var(--color-border)",
          padding: "0.45rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.75rem",
          fontWeight: 700,
          color: "var(--color-text-muted)",
          textAlign: "center",
          direction: t.dir,
        }}
      >
        <span>
          {t.dukkanniPromo}{" "}
          <a
            href="/"
            style={{
              color: "var(--color-primary)",
              textDecoration: "underline",
              fontWeight: 800,
              marginInlineStart: "0.25rem",
            }}
          >
            {t.dukkanniPromoLink}
          </a>
        </span>
      </div>

      {/* Announcement Bar Marquee */}
      {store.announcement_text && (() => {
        const annText = lang === "ar" ? store.announcement_text : (translatedAnnouncements[lang] || store.announcement_text);
        return (
          <div
            style={{
              background: "linear-gradient(90deg, #0d9488, var(--color-primary))",
              color: "#ffffff",
              fontSize: "0.8125rem",
              fontWeight: 750,
              padding: "0.45rem 0",
              overflow: "hidden",
              whiteSpace: "nowrap",
              position: "relative",
              display: "flex",
              alignItems: "center",
              borderBottom: "1.5px solid rgba(0,0,0,0.08)",
            }}
          >
            <div
              className="announcement-marquee"
              style={{
                display: "inline-block",
                whiteSpace: "nowrap",
                paddingLeft: t.dir === "rtl" ? "0" : "100%",
                paddingRight: t.dir === "rtl" ? "100%" : "0",
                animation: `${t.dir === "rtl" ? "marquee-rtl" : "marquee-ltr"} 18s linear infinite`,
              }}
            >
              {annText}
            </div>

            <style>{`
              @keyframes marquee-ltr {
                0%   { transform: translateX(0%); }
                100% { transform: translateX(-100%); }
              }
              @keyframes marquee-rtl {
                0%   { transform: translateX(0%); }
                100% { transform: translateX(100%); }
              }
            `}</style>
          </div>
        );
      })()}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Premium Sticky Top Header                                            */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <header
        style={{
          position:       "sticky",
          top:            0,
          zIndex:         100,
          background:     "var(--color-surface)",
          borderBottom:   "1px solid var(--color-border)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "0.75rem 1rem",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Right side (RTL): circular initials + store description */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          {store.logo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={store.logo_url}
              alt={store.name}
              style={{
                width:        "44px",
                height:       "44px",
                borderRadius: "50%",
                objectFit:    "cover",
                border:       "2px solid var(--color-success)"
              }}
            />
          ) : (
            <div
              style={{
                width:          "44px",
                height:         "44px",
                borderRadius:   "50%",
                background:     "var(--color-success)",
                color:          "#ffffff",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontSize:       "1.25rem",
                fontWeight:     800,
                flexShrink:     0,
              }}
            >
              {storeInitial}
            </div>
          )}
          <div>
            <p style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--color-text)", lineHeight: 1.2 }}>
              {store.name}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", marginTop: "2px", fontWeight: 500 }}>
              {t.catalogLabel}
            </p>
          </div>
        </div>

        {/* Left side: theme choice + lang switcher + cart + back arrow */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          
          {/* Language Switcher */}
          <div style={{ position: "relative", display: "inline-block", direction: "ltr" }}>
            <select
              value={lang}
              onChange={(e) => handleLangChange(e.target.value as "ar" | "tr" | "en")}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                background: "var(--color-surface-2)",
                color: "var(--color-text)",
                border: "1.5px solid var(--color-border)",
                borderRadius: "var(--radius-full)",
                padding: "0.4rem 1.4rem 0.4rem 0.65rem",
                fontFamily: "inherit",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
                outline: "none",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                textAlign: "left",
              }}
            >
              <option value="ar">العربية</option>
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
            <span
              style={{
                position: "absolute",
                top: "50%",
                right: "7px",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                fontSize: "0.5rem",
                color: "var(--color-text-faint)",
                display: "flex",
                alignItems: "center"
              }}
            >
              ▼
            </span>
          </div>

          {/* Light/Dark Toggle choice */}
          <button
            onClick={toggleTheme}
            aria-label={lang === "ar" ? "تغيير المظهر" : lang === "tr" ? "temayı değiştir" : "change theme"}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "1.5px solid var(--color-border)",
              background: "var(--color-surface-2)",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s"
            }}
          >
            {theme === "light" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </button>

          {/* Cart circle button */}
          <Link
            href={`/${store.slug}/checkout`}
            id="cart-badge-btn"
            aria-label={t.cart}
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            "4px",
              background:     "var(--color-success)",
              color:          "#ffffff",
              border:         "none",
              borderRadius:   "var(--radius-full)",
              padding:        "0.4rem 0.75rem",
              fontFamily:     "inherit",
              fontWeight:     800,
              fontSize:       "0.8125rem",
              textDecoration: "none",
              boxShadow:      "0 2px 10px var(--color-primary-glow)"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <span>{cart.hydrated ? cart.totalItems : 0}</span>
          </Link>



        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Category Scroll Filter Chips Selector                                */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <div
          style={{
            position:     "sticky",
            top:          "69px",
            zIndex:       90,
            background:   "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
            padding:      "0.625rem 1rem",
            boxShadow:    "var(--shadow-sm)"
          }}
        >
          <div
            id="category-scroll"
            style={{
              display:        "flex",
              gap:            "0.5rem",
              overflowX:      "auto",
              scrollbarWidth: "none",
              paddingBottom:  "2px",
            }}
          >
            {/* "الكل" Chip with Store emoji */}
            <button
              id="cat-all"
              onClick={() => setActiveCategory("all")}
              style={{
                flexShrink:   0,
                padding:      "0.45rem 1.125rem",
                borderRadius: "var(--radius-full)",
                border:       "none",
                background:   activeCategory === "all" ? "var(--color-primary)" : "var(--color-surface-2)",
                color:        activeCategory === "all" ? "#ffffff" : "var(--color-text-muted)",
                fontFamily:   "inherit",
                fontWeight:   800,
                fontSize:     "0.8125rem",
                cursor:       "pointer",
                transition:   "all 0.15s",
                whiteSpace:   "nowrap",
                display:      "inline-flex",
                alignItems:   "center",
                gap:          "4px",
                boxShadow:    activeCategory === "all" ? "0 2px 8px var(--color-primary-glow)" : "none"
              }}
            >
              <span>{t.categoryAll}</span>
              <span>🏪</span>
            </button>

            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              const catName = lang === "ar" ? cat.name : (translatedCategories[lang]?.[cat.id] ?? cat.name);
              return (
                <button
                  key={cat.id}
                  id={`cat-${cat.id}`}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    flexShrink:   0,
                    padding:      "0.45rem 1.125rem",
                    borderRadius: "var(--radius-full)",
                    border:       "none",
                    background:   isActive ? "var(--color-primary)" : "var(--color-surface-2)",
                    color:        isActive ? "#ffffff" : "var(--color-text-muted)",
                    fontFamily:   "inherit",
                    fontWeight:   800,
                    fontSize:     "0.8125rem",
                    cursor:       "pointer",
                    transition:   "all 0.15s",
                    whiteSpace:   "nowrap",
                    display:      "inline-flex",
                    alignItems:   "center",
                    gap:          "4px",
                    boxShadow:    isActive ? "0 2px 8px var(--color-primary-glow)" : "none"
                  }}
                >
                  <span>{catName}</span>
                  <span>📦</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Categorized Product Section Listings                                 */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <main
        style={{
          paddingTop:    "1rem",
          paddingBottom: cart.hydrated && cart.totalItems > 0 ? "90px" : "2rem",
        }}
      >
        {groupedProducts.length === 0 && uncategorizedProducts.length === 0 ? (
          <div style={{ padding: "4rem 1rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📦</div>
            <p style={{ color: "var(--color-text-muted)", fontWeight: 700, fontSize: "0.9375rem" }}>
              {t.noProducts}
            </p>
          </div>
        ) : (
          <>
            {/* 1. Categorized Groups */}
            {groupedProducts.map((group) => {
              const catEmoji = getCategoryEmoji(group.name);
              const catName = lang === "ar" ? group.name : (translatedCategories[lang]?.[group.id] ?? group.name);
              return (
                <section key={group.id} style={{ marginBottom: "1.5rem" }}>
                  
                  {/* Category Section Title with Circle Emoji */}
                  <div
                    style={{
                      display:      "flex",
                      alignItems:   "center",
                      gap:          "0.625rem",
                      paddingInline:"1rem",
                      marginBottom: "0.875rem",
                      position:     "relative"
                    }}
                  >
                    <div
                      style={{
                        width:          "38px",
                        height:         "38px",
                        borderRadius:   "50%",
                        background:     "var(--color-success-muted)",
                        display:        "flex",
                        alignItems:     "center",
                        justifyContent: "center",
                        fontSize:       "1.25rem",
                        flexShrink:     0
                      }}
                    >
                      {catEmoji}
                    </div>
                    
                    <div style={{ flexShrink: 0 }}>
                      <p style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--color-text)" }}>
                        {catName}
                      </p>
                      <span style={{ fontSize: "0.6875rem", color: "var(--color-text-faint)", fontWeight: 700 }}>
                        {group.products.length} {t.itemsCount}
                      </span>
                    </div>

                    {/* Section Horizontal Line */}
                    <div
                      style={{
                        flex:       1,
                        height:     "1px",
                        background: "var(--color-border)"
                      }}
                    />
                  </div>

                  {/* 2-Column Product Grid */}
                  <div
                    style={{
                      display:             "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap:                 "0.75rem",
                      paddingInline:       "1rem"
                    }}
                  >
                    {group.products.map((product) => {
                      const translatedName = lang === "ar" ? product.name : (translatedProducts[lang]?.[product.id] ?? product.name);
                      return (
                        <ProductCard
                          key={product.id}
                          product={{ ...product, name: translatedName }}
                          currencySymbol={currencySymbol}
                          quantity={cart.hydrated ? cart.getQuantity(product.id) : 0}
                          onAdd={() => handleAdd(product, translatedName)}
                          onIncrement={() => handleIncrement(product)}
                          onDecrement={() => handleDecrement(product)}
                          t={t}
                          lang={lang}
                        />
                      );
                    })}
                  </div>

                </section>
              );
            })}

            {/* 2. Uncategorized Products Group */}
            {uncategorizedProducts.length > 0 && (
              <section style={{ marginBottom: "1.5rem" }}>
                
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", paddingInline: "1rem", marginBottom: "0.875rem" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "var(--color-primary-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0 }}>
                    📂
                  </div>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--color-text)" }}>{t.uncategorized}</p>
                    <span style={{ fontSize: "0.6875rem", color: "var(--color-text-faint)", fontWeight: 700 }}>
                      {uncategorizedProducts.length} {t.itemsCount}
                    </span>
                  </div>
                  <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
                </div>

                {/* 2-Column Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", paddingInline: "1rem" }}>
                  {uncategorizedProducts.map((product) => {
                    const translatedName = lang === "ar" ? product.name : (translatedProducts[lang]?.[product.id] ?? product.name);
                    return (
                      <ProductCard
                        key={product.id}
                        product={{ ...product, name: translatedName }}
                        currencySymbol={currencySymbol}
                        quantity={cart.hydrated ? cart.getQuantity(product.id) : 0}
                        onAdd={() => handleAdd(product, translatedName)}
                        onIncrement={() => handleIncrement(product)}
                        onDecrement={() => handleDecrement(product)}
                        t={t}
                        lang={lang}
                      />
                    );
                  })}
                </div>

              </section>
            )}
          </>
        )}
      </main>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Sticky Bottom Cart Checkout Bar                                     */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {cart.hydrated && cart.totalItems > 0 && (
        <div
          style={{
            position:     "fixed",
            bottom:       0,
            left:         "50%",
            transform:    "translateX(-50%)",
            width:        "100%",
            maxWidth:     "600px",
            padding:      "0.875rem 1rem",
            background:   "var(--color-surface)",
            borderTop:    "1px solid var(--color-border)",
            zIndex:       100,
            boxShadow:    "0 -4px 20px rgba(0,0,0,0.1)",
            animation:    "slide-up 0.2s ease-out",
          }}
        >
          <Link
            href={`/${store.slug}/checkout`}
            id="cart-checkout-bar"
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              background:     "linear-gradient(135deg, var(--color-success), #16a34a)",
              color:          "#ffffff",
              borderRadius:   "var(--radius-full)",
              padding:        "0.875rem 1.25rem",
              textDecoration: "none",
              fontFamily:     "inherit",
              fontWeight:     800,
              fontSize:       "0.9375rem",
              boxShadow:      "0 4px 16px var(--color-success-muted)",
              transition:     "opacity 0.15s",
            }}
          >
            <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: "var(--radius-full)", padding: "0.2rem 0.625rem", fontSize: "0.8125rem" }}>
              {cart.totalItems} {t.itemsCount}
            </span>

            <span>{t.checkoutBtn}</span>

            <span style={{ fontWeight: 800 }}>
              {cart.totalPrice.toLocaleString(lang === "tr" ? "tr-TR" : "en-US", { minimumFractionDigits: 2 })} {currencySymbol}
            </span>
          </Link>

          <style>{`
            @keyframes slide-up {
              from { transform: translateX(-50%) translateY(100%); opacity: 0; }
              to   { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Dynamic Product Options Bottom Sheet / Modal                         */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {selectedProductForOptions && (() => {
        const p = selectedProductForOptions;
        const opts = (p.options as any[]) ?? [];
        const cumulativePrice = getCumulativePrice(p, selectedOptions);
        const translatedProductName = lang === "ar" ? p.name : (translatedProducts[lang]?.[p.id] ?? p.name);

        return (
          <div
            id="options-bottom-sheet-backdrop"
            onClick={() => setSelectedProductForOptions(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.45)",
              backdropFilter: "blur(4px)",
              zIndex: 1000,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              animation: "fade-in 0.2s ease-out",
            }}
          >
            <div
              id="options-bottom-sheet"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "600px",
                background: "var(--color-surface)",
                borderTopLeftRadius: "var(--radius-xl)",
                borderTopRightRadius: "var(--radius-xl)",
                border: "1px solid var(--color-border)",
                borderBottom: "none",
                padding: "1.25rem 1rem",
                boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
                animation: "sheet-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                maxHeight: "85vh",
                overflowY: "auto",
                direction: t.dir,
              }}
            >
              {/* Sheet Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 850, color: "var(--color-text)", lineHeight: 1.3 }}>
                    {t.optionsModalHeading}
                  </h3>
                  <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-primary)", marginTop: "3px" }}>
                    {translatedProductName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProductForOptions(null)}
                  className="btn-icon"
                  style={{
                    background: "var(--color-surface-2)",
                    borderRadius: "50%",
                    width: "30px",
                    height: "30px",
                    border: "none",
                    color: "var(--color-text-muted)",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "0.875rem"
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="divider" style={{ margin: 0 }} />

              {/* Render Option Groups */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {opts.map((opt, optIdx) => {
                  const translatedOptName = lang === "ar" ? opt.name : (translatedOptions[lang]?.[opt.name] ?? opt.name);
                  const selectedVal = selectedOptions[opt.name];

                  return (
                    <div key={optIdx} style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                      <label style={{ fontSize: "0.875rem", fontWeight: 800, color: "var(--color-text-muted)" }}>
                        {t.selectOptionPrompt.replace("{optionName}", translatedOptName)}
                      </label>
                      
                      {/* Values Chips Container */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {opt.values?.map((val: any, valIdx: number) => {
                          const translatedValText = lang === "ar" ? val.value : (translatedOptions[lang]?.[val.value] ?? val.value);
                          const isSelected = selectedVal === val.value;
                          const hasPriceMod = opt.hasCustomPrice && val.price != null && val.price > 0;
                          
                          return (
                            <button
                              key={valIdx}
                              onClick={() => {
                                setSelectedOptions((prev) => ({
                                  ...prev,
                                  [opt.name]: val.value,
                                }));
                              }}
                              style={{
                                padding: "0.5rem 1rem",
                                borderRadius: "var(--radius-md)",
                                border: isSelected 
                                  ? "2px solid var(--color-success)" 
                                  : "1.5px solid var(--color-border)",
                                background: isSelected 
                                  ? "var(--color-success-muted)" 
                                  : "var(--color-surface-2)",
                                color: isSelected 
                                  ? "var(--color-success)" 
                                  : "var(--color-text)",
                                fontSize: "0.8125rem",
                                fontWeight: 800,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                outline: "none",
                              }}
                            >
                              <span>{translatedValText}</span>
                              {hasPriceMod && (
                                <span style={{ 
                                  fontSize: "0.75rem", 
                                  opacity: 0.8, 
                                  fontWeight: 600,
                                  background: isSelected ? "rgba(37,211,102,0.15)" : "var(--color-surface-3)",
                                  padding: "1px 5px",
                                  borderRadius: "4px"
                                }}>
                                  +{val.price} {currencySymbol}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="divider" style={{ margin: "0.5rem 0 0 0" }} />

              {/* Confirm Button Action Bar */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <button
                  onClick={handleConfirmOptions}
                  className="btn-primary"
                  style={{
                    width: "100%",
                    fontSize: "0.9375rem",
                    minHeight: "48px",
                    background: "linear-gradient(135deg, var(--color-success), #16a34a)",
                    border: "none",
                    boxShadow: "0 4px 12px var(--color-success-muted)",
                    fontWeight: 850,
                  }}
                >
                  {t.optionsConfirmBtn
                    .replace("{price}", cumulativePrice.toLocaleString(lang === "tr" ? "tr-TR" : "en-US", { minimumFractionDigits: 2 }))
                    .replace("{symbol}", currencySymbol)}
                </button>
              </div>
            </div>

            <style>{`
              @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes sheet-slide-up {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
              }
            `}</style>
          </div>
        );
      })()}
    </div>
  );
}
