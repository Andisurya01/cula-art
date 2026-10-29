import "server-only";
// og:image Galeri sebagai JPEG 1200×630 (dipakai file opengraph-image.ts di route Galeri).
// File metadata per segmen diperlukan karena openGraph halaman anak menimpa gambar dari segmen induk.

import { OG_IMAGE_SIZE, renderOgImage } from "@/lib/images";
import { readStoredFile } from "@/lib/storage";
import { getFeaturedArtworks, getGalleryArtwork, getLatestArtworks } from "./queries";
import type { GalleryImage } from "./dto";

export const OG_CONTENT_TYPE = "image/jpeg";
export { OG_IMAGE_SIZE };

async function jpegResponse(cover: GalleryImage | null | undefined): Promise<Response> {
  // cover.src = /media/<key>; hanya foto karya Terbit (dari query Galeri) yang dibaca.
  const key = cover?.src.split("/").pop();
  const jpeg = await renderOgImage(key ? await readStoredFile(key) : null);
  return new Response(new Uint8Array(jpeg), { headers: { "Content-Type": OG_CONTENT_TYPE } });
}

/** Cover karya unggulan pertama (cadangan: terbaru). */
export async function galleryOgImage(): Promise<Response> {
  const [featured, latest] = await Promise.all([getFeaturedArtworks(8), getLatestArtworks(6)]);
  return jpegResponse([...featured, ...latest].find((a) => a.cover)?.cover);
}

/** Cover karya Terbit; slug lain → 404. */
export async function artworkOgImage(slug: string): Promise<Response> {
  const result = await getGalleryArtwork(slug);
  if (result?.kind !== "found") return new Response("Tidak ditemukan", { status: 404 });
  return jpegResponse(result.artwork.cover);
}
