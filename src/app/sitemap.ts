import type { MetadataRoute } from "next";
import { getSitemapArtworks } from "@/features/gallery/queries";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/site";

// Diperbarui lewat revalidateGallery() saat karya berubah; per jam sebagai cadangan.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const artworks = await getSitemapArtworks();
  return [
    { url: absoluteUrl(routes.gallery.home), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl(routes.gallery.catalog), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl(routes.gallery.about), changeFrequency: "monthly", priority: 0.5 },
    ...artworks.map((a) => ({
      url: absoluteUrl(routes.gallery.artwork(a.slug)),
      lastModified: a.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
