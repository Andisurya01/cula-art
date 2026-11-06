// Spesifikasi grafik Studio (skill dataviz). Hanya dipakai Studio; Galeri tidak boleh memuat Recharts.
// Warna mengikuti entitas: TikTok selalu biru, Instagram selalu oranye, juga saat data difilter.
// Teks grafik memakai token teks, tidak pernah warna seri.

import type { Platform } from "@prisma/client";

export const SERIES_COLORS: Record<Platform, string> = {
  TIKTOK: "var(--series-tiktok)",
  INSTAGRAM: "var(--series-instagram)",
};

export const CHART_TOKENS = {
  surface: "var(--card)",
  grid: "var(--border)",
  axisText: "var(--muted-foreground)",
  text: "var(--foreground)",
  hover: "var(--muted)",
} as const;

export const AXIS_FONT_SIZE = 11;
export const LABEL_FONT_SIZE = 12;

/** Batang tidak lebih tebal dari 24 px. */
export const BAR_THICKNESS = 20;
export const BAR_ROW_HEIGHT = 44;

/** Grup "data belum cukup" tetap terlihat, tetapi jelas lebih redup. */
export const DIMMED_OPACITY = 0.35;
