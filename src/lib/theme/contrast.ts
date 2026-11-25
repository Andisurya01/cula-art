// Rasio kontras WCAG 2.x (T4). Fungsi murni.

import type { ColorKey, ColorSet, ThemeTokens } from "./schema";

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminans relatif warna `#RRGGBB` (0 = hitam, 1 = putih). */
export function relativeLuminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = channel((n >> 16) & 0xff);
  const g = channel((n >> 8) & 0xff);
  const b = channel(n & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rasio kontras 1-21. Urutan argumen bebas. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Batas: 4,5 teks biasa; 3 untuk judul besar (judul baris kedua) dan indikator fokus (dipakai penuh). */
export type ContrastMinimum = 4.5 | 3;

export interface ContrastPair {
  id: string;
  label: string;
  fg: ColorKey;
  bg: ColorKey;
  min: ContrastMinimum;
  /**
   * Latar tipis: latar = warna teks dengan opasitas ini di atas `bg` (badge `bg-warning/10`,
   * tombol destruktif `/10`, hover `/15`). Dicek pada 15% (kasus terburuk).
   */
  tint?: number;
}

const STATUS_LABELS = { destructive: "Destruktif", success: "Sukses", warning: "Peringatan" } as const;
const BASE_LABELS = { background: "latar", surface: "kartu", secondary: "sekunder" } as const;

/** Pasangan teks/latar yang dicek di menu Tampilan (per mode). */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { id: "text-background", label: "Teks di latar", fg: "text", bg: "background", min: 4.5 },
  { id: "text-surface", label: "Teks di kartu", fg: "text", bg: "surface", min: 4.5 },
  { id: "muted-background", label: "Teks redup di latar", fg: "textMuted", bg: "background", min: 4.5 },
  { id: "muted-surface", label: "Teks redup di kartu", fg: "textMuted", bg: "surface", min: 4.5 },
  { id: "muted-secondary", label: "Teks redup di sekunder", fg: "textMuted", bg: "secondary", min: 4.5 },
  { id: "heading2-background", label: "Judul baris kedua di latar", fg: "headingSecondary", bg: "background", min: 3 },
  { id: "heading2-surface", label: "Judul baris kedua di kartu", fg: "headingSecondary", bg: "surface", min: 3 },
  { id: "primary", label: "Teks primer", fg: "primaryText", bg: "primary", min: 4.5 },
  { id: "secondary", label: "Teks sekunder", fg: "secondaryText", bg: "secondary", min: 4.5 },
  { id: "accent", label: "Teks aksen", fg: "accentText", bg: "accent", min: 4.5 },
  { id: "destructive-surface", label: "Destruktif di kartu", fg: "destructive", bg: "surface", min: 4.5 },
  { id: "destructive-background", label: "Destruktif di latar", fg: "destructive", bg: "background", min: 4.5 },
  { id: "success-surface", label: "Sukses di kartu", fg: "success", bg: "surface", min: 4.5 },
  { id: "warning-surface", label: "Peringatan di kartu", fg: "warning", bg: "surface", min: 4.5 },
  ...(["destructive", "success", "warning"] as const).flatMap((fg) =>
    (["background", "surface", "secondary"] as const).map(
      (bg): ContrastPair => ({
        id: `${fg}-tint-${bg}`,
        label: `${STATUS_LABELS[fg]} di latar tipis (${BASE_LABELS[bg]})`,
        fg,
        bg,
        min: 4.5,
        tint: 0.15,
      }),
    ),
  ),
  { id: "bento-blue", label: "Bento biru", fg: "bentoBlueText", bg: "bentoBlue", min: 4.5 },
  { id: "bento-lime", label: "Bento lime", fg: "bentoLimeText", bg: "bentoLime", min: 4.5 },
  { id: "bento-purple", label: "Bento ungu", fg: "bentoPurpleText", bg: "bentoPurple", min: 4.5 },
  { id: "bento-dark", label: "Bento gelap", fg: "bentoDarkText", bg: "bentoDark", min: 4.5 },
  { id: "ring-background", label: "Fokus di latar", fg: "ring", bg: "background", min: 3 },
];

export interface ContrastResult extends ContrastPair {
  ratio: number;
  ok: boolean;
}

/** Campur dua warna `#RRGGBB` (`alpha` = porsi `fg`), seperti `bg-x/10` di atas latar. */
export function mixHex(fg: string, bg: string, alpha: number): string {
  const a = Number.parseInt(fg.slice(1), 16);
  const b = Number.parseInt(bg.slice(1), 16);
  const channel = (shift: number) =>
    Math.round(((a >> shift) & 0xff) * alpha + ((b >> shift) & 0xff) * (1 - alpha));
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/** Level yang boleh memakai judul dua warna (`TwoToneHeading`). */
const TWO_TONE_LEVELS = ["display", "h1", "h2", "h3"] as const;

/**
 * Batas judul baris kedua: 3:1 hanya jika judul dua warna selalu "teks besar" WCAG, yaitu ukuran HP
 * terkecil level display-h3 ≥ 24 px, atau ≥ 18,66 px dengan ketebalan ≥ 700. Selain itu 4,5:1.
 */
export function headingSecondaryMinimum(typography?: ThemeTokens["typography"]): ContrastMinimum {
  if (!typography) return 3;
  const large = TWO_TONE_LEVELS.every((level) => {
    const t = typography.levels[level];
    return t.sizeMobile >= 24 || (t.sizeMobile >= 18.66 && t.weight >= 700);
  });
  return large ? 3 : 4.5;
}

/**
 * Semua pasangan untuk satu mode. `ok` memakai rasio mentah (WCAG: jangan dibulatkan ke atas).
 * `typography` (opsional) menentukan batas judul baris kedua (lihat `headingSecondaryMinimum`).
 */
export function checkContrast(colors: ColorSet, typography?: ThemeTokens["typography"]): ContrastResult[] {
  const headingMin = headingSecondaryMinimum(typography);
  return CONTRAST_PAIRS.map((pair) => {
    const bg = pair.tint ? mixHex(colors[pair.fg], colors[pair.bg], pair.tint) : colors[pair.bg];
    const ratio = contrastRatio(colors[pair.fg], bg);
    const min = pair.fg === "headingSecondary" ? headingMin : pair.min;
    return { ...pair, min, ratio, ok: ratio >= min };
  });
}

/** Tampilan rasio, dibulatkan ke bawah 2 desimal (4,49 tidak tampil sebagai 4,5). */
export function formatRatio(ratio: number): string {
  // Tanpa Intl, supaya hasil server dan browser sama persis (hydration).
  return `${(Math.floor(ratio * 100) / 100).toFixed(2).replace(".", ",")}:1`;
}
