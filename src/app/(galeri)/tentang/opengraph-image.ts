import { galleryOgImage, OG_CONTENT_TYPE, OG_IMAGE_SIZE } from "@/features/gallery/og-image";

export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Karya unggulan";

export default function Image() {
  return galleryOgImage();
}
