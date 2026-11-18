// Daftar file ekspor yang dikenal (E11). Route `/studio/ekspor/[file]` menolak nama lain dengan 404.
// Murni dan aman di client: dipakai juga oleh tab Pengaturan "Ekspor".

import { toWibDateString } from "@/lib/date";

export const EXPORT_FILES = [
  {
    file: "ide.csv",
    base: "ide",
    title: "Bank Ide",
    description: "Semua ide: status, pilar, medium, potensi, usaha, catatan, dan link referensi.",
  },
  {
    file: "konten.csv",
    base: "konten",
    title: "Konten",
    description: "Pipeline: tahap, pilar, format, tipe hook, hook, proyek, part, checklist, dan script.",
  },
  {
    file: "post.csv",
    base: "post",
    title: "Post + metrik",
    description:
      "Satu baris per post dengan metrik H+1 dan H+7. Views TikTok dan reach Instagram di kolom terpisah, tanpa total gabungan.",
  },
  {
    file: "followers.csv",
    base: "followers",
    title: "Snapshot followers",
    description: "Followers per tanggal dan platform, plus perubahan dari snapshot sebelumnya.",
  },
  {
    file: "karya.csv",
    base: "karya",
    title: "Karya",
    description: "Karya Galeri: status, harga, ukuran, jumlah foto, dan nama file cover (tanpa file foto).",
  },
  {
    file: "data.json",
    base: "data",
    title: "Semua data (JSON)",
    description:
      "Semua tabel data Studio dan Galeri dalam satu file, tanpa data akun dan login. Foto tidak ikut, hanya nama filenya (storageKey).",
  },
] as const;

export type ExportFile = (typeof EXPORT_FILES)[number]["file"];
export type ExportFileInfo = (typeof EXPORT_FILES)[number];

export const CSV_EXPORT_FILES = EXPORT_FILES.filter((entry) => entry.file.endsWith(".csv"));
export const JSON_EXPORT_FILE = EXPORT_FILES.find((entry) => entry.file === "data.json")!;

/** Hanya nama yang persis ada di daftar (huruf kecil, tanpa path). */
export function isExportFile(value: string): value is ExportFile {
  return EXPORT_FILES.some((entry) => entry.file === value);
}

function info(file: ExportFile): ExportFileInfo {
  return EXPORT_FILES.find((entry) => entry.file === file)!;
}

/** Nama unduhan bertanggal WIB, mis. `studio-ide-2026-11-08.csv`. */
export function exportFileName(file: ExportFile, now: Date): string {
  const extension = file.slice(file.lastIndexOf(".") + 1);
  return `studio-${info(file).base}-${toWibDateString(now)}.${extension}`;
}

export function exportContentType(file: ExportFile): string {
  return file.endsWith(".json") ? "application/json; charset=utf-8" : "text/csv; charset=utf-8";
}
