/**
 * app/[slug]/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Public Store Catalog (ISR Server Component)
 *
 * ISR strategy:
 *   - Cached and served from CDN edge
 *   - Revalidated every 60 seconds in the background
 *   - First request always gets fresh data if no cache exists
 *   - Uses createPublicClient() — no cookies() call — stays cacheable
 *
 * SEO:
 *   - generateMetadata() builds per-store title, description, and OG tags
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { notFound }               from "next/navigation";
import type { Metadata }          from "next";
import { createPublicClient }     from "@/lib/supabase/public";
import StoreView                  from "@/components/store/StoreView";

// ---------------------------------------------------------------------------
// ISR — revalidate every 60 seconds
// ---------------------------------------------------------------------------

export const revalidate = 60;
export const dynamicParams = true; // Allow slugs not known at build time

// ---------------------------------------------------------------------------
// generateMetadata — per-store SEO + OG tags
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: store } = await supabase
    .from("stores")
    .select("name, logo_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!store) {
    return {
      title:       "متجر غير موجود — دكاني",
      description: "لم يتم العثور على هذا المتجر.",
    };
  }

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? "https://dukkanni.com";
  const title       = `${store.name} — اطلب الآن عبر واتساب`;
  const description = `تصفح منتجات ${store.name} وأضفها للسلة وأرسل طلبك مباشرة عبر واتساب بضغطة واحدة.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url:    `${appUrl}/${slug}`,
      siteName: "دكاني",
      type:   "website",
      ...(store.logo_url && {
        images: [{ url: store.logo_url, width: 400, height: 400, alt: store.name }],
      }),
    },
    twitter: {
      card:        "summary",
      title,
      description,
      ...(store.logo_url && { images: [store.logo_url] }),
    },
    alternates: {
      canonical: `${appUrl}/${slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createPublicClient();

  // ── Fetch store ───────────────────────────────────────────────────────────
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, slug, logo_url, currency_code, is_active")
    .eq("slug", slug)
    .single();

  if (storeError || !store || !store.is_active) {
    notFound();
  }

  // ── Fetch categories ──────────────────────────────────────────────────────
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("store_id", store.id)
    .order("sort_order", { ascending: true })
    .order("name",       { ascending: true });

  // ── Fetch active products ─────────────────────────────────────────────────
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, image_url, is_active, sort_order, category_id, options")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name",       { ascending: true });

  const safeCategories = categories ?? [];
  const safeProducts   = products   ?? [];

  return (
    <StoreView
      store={store}
      categories={safeCategories}
      products={safeProducts}
    />
  );
}
