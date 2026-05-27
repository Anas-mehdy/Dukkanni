"use client";

import React, { useState, useMemo } from "react";

interface Product {
  id: number;
  name: string;
  price: number;
  emoji: string;
  category: string;
  image: string;
}

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "عطر الياسمين الشامي",
    price: 180,
    emoji: "🌸",
    category: "عطور الياسمين",
    image: "/products-images-mainpage/jasmine.jpeg",
  },
  {
    id: 2,
    name: "عطر اللافندر الطبيعي",
    price: 150,
    emoji: "🌿",
    category: "عطور الياسمين",
    image: "/products-images-mainpage/lavender.jpeg",
  },
  {
    id: 3,
    name: "دهن العود الملكي",
    price: 450,
    emoji: "🪵",
    category: "بخور عود",
    image: "/products-images-mainpage/royal_oud.jpeg",
  },
  {
    id: 4,
    name: "بخور كسر العود الفاخر",
    price: 280,
    emoji: "🔥",
    category: "بخور عود",
    image: "/products-images-mainpage/premium_incense.jpeg",
  },
  {
    id: 5,
    name: "عطر الورد الجوري",
    price: 170,
    emoji: "🌹",
    category: "عطور نسائية",
    image: "/products-images-mainpage/rose.jpeg",
  },
  {
    id: 6,
    name: "مسك الطهارة الأصلي",
    price: 200,
    emoji: "❄️",
    category: "عطور نسائية",
    image: "/products-images-mainpage/white_musk.jpeg",
  },
];

const CATEGORIES = ["الكل", "عطور الياسمين", "بخور عود", "عطور نسائية"];

export function PhoneSimulator() {
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<{ [productId: number]: number }>({
    1: 1, // Pre-fill with 1 Damask Jasmine
    2: 1, // Pre-fill with 1 Natural Lavender
  });
  const [showInvoiceAlert, setShowInvoiceAlert] = useState(false);

  // Filter products based on selected category & search query
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      const matchesCategory =
        selectedCategory === "الكل" || product.category === selectedCategory;
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Handle Cart Increments / Decrements
  const addToCart = (id: number) => {
    setCart((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[id] <= 1) {
        delete next[id];
      } else {
        next[id] -= 1;
      }
      return next;
    });
  };

  // Calculations
  const cartItemsCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = PRODUCTS.reduce((sum, product) => {
    const qty = cart[product.id] || 0;
    return sum + product.price * qty;
  }, 0);

  // Generate simulated WhatsApp text
  const whatsappMessage = useMemo(() => {
    let text = "*طلب جديد من متجر دكان الياسمين 🌸*\n\n";
    text += "تفاصيل الطلبية:\n";
    PRODUCTS.forEach((product) => {
      const qty = cart[product.id] || 0;
      if (qty > 0) {
        text += `- ${product.emoji} *${product.name}* (الكمية: ${qty}) - ${product.price * qty} TL\n`;
      }
    });
    text += `\n*المجموع الإجمالي:* ${cartTotal} TL\n`;
    text += "═══════════════════\n";
    text += "👤 *الاسم:* أحمد المحمد\n";
    text += "📱 *الجوال:* +90535XXXXXXX\n\n";
    text += "⚡ تم الطلب عبر منصة *دكاني*";
    return text;
  }, [cart, cartTotal]);

  return (
    <div className="relative mx-auto w-full max-w-[290px] sm:max-w-[340px] aspect-[9/18.5] bg-neutral-900 border-[8px] border-neutral-800 rounded-[2.5rem] shadow-2xl overflow-hidden ring-4 ring-emerald-500/10 transform rotate-0 md:rotate-1 hover:rotate-0 transition-transform duration-300">
      {/* Phone Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-4 bg-neutral-800 rounded-b-xl z-20" />

      {/* Screen Content */}
      <div className="h-full w-full bg-[var(--color-bg)] p-4 flex flex-col justify-between select-none overflow-hidden text-right font-cairo transition-colors duration-200">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mock Store Header */}
          <div className="flex items-center justify-between mt-4 mb-3 border-b border-[var(--color-border)] pb-2 flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h4 className="text-xs font-extrabold text-[var(--color-text)]">دكان الياسمين 🌸</h4>
          </div>

          {/* Mock Search Bar */}
          <div className="relative mb-3 flex-shrink-0">
            <input
              type="text"
              placeholder="ابحث عن عطر أو صنف... 🔍"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-border)] px-3 text-[10px] text-[var(--color-text)] text-right placeholder-neutral-400 focus:outline-none focus:border-emerald-500/50"
              dir="rtl"
            />
          </div>

          {/* Mock Categories Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1.5 mb-2.5 justify-start scrollbar-none flex-shrink-0" dir="rtl">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[9px] px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold"
                      : "bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-transparent hover:bg-[var(--color-surface-2)]"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Mock Product Grid (Scrollable) */}
          <div className="flex-1 overflow-y-auto pr-0.5 pl-0.5 space-y-2 mb-2 scrollbar-thin">
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {filteredProducts.map((product) => {
                  const qty = cart[product.id] || 0;
                  return (
                    <div
                      key={product.id}
                      className="bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 rounded-xl flex flex-col justify-between transition-all hover:border-[var(--color-border-hover)]"
                    >
                      <div className="w-full aspect-square rounded-lg bg-[var(--color-surface-2)] overflow-hidden flex items-center justify-center relative">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          loading="lazy"
                        />
                        {qty > 0 && (
                          <span className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[9px] font-extrabold shadow-md animate-scale z-10">
                            {qty}
                          </span>
                        )}
                      </div>
                      <h5 className="text-[9px] font-bold text-[var(--color-text)] mt-2 leading-snug h-7 flex items-center justify-end">
                        {product.name}
                      </h5>
                      <div className="flex justify-between items-center mt-2.5">
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1 rounded font-bold">
                          {product.price} TL
                        </span>

                        <div className="flex items-center gap-1.5">
                          {qty > 0 ? (
                            <>
                              <button
                                onClick={() => removeFromCart(product.id)}
                                className="w-4.5 h-4.5 rounded-full bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)] font-extrabold flex items-center justify-center text-[10px] shadow-sm hover:bg-[var(--color-surface-4)]"
                              >
                                -
                              </button>
                              <span className="text-[9px] font-extrabold text-[var(--color-text)] min-w-[6px] text-center">
                                {qty}
                              </span>
                              <button
                                onClick={() => addToCart(product.id)}
                                className="w-4.5 h-4.5 rounded-full bg-emerald-500 text-white font-extrabold flex items-center justify-center text-[10px] shadow-sm hover:bg-emerald-600"
                              >
                                +
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => addToCart(product.id)}
                              className="w-4.5 h-4.5 rounded-full bg-emerald-500 text-white font-extrabold flex items-center justify-center text-[10px] shadow-sm hover:bg-emerald-600"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-[10px] text-[var(--color-text-muted)]">
                لا توجد منتجات تطابق البحث 🔍
              </div>
            )}
          </div>
        </div>

        {/* Mock Checkout Sheet (Sticky Bottom) */}
        <div className="bg-[var(--color-surface)] border border-emerald-500/20 p-2.5 rounded-xl flex-shrink-0 mt-1">
          <div className="flex justify-between text-[9px] font-extrabold text-[var(--color-text)] mb-2">
            <span>{cartTotal} TL</span>
            <span>سلة المشتريات ({cartItemsCount} منتج)</span>
          </div>
          <button
            onClick={() => setShowInvoiceAlert(true)}
            className="w-full py-1.5 bg-[#25D366] hover:bg-[#20ba56] text-white font-bold rounded-lg text-[9px] flex items-center justify-center gap-1 shadow-sm transition-all hover:scale-101 active:scale-99"
          >
            💬 أرسل الفاتورة وتأكيد الطلب
          </button>
        </div>
      </div>

      {/* Simulated WhatsApp Modal Overlay */}
      {showInvoiceAlert && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-30 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 w-full max-w-[260px] shadow-xl text-right animate-scale">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-neutral-800">
              <button
                onClick={() => setShowInvoiceAlert(false)}
                className="text-xs text-neutral-450 hover:text-white"
              >
                ✕
              </button>
              <h5 className="text-[10px] font-extrabold text-emerald-400 flex items-center gap-1">
                <span>معاينة رسالة الواتساب المنسقة</span>
                <span>💬</span>
              </h5>
            </div>

            <pre className="bg-neutral-950 p-2.5 rounded-lg text-[8px] text-neutral-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed select-text" dir="rtl">
              {whatsappMessage}
            </pre>

            <button
              onClick={() => setShowInvoiceAlert(false)}
              className="mt-3 w-full py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9px] font-bold text-center transition-all"
            >
              تمت المعاينة بنجاح
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
