import { formatWib } from "@/lib/date";

const DATE_PATTERN = "d MMM yyyy";

/** Rentang tanggal proyek dalam WIB, atau `null` jika keduanya kosong. */
export function formatProjectDates(startDate: Date | null, endDate: Date | null): string | null {
  if (startDate && endDate) {
    return `${formatWib(startDate, DATE_PATTERN)} – ${formatWib(endDate, DATE_PATTERN)}`;
  }
  if (startDate) return `Mulai ${formatWib(startDate, DATE_PATTERN)}`;
  if (endDate) return `Selesai ${formatWib(endDate, DATE_PATTERN)}`;
  return null;
}
