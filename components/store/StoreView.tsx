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

import { useState, useMemo } from "react";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { getCurrencySymbol } from "@/lib/constants";
import { useTheme } from "@/hooks/useTheme";
import type { CategoryRow, ProductRow, StoreRow } from "@/types/database";

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

interface StoreViewProps {
  store:      Pick<StoreRow, "id" | "name" | "slug" | "logo_url" | "currency_code">;
  categories: Pick<CategoryRow, "id" | "name" | "sort_order">[];
  products:   Pick<ProductRow, "id" | "name" | "price" | "image_url" | "is_active" | "sort_order" | "category_id">[];
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
}: {
  product:       StoreViewProps["products"][number];
  currencySymbol: string;
  quantity:      number;
  onAdd:         () => void;
  onIncrement:   () => void;
  onDecrement:   () => void;
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
              لا توجد صورة
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
          القطعة
        </span>
        <p
          style={{
            fontSize:   "1rem",
            fontWeight: 800,
            color:      "var(--color-success)",
            lineHeight: 1
          }}
        >
          {currencySymbol}{product.price.toLocaleString("ar", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {/* Sleek Pill quantitative adjuster stepper [- 0 +] (visible by default) */}
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
          aria-label="تقليل"
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
          aria-label="زيادة"
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
  const handleAdd = (product: StoreViewProps["products"][number]) => {
    cart.addItem({
      productId: product.id,
      name:      product.name,
      price:     product.price,
      imageUrl:  product.image_url,
    });
  };

  const handleIncrement = (product: StoreViewProps["products"][number]) => {
    cart.updateQuantity(product.id, cart.getQuantity(product.id) + 1);
  };

  const handleDecrement = (product: StoreViewProps["products"][number]) => {
    cart.updateQuantity(product.id, cart.getQuantity(product.id) - 1);
  };

  // Store first letter (like the "ج" circular avatar)
  const storeInitial = store.name.trim().charAt(0).toUpperCase();

  return (
    <div
      style={{
        minHeight:  "100dvh",
        background: "var(--color-bg)",
        fontFamily: "var(--font-cairo), sans-serif",
        direction:  "rtl",
        maxWidth:   "600px",
        margin:     "0 auto",
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
          direction: "rtl",
        }}
      >
        <span>
          تريد متجراً مشابهاً؟{" "}
          <a
            href="/"
            style={{
              color: "var(--color-primary)",
              textDecoration: "underline",
              fontWeight: 800,
              marginRight: "0.25rem",
            }}
          >
            أنشئ متجرك مع دكاني ⚡
          </a>
        </span>
      </div>

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
              كتالوج تجاري ⚡
            </p>
          </div>
        </div>

        {/* Left side: theme choice + cart + back arrow */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          
          {/* Light/Dark Toggle choice */}
          <button
            onClick={toggleTheme}
            aria-label="تغيير المظهر"
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
            aria-label="عرض السلة"
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
              fontFamily:     "var(--font-cairo), sans-serif",
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
                fontFamily:   "var(--font-cairo), sans-serif",
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
              <span>الكل</span>
              <span>🏪</span>
            </button>

            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
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
                    fontFamily:   "var(--font-cairo), sans-serif",
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
                  <span>{cat.name}</span>
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
              لا توجد منتجات في هذه الفئة حالياً
            </p>
          </div>
        ) : (
          <>
            {/* 1. Categorized Groups */}
            {groupedProducts.map((group) => {
              const catEmoji = getCategoryEmoji(group.name);
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
                        {group.name}
                      </p>
                      <span style={{ fontSize: "0.6875rem", color: "var(--color-text-faint)", fontWeight: 700 }}>
                        منتج {group.products.length}
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
                    {group.products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        currencySymbol={currencySymbol}
                        quantity={cart.hydrated ? cart.getQuantity(product.id) : 0}
                        onAdd={() => handleAdd(product)}
                        onIncrement={() => handleIncrement(product)}
                        onDecrement={() => handleDecrement(product)}
                      />
                    ))}
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
                    <p style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--color-text)" }}>غير مصنف</p>
                    <span style={{ fontSize: "0.6875rem", color: "var(--color-text-faint)", fontWeight: 700 }}>
                      منتج {uncategorizedProducts.length}
                    </span>
                  </div>
                  <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
                </div>

                {/* 2-Column Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", paddingInline: "1rem" }}>
                  {uncategorizedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      currencySymbol={currencySymbol}
                      quantity={cart.hydrated ? cart.getQuantity(product.id) : 0}
                      onAdd={() => handleAdd(product)}
                      onIncrement={() => handleIncrement(product)}
                      onDecrement={() => handleDecrement(product)}
                    />
                  ))}
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
              fontFamily:     "var(--font-cairo), sans-serif",
              fontWeight:     800,
              fontSize:       "0.9375rem",
              boxShadow:      "0 4px 16px var(--color-success-muted)",
              transition:     "opacity 0.15s",
            }}
          >
            <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: "var(--radius-full)", padding: "0.2rem 0.625rem", fontSize: "0.8125rem" }}>
              {cart.totalItems} منتج
            </span>

            <span>إتمام الطلب عبر واتساب ←</span>

            <span style={{ fontWeight: 800 }}>
              {cart.totalPrice.toLocaleString("ar", { minimumFractionDigits: 2 })} {currencySymbol}
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
    </div>
  );
}
