import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "دكاني — متجرك الإلكتروني على واتساب",
    short_name: "دكاني",
    description: "أنشئ متجرك الإلكتروني واستقبل الطلبات مباشرة على واتساب",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#22c55e", // Premium Emerald Green to match light/dark styling
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
