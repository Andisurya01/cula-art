// Fungsi murni untuk Buat Seri (dipakai di dialog untuk pratinjau dan di Server Action).

/** Part berikutnya = part terbesar yang sudah ada + 1 (null diabaikan). */
export function nextSeriesPart(existingParts: readonly (number | null | undefined)[]): number {
  let max = 0;
  for (const part of existingParts) {
    if (typeof part === "number" && Number.isFinite(part) && part > max) max = part;
  }
  return Math.floor(max) + 1;
}

export type SeriesItem = { part: number; title: string };

/** Judul seri: "Judul dasar — Part i" untuk i = startPart … startPart + count - 1. */
export function buildSeriesItems(baseTitle: string, startPart: number, count: number): SeriesItem[] {
  const base = baseTitle.trim();
  if (!base || !Number.isInteger(count) || count < 1) return [];
  return Array.from({ length: count }, (_, i) => {
    const part = startPart + i;
    return { part, title: `${base} — Part ${part}` };
  });
}
