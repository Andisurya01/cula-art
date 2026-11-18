import {
  formatCount,
  formatFollowRate,
  formatPercent,
  formatRelative,
  formatScore,
  formatSigned,
} from "@/features/metrics/format";

// Bagian bersama fitur AI analisis (Review Mingguan → Draf ringkasan, detail post → Kenapa?).
// Semua angka sudah dihitung src/lib/analytics; di sini hanya diformat apa adanya. Grup < 3 post
// dikirim tanpa median dan berlabel NOT_ENOUGH_DATA, supaya AI tidak menarik kesimpulan darinya (E9).

export const NOT_ENOUGH_DATA = "data belum cukup";

/** Aturan analisis yang ditempel di setiap tugas analisis (bagian dari teks tugas berversi). */
export const ANALYSIS_RULES = `Aturan angka (wajib):
- Semua angka di <data> sudah dihitung aplikasi. Kutip apa adanya; jangan menghitung ulang, menjumlahkan, merata-ratakan, atau membuat angka baru.
- Skor relatif 1,00x = sama dengan biasanya (median skor sampai 10 post sebelumnya di platform yang sama). 1,50x = 50% di atas biasanya.
- TikTok dan Instagram dibahas terpisah. Jangan menjumlahkan atau membandingkan angka antarplatform; views TikTok dan reach Instagram adalah ukuran yang berbeda.
- Grup berlabel "${NOT_ENOUGH_DATA}" tidak boleh dijadikan dasar kesimpulan. Jika grup itu relevan, sebutkan bahwa datanya belum cukup.
- Jika data untuk menjawab tidak ada, katakan begitu di field "notes", jangan menebak.`;

export type GroupStat = {
  /** Nama dimensi, mis. "Pilar", "Jam". */
  dimension: string;
  label: string;
  postCount: number;
  /** Median skor relatif; `null` jika grup belum punya post. */
  median: number | null;
  /** ≥ 3 post. */
  enoughData: boolean;
};

/** Satu baris grup: median hanya untuk grup berdata cukup. */
export function groupLine(group: GroupStat): string {
  const name = `${group.dimension} ${group.label}`;
  if (!group.enoughData || group.median === null) {
    return `- ${name}: ${group.postCount} post, ${NOT_ENOUGH_DATA}`;
  }
  return `- ${name}: median skor relatif ${formatRelative(group.median)} dari ${group.postCount} post`;
}

export type MetricNumbers = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  follows: number;
};

export function metricLines(viewsLabel: string, m: MetricNumbers): string {
  return [
    `- ${viewsLabel}: ${formatCount(m.views)}`,
    `- Likes: ${formatCount(m.likes)}, komentar: ${formatCount(m.comments)}, shares: ${formatCount(m.shares)}, saves: ${formatCount(m.saves)}, followers dari post: ${formatCount(m.follows)}`,
  ].join("\n");
}

export const fmt = {
  count: formatCount,
  signed: formatSigned,
  percent: formatPercent,
  relative: formatRelative,
  score: formatScore,
  followRate: formatFollowRate,
};
