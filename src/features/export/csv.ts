// CSV untuk Excel berlocale Indonesia (E11 di docs/FASE-5.md): pemisah `;`, BOM UTF-8, baris CRLF,
// desimal koma, waktu WIB. Fungsi murni (tanpa Prisma/React/Next), aman dipakai di test.

import { formatWib, toWibDateString } from "@/lib/date";

export const CSV_SEPARATOR = ";";
/** BOM UTF-8: tanpa ini Excel membaca file sebagai ANSI dan huruf non-ASCII rusak. */
export const CSV_BOM = "﻿";
export const CSV_NEWLINE = "\r\n";

/** Desimal maksimal di sel angka (mis. 12,3456). */
export const CSV_DECIMALS = 4;

/**
 * Nilai satu sel. Angka tetap `number` sampai diformat (desimal koma, tanpa pemisah ribuan) dan
 * tidak pernah diberi awalan anti-formula, jadi angka negatif tetap angka. Teks dilindungi.
 */
export type CsvValue = string | number | boolean | null | undefined;

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => CsvValue;
}

// Excel/LibreOffice mengeksekusi sel yang diawali =, +, -, @ (juga setelah spasi), tab, atau CR.
const FORMULA_START = /^[\t\r]|^\s*[=+\-@]/;
// Bilangan biasa (mis. "-12" atau "+3,5") tidak bisa menjadi formula; dibiarkan apa adanya.
const PLAIN_NUMBER = /^[-+]?\d+(?:[.,]\d+)?$/;
const NEEDS_QUOTES = /[;"\r\n]|^\s|\s$/;

/** Teks yang bisa dibaca sebagai formula diberi awalan `'` supaya tampil sebagai teks. */
export function protectFormula(text: string): string {
  if (!FORMULA_START.test(text) || PLAIN_NUMBER.test(text)) return text;
  return `'${text}`;
}

/** Angka untuk Excel Indonesia: koma desimal, tanpa pemisah ribuan. NaN/Infinity → kosong. */
export function formatCsvNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  const factor = 10 ** CSV_DECIMALS;
  const rounded = Math.round(value * factor) / factor;
  return String(rounded === 0 ? 0 : rounded).replace(".", ",");
}

/** Satu sel siap tulis: diformat, dilindungi dari formula, lalu dikutip jika perlu. */
export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let text: string;
  if (typeof value === "number") text = formatCsvNumber(value);
  else if (typeof value === "boolean") text = value ? "Ya" : "Tidak";
  else text = protectFormula(value);
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Baris-baris (termasuk header) → isi file CSV lengkap dengan BOM; setiap baris diakhiri CRLF. */
export function toCsv(rows: readonly (readonly CsvValue[])[]): string {
  return CSV_BOM + rows.map((row) => row.map(csvCell).join(CSV_SEPARATOR) + CSV_NEWLINE).join("");
}

/** Header dari kolom, lalu satu baris per data. Data kosong → hanya baris header. */
export function buildCsv<T>(columns: readonly CsvColumn<T>[], rows: readonly T[]): string {
  return toCsv([
    columns.map((column) => column.header),
    ...rows.map((row) => columns.map((column) => column.value(row))),
  ]);
}

/** Waktu WIB `yyyy-MM-dd HH:mm` (dikenali Excel sebagai tanggal-jam). */
export function csvDateTime(date: Date | null | undefined): string | null {
  return date ? formatWib(date, "yyyy-MM-dd HH:mm") : null;
}

/** Tanggal WIB `yyyy-MM-dd` (snapshot followers). */
export function csvDate(date: Date | null | undefined): string | null {
  return date ? toWibDateString(date) : null;
}
