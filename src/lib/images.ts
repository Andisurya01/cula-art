import "server-only";
// Pemrosesan foto unggahan dengan sharp: putar sesuai EXIF, kecilkan ke sisi terpanjang 2400 px,
// WebP kualitas 82, dan buang SEMUA metadata (EXIF, GPS, ICC, XMP). Lihat PRD "Unggah file".

import sharp from "sharp";
import { deleteFile, generateStorageKey, saveFile } from "./storage";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 2400;
export const WEBP_QUALITY = 82;
/** Batas piksel input (±80 MP) supaya file kecil berisi gambar raksasa tidak menghabiskan memori. */
const MAX_INPUT_PIXELS = 80_000_000;

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export type DetectedImageType = "jpeg" | "png" | "webp" | "heic" | "avif";

export class ImageUploadError extends Error {}

export const IMAGE_ERRORS = {
  tooLarge: "Ukuran foto maksimal 15 MB.",
  empty: "File kosong atau tidak terbaca.",
  heic:
    "Foto HEIC belum didukung. Di iPhone pilih Pengaturan → Kamera → Format → Paling Kompatibel, " +
    "atau bagikan/ekspor foto sebagai JPEG, lalu unggah lagi.",
  unsupported: "Format tidak didukung. Pakai foto JPG, PNG, atau WebP.",
  corrupt: "Foto rusak atau tidak bisa dibaca.",
} as const;

/** Tipe gambar dari isi file (magic bytes), bukan dari nama atau MIME kiriman browser. */
export function detectImageType(data: Uint8Array): DetectedImageType | null {
  const b = data;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (
    b.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => b[i] === byte)
  ) {
    return "png";
  }
  const ascii = (start: number, end: number) => String.fromCharCode(...b.slice(start, end));
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (b.length >= 12 && ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (["avif", "avis"].includes(brand)) return "avif";
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand)) return "heic";
  }
  return null;
}

/** Pesan error untuk file yang tidak boleh diproses, atau null jika boleh. */
export function imageProblem(data: Uint8Array): string | null {
  if (data.length === 0) return IMAGE_ERRORS.empty;
  if (data.length > MAX_UPLOAD_BYTES) return IMAGE_ERRORS.tooLarge;
  const type = detectImageType(data);
  if (type === "heic") return IMAGE_ERRORS.heic;
  if (type !== "jpeg" && type !== "png" && type !== "webp") return IMAGE_ERRORS.unsupported;
  return null;
}

export type ProcessedImage = { data: Buffer; width: number; height: number };

/** Proses ulang foto. Melempar ImageUploadError berisi pesan untuk pengguna. */
export async function processImage(input: Uint8Array): Promise<ProcessedImage> {
  const problem = imageProblem(input);
  if (problem) throw new ImageUploadError(problem);
  try {
    // Tanpa .withMetadata()/.keepMetadata(), sharp tidak menyalin metadata apa pun ke output.
    const { data, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
      .rotate()
      .resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    console.error("sharp gagal memproses foto", error);
    throw new ImageUploadError(IMAGE_ERRORS.corrupt);
  }
}

export type StoredImage = { storageKey: string; width: number; height: number; bytes: number };

/** Proses + simpan dengan nama acak. Dipakai Route Handler unggah (Karya, Proyek, foto profil). */
export async function saveUploadedImage(file: Blob): Promise<StoredImage> {
  if (file.size > MAX_UPLOAD_BYTES) throw new ImageUploadError(IMAGE_ERRORS.tooLarge);
  const processed = await processImage(new Uint8Array(await file.arrayBuffer()));
  const storageKey = generateStorageKey("webp");
  await saveFile(storageKey, processed.data);
  return { storageKey, width: processed.width, height: processed.height, bytes: processed.data.length };
}

/** Hapus file yang baru disimpan jika langkah berikutnya (mis. insert DB) gagal. */
export async function discardStoredImage(image: StoredImage): Promise<void> {
  await deleteFile(image.storageKey).catch(() => undefined);
}

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/**
 * Gambar Open Graph JPEG 1200×630 (dipotong tengah) dari foto tersimpan. JPEG, bukan WebP, karena
 * tidak semua aplikasi (mis. pratinjau tautan WhatsApp) menampilkan WebP. Tanpa foto → bidang polos.
 */
export async function renderOgImage(source: Uint8Array | null): Promise<Buffer> {
  const base = source
    ? sharp(source, { limitInputPixels: MAX_INPUT_PIXELS }).resize({ ...OG_IMAGE_SIZE, fit: "cover", position: "attention" })
    : sharp({ create: { ...OG_IMAGE_SIZE, channels: 3, background: { r: 245, g: 243, b: 239 } } });
  return base.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
}
