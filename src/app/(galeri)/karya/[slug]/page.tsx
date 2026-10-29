import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ArtworkDetailView } from "@/features/gallery/components/artwork-detail";
import { JsonLd } from "@/features/gallery/components/json-ld";
import { galleryCopy } from "@/features/gallery/copy";
import { artworkMeta, metaDescription } from "@/features/gallery/format";
import {
  getGalleryArtwork,
  getGalleryProfile,
  getRelatedArtworks,
  getSitemapArtworks,
} from "@/features/gallery/queries";
import { artworkJsonLd } from "@/features/gallery/seo";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

// Semua karya Terbit di-prerender saat build (ISR, revalidate dari layout + revalidateGallery()).
// Karya yang terbit setelah build dirender saat pertama dibuka lalu ikut di-cache (dynamicParams default).
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const artworks = await getSitemapArtworks();
  return artworks.map((a) => ({ slug: a.slug }));
}

/** Karya Terbit; slug lama → 308 ke slug baru; selain itu 404. */
async function loadArtwork(slug: string) {
  const result = await getGalleryArtwork(slug);
  if (!result) notFound();
  if (result.kind === "redirect") permanentRedirect(routes.gallery.artwork(result.slug));
  return result.artwork;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [artwork, profile] = await Promise.all([loadArtwork(slug), getGalleryProfile()]);
  const path = routes.gallery.artwork(artwork.slug);
  const description =
    metaDescription(artwork.summary) ??
    metaDescription(artwork.description) ??
    ([artworkMeta(artwork), galleryCopy.availability[artwork.availability]].filter(Boolean).join(" · ") ||
      galleryCopy.meta.defaultDescription);
  // og:image dari ./opengraph-image.ts (cover sebagai JPEG 1200×630; metadata berbasis file diutamakan Next).
  const hasCover = artwork.cover !== null;

  return {
    title: artwork.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      locale: "id_ID",
      siteName: profile.siteName,
      title: artwork.title,
      description,
      url: absoluteUrl(path),
      ...(artwork.publishedAt ? { publishedTime: artwork.publishedAt.toISOString() } : {}),
      modifiedTime: artwork.updatedAt.toISOString(),
    },
    twitter: {
      card: hasCover ? "summary_large_image" : "summary",
      title: artwork.title,
      description,
    },
  };
}

export default async function ArtworkPage({ params }: Props) {
  const { slug } = await params;
  const artwork = await loadArtwork(slug);
  const [profile, related] = await Promise.all([getGalleryProfile(), getRelatedArtworks(artwork)]);
  const url = absoluteUrl(routes.gallery.artwork(artwork.slug));

  return (
    <>
      <JsonLd
        data={artworkJsonLd({
          artwork,
          url,
          imageUrls: artwork.images.map((image) => absoluteUrl(image.src)),
          creator: { name: profile.siteName, url: absoluteUrl(routes.gallery.about) },
        })}
      />
      <ArtworkDetailView artwork={artwork} profile={profile} url={url} related={related} />
    </>
  );
}
