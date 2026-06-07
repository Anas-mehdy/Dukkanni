import { createClient } from "@/lib/supabase/server";

export type PlanTier = "free" | "starter" | "pro";

export interface PlanLimits {
  id: PlanTier;
  name: string;
  nameAr: string;
  price: number;
  maxProducts: number; // -1 means unlimited
  maxCategories: number; // -1 means unlimited
  maxImagesPerProduct: number; // -1 means unlimited
  maxOrdersPerMonth: number; // -1 means unlimited
  removeBranding: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    id: "free",
    name: "Free",
    nameAr: "المجانية",
    price: 0,
    maxProducts: 15,
    maxCategories: 3,
    maxImagesPerProduct: 2,
    maxOrdersPerMonth: 100,
    removeBranding: false,
  },
  starter: {
    id: "starter",
    name: "Starter",
    nameAr: "البداية",
    price: 5,
    maxProducts: 100,
    maxCategories: 15,
    maxImagesPerProduct: 4,
    maxOrdersPerMonth: 500,
    removeBranding: false,
  },
  pro: {
    id: "pro",
    name: "Pro",
    nameAr: "الاحترافية",
    price: 15,
    maxProducts: -1,
    maxCategories: -1,
    maxImagesPerProduct: -1,
    maxOrdersPerMonth: -1,
    removeBranding: true,
  },
};

export interface PlanUsage {
  planTier: PlanTier;
  limits: PlanLimits;
  usage: {
    products: number;
    categories: number;
    orders: number;
  };
}

/**
 * Helper to fetch store plan limits and current monthly usage counts.
 */
export async function getStorePlanUsage(supabase: any, storeId: string): Promise<PlanUsage> {
  // 1. Fetch store plan tier
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("plan_tier")
    .eq("id", storeId)
    .single();

  if (storeError || !store) {
    throw new Error("لم يتم العثور على المتجر");
  }

  const planTier = (store.plan_tier || "free") as PlanTier;
  const limits = PLAN_LIMITS[planTier] || PLAN_LIMITS.free;

  // 2. Count products
  const { count: productsCount, error: productsError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);

  if (productsError) throw productsError;

  // 3. Count categories
  const { count: categoriesCount, error: categoriesError } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);

  if (categoriesError) throw categoriesError;

  // 4. Count orders for the current calendar month
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { count: ordersCount, error: ordersError } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .gte("created_at", startOfMonth.toISOString());

  if (ordersError) throw ordersError;

  return {
    planTier,
    limits,
    usage: {
      products: productsCount ?? 0,
      categories: categoriesCount ?? 0,
      orders: ordersCount ?? 0,
    },
  };
}
