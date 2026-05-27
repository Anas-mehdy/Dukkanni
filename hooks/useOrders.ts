"use client";

/**
 * hooks/useOrders.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Real-Time Orders Hook
 *
 * Features:
 *   - Fetches today's orders (with nested order_items) on mount
 *   - Subscribes to Supabase Realtime postgres_changes on the `orders` table
 *   - Shows an info toast when a new order arrives
 *   - Exposes markDelivered() and markAllDelivered() for fulfillment actions
 *   - Optimistic UI updates (no re-fetch required for status changes)
 *
 * Security:
 *   - store_id is always resolved server-side from auth.uid()
 *   - RLS policies on the DB ensure merchants only see their own orders
 *   - .eq("store_id", storeId) is an app-layer double-check
 *
 * Requires: component must be inside <ToastProvider>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/ui/Toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrderItemSnapshot {
  id:           string;
  product_id:   string | null;
  product_name: string;
  unit_price:   number;
  quantity:     number;
}

export interface OrderWithItems {
  id:                 string;
  customer_name:      string;
  customer_phone:     string;
  tracking_url:       string | null;
  total_amount:       number;
  currency_code:      string;
  payment_status:     string;
  fulfillment_status: "pending" | "shipped" | "delivered" | "cancelled";
  whatsapp_sent_at:   string | null;
  created_at:         string;
  items:              OrderItemSnapshot[];
}

// ── Synthesized pleasant chime notification (A5 -> C#6) using Web Audio ─────
function playNewOrderChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First bell chime (A5 Note)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Second bell chime (C#6 Note - Major Third above A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1108.73, now + 0.1);
    gain2.gain.setValueAtTime(0.12, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn("AudioContext playback was blocked or unsupported:", e);
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOrders() {
  const [orders,  setOrders]  = useState<OrderWithItems[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Stable client reference — createBrowserClient deduplicates internally
  const supabase    = useMemo(() => createClient(), []);
  const { toast }   = useToast();
  const isMount     = useRef(true);

  // ── Step 1: Resolve store_id from the authenticated user ─────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: store } = await supabase
        .from("stores")
        .select("id, name")
        .eq("owner_id", user.id)
        .single();

      if (store?.id) {
        setStoreId(store.id);
        setStoreName(store.name || null);
      } else {
        setLoading(false); // No store yet — new merchant
      }
    };
    init();
  }, [supabase]);

  // ── Step 2: Fetch today's orders (full snapshot with items) ───────────────
  const fetchOrders = useCallback(
    async (silent = false) => {
      if (!storeId) return;
      if (!silent) setLoading(true);

      // Today at 00:00:00 local time, expressed as ISO for the DB query
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data, error: fetchErr } = await supabase
        .from("orders")
        .select(`
          id,
          customer_name,
          customer_phone,
          tracking_url,
          total_amount,
          currency_code,
          payment_status,
          fulfillment_status,
          whatsapp_sent_at,
          created_at,
          items:order_items (
            id,
            product_id,
            product_name,
            unit_price,
            quantity
          )
        `)
        .eq("store_id", storeId)
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: false });

      if (!isMount.current) return;

      if (fetchErr) {
        setError(fetchErr.message);
      } else {
        setOrders((data ?? []) as OrderWithItems[]);
        setError(null);
      }
      setLoading(false);
    },
    [storeId, supabase]
  );

  // ── Step 3: Initial fetch + Realtime subscription ─────────────────────────
  useEffect(() => {
    if (!storeId) return;

    fetchOrders(); // Initial load

    // Subscribe to any INSERT or UPDATE on the orders table for this store
    const channel = supabase
      .channel(`orders-realtime-${storeId}`)
      .on(
        "postgres_changes",
        {
          event:  "*",          // INSERT + UPDATE + DELETE
          schema: "public",
          table:  "orders",
          filter: `store_id=eq.${storeId}`,
        },
        (payload: { eventType: string }) => {
          if (payload.eventType === "INSERT") {
            toast.info("🔔 طلب جديد وصل!");
            playNewOrderChime();
          }
          // Re-fetch silently to pick up the new/updated row + items
          fetchOrders(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, fetchOrders, supabase, toast]);

  // Cleanup ref on unmount
  useEffect(() => {
    isMount.current = true;
    return () => { isMount.current = false; };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Marks a single order as delivered.
   * Applies an optimistic update immediately, then syncs via realtime.
   */
  const markDelivered = useCallback(
    async (orderId: string): Promise<boolean> => {
      if (!storeId) return false;

      // Optimistic update
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, fulfillment_status: "delivered" as const } : o
        )
      );

      const { error: updateErr } = await supabase
        .from("orders")
        .update({ fulfillment_status: "delivered" })
        .eq("id", orderId)
        .eq("store_id", storeId); // App-layer RLS double-check

      if (updateErr) {
        // Revert on failure
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, fulfillment_status: "pending" as const } : o
          )
        );
        toast.error("خطأ في تحديث حالة الطلب");
        return false;
      }

      toast.success("تم تسليم الطلب ✓");
      return true;
    },
    [storeId, supabase, toast]
  );

  /**
   * Marks ALL pending orders for today as delivered in a single DB call.
   */
  const markAllDelivered = useCallback(async (): Promise<boolean> => {
    if (!storeId) return false;

    const pendingIds = orders
      .filter((o) => o.fulfillment_status === "pending")
      .map((o) => o.id);

    if (pendingIds.length === 0) return false;

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) =>
        pendingIds.includes(o.id)
          ? { ...o, fulfillment_status: "delivered" as const }
          : o
      )
    );

    const { error: updateErr } = await supabase
      .from("orders")
      .update({ fulfillment_status: "delivered" })
      .in("id", pendingIds)
      .eq("store_id", storeId);

    if (updateErr) {
      // Revert
      setOrders((prev) =>
        prev.map((o) =>
          pendingIds.includes(o.id)
            ? { ...o, fulfillment_status: "pending" as const }
            : o
        )
      );
      toast.error("خطأ في تحديث الطلبات. حاول مجدداً.");
      return false;
    }

    toast.success(`🎉 تم تسليم ${pendingIds.length} طلبات بنجاح!`);
    return true;
  }, [orders, storeId, supabase, toast]);

  /**
   * Marks a single order as shipped, saving the optional tracking URL.
   */
  const markShipped = useCallback(
    async (orderId: string, trackingUrl?: string): Promise<boolean> => {
      if (!storeId) return false;

      // Optimistic update
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                fulfillment_status: "shipped" as const,
                tracking_url: trackingUrl || null,
              }
            : o
        )
      );

      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          fulfillment_status: "shipped",
          tracking_url: trackingUrl || null,
        })
        .eq("id", orderId)
        .eq("store_id", storeId);

      if (updateErr) {
        // Revert
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, fulfillment_status: "pending" as const, tracking_url: null } : o
          )
        );
        toast.error("خطأ في تحديث حالة الشحن");
        return false;
      }

      toast.success("تم شحن الطلب وتحديث الرابط ✓");
      return true;
    },
    [storeId, supabase, toast]
  );

  // ── Derived state ─────────────────────────────────────────────────────────

  const pendingOrders   = orders.filter((o) => o.fulfillment_status === "pending");
  const shippedOrders   = orders.filter((o) => o.fulfillment_status === "shipped");
  const deliveredOrders = orders.filter((o) => o.fulfillment_status === "delivered");

  return {
    orders,
    pendingOrders,
    shippedOrders,
    deliveredOrders,
    loading,
    error,
    storeId,
    storeName,
    refetch:         () => fetchOrders(),
    markDelivered,
    markShipped,
    markAllDelivered,
  } as const;
}
