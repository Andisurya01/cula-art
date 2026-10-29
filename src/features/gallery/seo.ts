// Data terstruktur schema.org untuk Galeri (fungsi murni). Nanti ditambah Product + Offer saat toko aktif.

import { galleryCopy } from "./copy";
import type { GalleryArtworkDetail } from "./dto";

type QuantitativeValue = { "@type": "QuantitativeValue"; value: number; unitCode: "CMT" };

export type VisualArtworkJsonLd = {
  "@context": "https://schema.org";
  "@type": "VisualArtwork";
  name: string;
  url: string;
  image?: string[];
  description?: string;
  artform?: string;
  artMedium?: string;
  dateCreated?: string;
  datePublished?: string;
  dateModified: string;
  width?: QuantitativeValue;
  height?: QuantitativeValue;
  depth?: QuantitativeValue;
  creator: { "@type": "Person"; name: string; url?: string };
  inLanguage: "id-ID";
};

function centimeters(value: number | null): QuantitativeValue | undefined {
  return value !== null && value > 0 ? { "@type": "QuantitativeValue", value, unitCode: "CMT" } : undefined;
}

function text(value: string | null | undefined): string | undefined {
  const clean = value?.trim();
  return clean ? clean : undefined;
}

/**
 * JSON-LD `VisualArtwork` untuk halaman detail. Semua URL harus absolut. Hanya memakai field DTO
 * publik, jadi harga tersembunyi tidak mungkin ikut.
 */
export function artworkJsonLd(input: {
  artwork: GalleryArtworkDetail;
  url: string;
  imageUrls: string[];
  creator: { name: string; url?: string };
}): VisualArtworkJsonLd {
  const { artwork } = input;
  return {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: artwork.title,
    url: input.url,
    image: input.imageUrls.length > 0 ? input.imageUrls : undefined,
    description: text(artwork.summary) ?? text(artwork.description),
    artform: artwork.medium ? galleryCopy.medium[artwork.medium] : undefined,
    artMedium: text(artwork.materials),
    dateCreated: artwork.year ? String(artwork.year) : undefined,
    datePublished: artwork.publishedAt?.toISOString(),
    dateModified: artwork.updatedAt.toISOString(),
    width: centimeters(artwork.widthCm),
    height: centimeters(artwork.heightCm),
    depth: centimeters(artwork.depthCm),
    creator: { "@type": "Person", name: input.creator.name, url: input.creator.url },
    inLanguage: "id-ID",
  };
}

/**
 * Isi `<script type="application/ld+json">`. `<` di-escape supaya teks seperti `</script>` di judul
 * atau cerita tidak bisa menutup tag skrip (XSS). Field undefined dibuang oleh JSON.stringify.
 */
export function serializeJsonLd(data: object): string {
  // U+2028/U+2029 (pemisah baris) juga di-escape, seperti serialize-javascript.
  return JSON.stringify(data).replace(/[<\u2028\u2029]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
