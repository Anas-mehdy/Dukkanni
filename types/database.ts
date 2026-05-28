/**
 * types/database.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Supabase Database Type Definitions
 * Used by createBrowserClient<Database> and createServerClient<Database>.
 *
 * IMPORTANT: After any schema change, regenerate with:
 *   npx supabase gen types typescript --project-id <your-project-id> > types/database.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type PaymentStatus     = "cod_pending" | "paid" | "refunded";
export type FulfillmentStatus = "pending" | "delivered" | "cancelled";

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export interface StoreRow {
  id:            string;
  owner_id:      string;
  slug:          string;
  name:          string;
  whatsapp_e164: string;
  logo_url:      string | null;
  currency_code: string;
  is_active:     boolean;
  created_at:    string;
  updated_at:    string;
}

export interface CategoryRow {
  id:         string;
  store_id:   string;
  name:       string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id:          string;
  store_id:    string;
  category_id: string | null;
  name:        string;
  price:       number;
  image_url:   string | null;
  is_active:   boolean;
  sort_order:  number;
  options:     Json;
  created_at:  string;
  updated_at:  string;
}

export interface OrderRow {
  id:                 string;
  store_id:           string;
  customer_name:      string;
  total_amount:       number;
  currency_code:      string;
  payment_status:     PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  whatsapp_sent_at:   string | null;
  created_at:         string;
}

export interface OrderItemRow {
  id:           string;
  order_id:     string;
  store_id:     string;
  product_id:   string | null;
  product_name: string;
  unit_price:   number;
  quantity:     number;
}

// ---------------------------------------------------------------------------
// Insert types
// ---------------------------------------------------------------------------

export type StoreInsert     = Omit<StoreRow, "id" | "created_at" | "updated_at">;
export type CategoryInsert  = Omit<CategoryRow, "id" | "created_at" | "updated_at">;
export type ProductInsert   = Omit<ProductRow, "id" | "created_at" | "updated_at">;
export type OrderInsert     = Omit<OrderRow, "id" | "created_at">;
export type OrderItemInsert = Omit<OrderItemRow, "id">;

// ---------------------------------------------------------------------------
// Update types
// ---------------------------------------------------------------------------

export type StoreUpdate     = Partial<Omit<StoreRow, "id" | "owner_id" | "created_at">>;
export type CategoryUpdate  = Partial<Omit<CategoryRow, "id" | "store_id" | "created_at">>;
export type ProductUpdate   = Partial<Omit<ProductRow, "id" | "store_id" | "created_at">>;
export type OrderUpdate     = Partial<Pick<OrderRow, "fulfillment_status" | "payment_status" | "whatsapp_sent_at">>;
export type OrderItemUpdate = Partial<Pick<OrderItemRow, "quantity">>;

// ---------------------------------------------------------------------------
// Database interface for Supabase client generic
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      stores: {
        Row:    StoreRow;
        Insert: StoreInsert;
        Update: StoreUpdate;
      };
      categories: {
        Row:    CategoryRow;
        Insert: CategoryInsert;
        Update: CategoryUpdate;
      };
      products: {
        Row:    ProductRow;
        Insert: ProductInsert;
        Update: ProductUpdate;
      };
      orders: {
        Row:    OrderRow;
        Insert: OrderInsert;
        Update: OrderUpdate;
      };
      order_items: {
        Row:    OrderItemRow;
        Insert: OrderItemInsert;
        Update: OrderItemUpdate;
      };
    };
    Views: {
      v_daily_fulfillment: {
        Row: {
          store_id:       string;
          product_id:     string | null;
          product_name:   string;
          unit_price:     number;
          total_quantity: number;
          total_value:    number;
          order_count:    number;
        };
      };
    };
    Functions:  Record<string, never>;
    Enums: {
      payment_status:     PaymentStatus;
      fulfillment_status: FulfillmentStatus;
    };
  };
}
