// Format angka UI metrik (fungsi murni, aman di client dan server). Nilai null atau tidak hingga → "—".
// Jangan pakai `notation: "compact"` Intl: hasilnya bisa beda antara Node dan browser (hydration).

export const EMPTY_VALUE = "—";

const integerFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const twoDecimals = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const upToOneDecimal = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Jumlah penuh: `12.345`. */
export function formatCount(value: number | null | undefined): string {
  return isNumber(value) ? integerFormat.format(value) : EMPTY_VALUE;
}

/** Jumlah ringkas untuk sumbu dan tempat sempit: `950`, `12,3 rb`, `1,2 jt`. */
export function formatCompact(value: number | null | undefined): string {
  if (!isNumber(value)) return EMPTY_VALUE;
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${upToOneDecimal.format(value / 1_000_000)} jt`;
  if (abs >= 1_000) return `${upToOneDecimal.format(value / 1_000)} rb`;
  return integerFormat.format(value);
}

/**
 * Format tick sumbu. Ringkas hanya jika tick tidak akan tampil kembar: followers 1.230-1.249 semuanya
 * jadi `1,2 rb`, jadi rentang sempit memakai angka penuh. Resolusi `formatCompact`: 100 di bawah sejuta,
 * 100.000 mulai sejuta; sumbu punya sekitar 5 tick.
 */
export function axisTickFormatter(values: readonly number[]): (value: number) => string {
  if (values.length === 0) return formatCompact;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const resolution = Math.max(Math.abs(min), Math.abs(max)) >= 1_000_000 ? 100_000 : 100;
  return max - min >= resolution * 8 ? formatCompact : formatCount;
}

/** Selisih bertanda: `+123`, `−10`, `0`. */
export function formatSigned(value: number | null | undefined): string {
  if (!isNumber(value)) return EMPTY_VALUE;
  if (value > 0) return `+${integerFormat.format(value)}`;
  if (value < 0) return `−${integerFormat.format(-value)}`;
  return "0";
}

/** Persen satu desimal: `8,0%` (ER, save rate, share rate, completion rate). */
export function formatPercent(value: number | null | undefined): string {
  return isNumber(value) ? `${oneDecimal.format(value)}%` : EMPTY_VALUE;
}

/** Skor konten: `150,0`. */
export function formatScore(value: number | null | undefined): string {
  return isNumber(value) ? oneDecimal.format(value) : EMPTY_VALUE;
}

/** Skor relatif: `1,50x`. */
export function formatRelative(value: number | null | undefined): string {
  return isNumber(value) ? `${twoDecimals.format(value)}x` : EMPTY_VALUE;
}

/** Follow rate per 1.000 views: `4,0`. */
export function formatFollowRate(value: number | null | undefined): string {
  return isNumber(value) ? oneDecimal.format(value) : EMPTY_VALUE;
}

/** Waktu tonton: `8,3 dtk`. */
export function formatSeconds(value: number | null | undefined): string {
  return isNumber(value) ? `${upToOneDecimal.format(value)} dtk` : EMPTY_VALUE;
}

/** Post per minggu: `2,5`. */
export function formatPerWeek(value: number | null | undefined): string {
  return isNumber(value) ? upToOneDecimal.format(value) : EMPTY_VALUE;
}
