"use client";

/**
 * hooks/useCart.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — localStorage-backed Cart Hook
 *
 * Features:
 *   - Persists to localStorage under a single key "dukkanni_cart"
 *   - Scoped per store slug — cart auto-clears when visiting a different store
 *   - hydrated flag prevents SSR/client mismatch flash
 *   - All mutations are immutable (no direct state mutation)
 *
 * Usage:
 *   const { items, addItem, updateQuantity, totalPrice, totalItems } = useCart(slug)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types (exported so checkout page can type-check)
// ---------------------------------------------------------------------------

export interface SelectedOption {
  name: string;
  value: string;
  price: number | null;
}

export interface CartItem {
  productId: string;
  name:      string;
  price:     number;
  imageUrl:  string | null;
  quantity:  number;
  selectedOptions?: SelectedOption[];
}

interface PersistedCart {
  storeSlug: string;
  items:     CartItem[];
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const CART_KEY = "dukkanni_cart";

function loadPersistedCart(): PersistedCart | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedCart;
  } catch {
    return null;
  }
}

function persistCart(cart: PersistedCart): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    // Quota exceeded or private-browsing restriction — silently degrade
  }
}

function isSameOptions(a?: SelectedOption[], b?: SelectedOption[]): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((optA) =>
    b.some((optB) => optB.name === optA.name && optB.value === optA.value)
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCart(storeSlug: string) {
  const [items, setItems]       = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // ── Hydrate from localStorage on mount ──────────────────────────────────
  useEffect(() => {
    const saved = loadPersistedCart();
    // Only restore if the saved cart belongs to the same store
    if (saved && saved.storeSlug === storeSlug) {
      setItems(saved.items);
    }
    setHydrated(true);
  }, [storeSlug]);

  // ── Persist to localStorage after every mutation ─────────────────────────
  useEffect(() => {
    if (!hydrated) return; // Skip the initial pre-hydration render
    persistCart({ storeSlug, items });
  }, [items, storeSlug, hydrated]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  /**
   * Adds qty units of a product to the cart.
   * If the product already exists with the same selected options, its quantity is incremented.
   */
  const addItem = useCallback(
    (product: Omit<CartItem, "quantity">, qty = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) =>
          i.productId === product.productId &&
          isSameOptions(i.selectedOptions, product.selectedOptions)
        );
        if (existing) {
          return prev.map((i) =>
            i.productId === product.productId &&
            isSameOptions(i.selectedOptions, product.selectedOptions)
              ? { ...i, quantity: i.quantity + qty }
              : i
          );
        }
        return [...prev, { ...product, quantity: qty }];
      });
    },
    []
  );

  /**
   * Removes a product variant from the cart entirely.
   */
  const removeItem = useCallback((productId: string, selectedOptions?: SelectedOption[]) => {
    setItems((prev) =>
      prev.filter((i) =>
        !(i.productId === productId && isSameOptions(i.selectedOptions, selectedOptions))
      )
    );
  }, []);

  /**
   * Sets the exact quantity for a product variant.
   * Passing qty ≤ 0 removes the product from the cart.
   */
  const updateQuantity = useCallback((productId: string, qty: number, selectedOptions?: SelectedOption[]) => {
    if (qty <= 0) {
      setItems((prev) =>
        prev.filter((i) =>
          !(i.productId === productId && isSameOptions(i.selectedOptions, selectedOptions))
        )
      );
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.productId === productId && isSameOptions(i.selectedOptions, selectedOptions)
            ? { ...i, quantity: qty }
            : i
        )
      );
    }
  }, []);

  /**
   * Empties the cart and clears localStorage.
   */
  const clearCart = useCallback(() => {
    setItems([]);
    if (typeof window !== "undefined") {
      try { window.localStorage.removeItem(CART_KEY); } catch { /* noop */ }
    }
  }, []);

  // ── Computed values ───────────────────────────────────────────────────────

  /**
   * Returns the total quantity in cart for a given productId across all variants.
   */
  const getQuantity = useCallback(
    (productId: string): number =>
      items
        .filter((i) => i.productId === productId)
        .reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  /**
   * Returns the exact quantity in cart for a specific variant combination.
   */
  const getVariantQuantity = useCallback(
    (productId: string, selectedOptions?: SelectedOption[]): number =>
      items.find((i) => i.productId === productId && isSameOptions(i.selectedOptions, selectedOptions))?.quantity ?? 0,
    [items]
  );

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return {
    items,
    hydrated,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getQuantity,
    getVariantQuantity,
    totalItems,
    totalPrice,
  } as const;
}
