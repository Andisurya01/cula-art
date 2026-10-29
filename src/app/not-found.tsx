import type { Metadata } from "next";
import { GalleryNotFound } from "@/features/gallery/components/layout/gallery-not-found";
import { GalleryShell } from "@/features/gallery/components/layout/gallery-shell";
import { getGalleryProfile } from "@/features/gallery/queries";

export const metadata: Metadata = { title: "Halaman tidak ditemukan", robots: { index: false } };

/** 404 untuk URL yang tidak cocok dengan route mana pun: tampil dengan kerangka Galeri. */
export default async function NotFound() {
  const profile = await getGalleryProfile();
  return (
    <GalleryShell profile={profile}>
      <GalleryNotFound />
    </GalleryShell>
  );
}
