import "server-only";
import sharp from "sharp";
import { readStoredFile } from "@/lib/storage";

/** Sisi terpanjang foto yang dikirim ke AI (±1.000 token per foto). */
export const AI_PHOTO_MAX_EDGE = 1024;

/** File unggahan (sudah WebP tanpa EXIF) → WebP lebih kecil dalam base64. null jika file tidak ada. */
export async function loadPromptPhoto(storageKey: string): Promise<string | null> {
  const file = await readStoredFile(storageKey);
  if (!file) return null;
  const data = await sharp(file)
    .resize({ width: AI_PHOTO_MAX_EDGE, height: AI_PHOTO_MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  return data.toString("base64");
}
