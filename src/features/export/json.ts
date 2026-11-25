// JSON lengkap (E11): semua tabel data, tanpa tabel auth. Daftar tabel ditulis eksplisit (allowlist);
// `json.test.ts` membandingkannya dengan model Prisma, jadi tabel baru harus diputuskan di sini:
// ikut diekspor atau masuk AUTH_TABLES. Fungsi murni (tanpa Prisma client/React/Next).

import type { Prisma } from "@prisma/client";
import { formatWib, TIMEZONE } from "@/lib/date";

export const EXPORT_FORMAT = "studio-karya-export";
/** Naikkan jika bentuk file berubah (kunci metadata atau cara tabel ditulis). */
export const EXPORT_FORMAT_VERSION = 1;

/** Tidak pernah diekspor: berisi hash password, secret 2FA, token sesi, dan jejak login. */
export const AUTH_TABLES = [
  "AdminUser",
  "Session",
  "LoginChallenge",
  "LoginAttempt",
] as const satisfies readonly Prisma.ModelName[];

/** Tabel yang diekspor, urut kira-kira mengikuti alur data (master → turunan). */
export const EXPORT_TABLES = [
  "Setting",
  "Pillar",
  "Format",
  "HookType",
  "ChecklistTemplateItem",
  "Project",
  "ProjectPhoto",
  "Idea",
  "Content",
  "ChecklistItem",
  "Post",
  "MetricSnapshot",
  "AccountSnapshot",
  "Experiment",
  "ExperimentPost",
  "WeeklyReview",
  "SuggestionDismissal",
  "Artwork",
  "ArtworkImage",
  "ArtworkContent",
  "ArtworkSlugRedirect",
  "AiGuide",
  "AiRun",
  "ThemeSetting",
] as const satisfies readonly Prisma.ModelName[];

export type ExportTable = (typeof EXPORT_TABLES)[number];
export type ExportTables = Record<ExportTable, readonly unknown[]>;

export interface JsonExport {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_FORMAT_VERSION;
  /** Waktu ekspor UTC (ISO 8601). */
  exportedAt: string;
  /** Waktu ekspor WIB dengan offset, mis. `2026-11-08T14:30:00+07:00`. */
  exportedAtWib: string;
  timezone: typeof TIMEZONE;
  notes: string[];
  counts: Record<ExportTable, number>;
  tables: ExportTables;
}

export const JSON_EXPORT_NOTES = [
  "Waktu di dalam tables disimpan dalam UTC (ISO 8601); Studio menampilkannya dalam WIB (Asia/Jakarta).",
  "File foto tidak ikut. Kolom storageKey (dan avatarKey) adalah nama file di folder unggahan server; foto ada di backup server.",
  "Data akun dan login (password, 2FA, sesi, percobaan login) sengaja tidak diekspor.",
  "File ini untuk arsip dan analisis; impor atau pulihkan dari file ini tidak tersedia.",
];

/** Susun isi file. Hanya tabel di EXPORT_TABLES yang ditulis, walau `tables` membawa kunci lain. */
export function buildJsonExport(tables: ExportTables, now: Date): JsonExport {
  const pick = <T>(fn: (table: ExportTable) => T) =>
    Object.fromEntries(EXPORT_TABLES.map((table) => [table, fn(table)])) as Record<ExportTable, T>;
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    exportedAtWib: formatWib(now, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    timezone: TIMEZONE,
    notes: JSON_EXPORT_NOTES,
    counts: pick((table) => tables[table].length),
    tables: pick((table) => tables[table]),
  };
}

/** Isi file `data.json` (rapi, 2 spasi). Date → string ISO UTC lewat JSON.stringify. */
export function jsonExportText(tables: ExportTables, now: Date): string {
  return `${JSON.stringify(buildJsonExport(tables, now), null, 2)}\n`;
}
