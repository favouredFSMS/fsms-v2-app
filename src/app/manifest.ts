import type { MetadataRoute } from "next";

/**
 * FSMS V2 — PWA manifest (Phase 25).
 *
 * Next.js serves this at `/manifest.webmanifest`. `display: "standalone"`
 * enables installability; the icon set includes a maskable variant so the OS
 * can crop to any shape (Android adaptive icons, iOS, etc.).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FAVOURED Student Management System",
    short_name: "FSMS",
    description: "School administration: students, classes, curriculum, finance and reporting.",
    id: "/dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
