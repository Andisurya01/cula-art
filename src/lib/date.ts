// Helper tanggal: semua waktu disimpan UTC, dihitung dan ditampilkan dalam Asia/Jakarta (WIB).
// Minggu dimulai Senin. WIB tidak punya DST, jadi menambah 1 hari WIB = menambah tepat 24 jam.
// Jangan pakai `addDays` date-fns untuk instant WIB: ia mengikuti zona waktu runtime (bisa ber-DST).

import { startOfWeek } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const TIMEZONE = "Asia/Jakarta";

const DAY_MS = 86_400_000;

/** Tambah n hari WIB (n × 24 jam), aman di runtime dengan zona ber-DST. */
export function addWibDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Hari ISO: 1 = Senin … 7 = Minggu. */
export type IsoDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const DAY_LABELS: Record<IsoDay, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

export const DAY_SHORT_LABELS: Record<IsoDay, string> = {
  1: "Sen",
  2: "Sel",
  3: "Rab",
  4: "Kam",
  5: "Jum",
  6: "Sab",
  7: "Min",
};

/** Format tanggal dalam WIB dengan locale Indonesia, mis. `formatWib(d, "EEEE, d MMM HH.mm")`. */
export function formatWib(date: Date, pattern: string): string {
  return formatInTimeZone(date, TIMEZONE, pattern, { locale: localeId });
}

/** Tanggal WIB sebagai `yyyy-MM-dd`. */
export function toWibDateString(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
}

/** Jam WIB sebagai `HH:mm`. */
export function toWibTimeString(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, "HH:mm");
}

/** Nilai untuk `<input type="datetime-local">` dalam WIB: `yyyy-MM-ddTHH:mm`. */
export function toWibInputValue(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd'T'HH:mm");
}

/** Gabungkan tanggal (`yyyy-MM-dd`) dan jam (`HH:mm`) WIB menjadi instant UTC. */
export function wibToUtc(dateStr: string, timeStr = "00:00"): Date {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, TIMEZONE);
}

/** Parse nilai `datetime-local` (`yyyy-MM-ddTHH:mm`) yang diartikan sebagai WIB. */
export function parseWibInputValue(value: string): Date {
  const [dateStr, timeStr = "00:00"] = value.split("T");
  return wibToUtc(dateStr, timeStr.slice(0, 5));
}

/** True jika `yyyy-MM-dd` adalah tanggal kalender yang benar-benar ada (menolak 2026-02-31). */
export function isValidWibDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = wibToUtc(value);
  return !Number.isNaN(date.getTime()) && toWibDateString(date) === value;
}

/** True jika `yyyy-MM-ddTHH:mm` adalah tanggal-jam WIB yang valid (menolak 24:00, 2026-02-31). */
export function isValidWibInputValue(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const date = parseWibInputValue(value);
  return !Number.isNaN(date.getTime()) && toWibInputValue(date) === value;
}

/** Hari ISO (1 = Senin) dari sebuah instant, dihitung dalam WIB. */
export function wibIsoDay(date: Date): IsoDay {
  const day = toZonedTime(date, TIMEZONE).getDay(); // 0 = Minggu
  return (day === 0 ? 7 : day) as IsoDay;
}

/** Awal hari (00.00 WIB) dari sebuah instant, sebagai instant UTC. */
export function startOfWibDay(date: Date): Date {
  return wibToUtc(toWibDateString(date));
}

/** Senin 00.00 WIB dari minggu yang memuat `date`, sebagai instant UTC. */
export function startOfWibWeek(date: Date): Date {
  const zoned = toZonedTime(date, TIMEZONE);
  const monday = startOfWeek(zoned, { weekStartsOn: 1 });
  return fromZonedTime(monday, TIMEZONE);
}

/** Senin 00.00 WIB minggu berikutnya (batas atas eksklusif). */
export function endOfWibWeek(date: Date): Date {
  return addWibDays(startOfWibWeek(date), 7);
}

/** Tujuh awal hari (Senin…Minggu) dari minggu yang memuat `date`. */
export function wibWeekDays(date: Date): Date[] {
  const start = startOfWibWeek(date);
  return Array.from({ length: 7 }, (_, i) => addWibDays(start, i));
}

/** Tanggal 1 pukul 00.00 WIB dari bulan yang memuat `date`. */
export function startOfWibMonth(date: Date): Date {
  return wibToUtc(`${formatInTimeZone(date, TIMEZONE, "yyyy-MM")}-01`);
}

/**
 * Grid kalender bulan: semua hari dari Senin sebelum/pada tanggal 1
 * sampai Minggu setelah/pada hari terakhir bulan.
 */
export function wibMonthGrid(date: Date): Date[] {
  const monthStart = startOfWibMonth(date);
  const nextMonth = startOfWibMonth(addWibDays(monthStart, 32));
  const gridStart = startOfWibWeek(monthStart);
  const gridEnd = endOfWibWeek(addWibDays(nextMonth, -1));
  const days = Math.round((gridEnd.getTime() - gridStart.getTime()) / DAY_MS);
  return Array.from({ length: days }, (_, i) => addWibDays(gridStart, i));
}

/** Selisih hari kalender WIB (`to - from`). */
export function wibDaysBetween(from: Date, to: Date): number {
  const a = toWibDateString(from);
  const b = toWibDateString(to);
  return Math.round((wibToUtc(b).getTime() - wibToUtc(a).getTime()) / 86_400_000);
}

export const STALE_AFTER_DAYS = 7;

/** Kartu "macet": lebih dari 7 hari di stage yang sama. */
export function isStale(stageChangedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - stageChangedAt.getTime() > STALE_AFTER_DAYS * 86_400_000;
}

/** Jumlah hari penuh sejak `date`. */
export function daysSince(date: Date, now: Date = new Date()): number {
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}
