// og:image detail karya: cover sebagai JPEG 1200×630 (di-cache bersama halaman, ikut revalidateGallery).

import { artworkOgImage, OG_CONTENT_TYPE, OG_IMAGE_SIZE } from "@/features/gallery/og-image";

export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Foto karya";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  return artworkOgImage((await params).slug);
}
