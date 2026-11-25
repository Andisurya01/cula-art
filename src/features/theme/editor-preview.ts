// Variabel CSS untuk kontainer pratinjau menu Tampilan. Fungsi murni, tanpa React.

import { cssNumber, FLUID_VIEWPORT, themeVariables } from "@/lib/theme/css";
import { TYPE_LEVELS, type ThemeTokens } from "@/lib/theme/schema";

export type PreviewMode = "light" | "dark";
export type PreviewWidth = "desktop" | "mobile";

/** Lebar kanvas pratinjau (px), sama dengan titik ukuran HP dan desktop di `fluidSize`. */
export const PREVIEW_CANVAS_WIDTH: Record<PreviewWidth, number> = {
  mobile: FLUID_VIEWPORT.mobile,
  desktop: FLUID_VIEWPORT.desktop,
};

/**
 * `themeVariables` untuk satu mode. Ukuran judul fluid memakai `vw` layar asli, padahal pratinjau
 * adalah kanvas selebar HP/desktop yang diperkecil; jadi `--type-<level>-size` ditimpa dengan ukuran
 * tetap untuk lebar yang dipilih (dalam rem). Lempar error jika token tidak lolos schema.
 */
export function previewVariables(
  tokens: ThemeTokens,
  mode: PreviewMode,
  width: PreviewWidth,
): Record<string, string> {
  const vars = themeVariables(tokens, mode);
  for (const level of TYPE_LEVELS) {
    const t = tokens.typography.levels[level];
    const px = width === "mobile" ? t.sizeMobile : t.sizeDesktop;
    vars[`--type-${level}-size`] = `${cssNumber(px / 16)}rem`;
  }
  return vars;
}

/** Skala kanvas agar muat di bingkai (maks. 1, tidak diperbesar). */
export function previewZoom(frameWidth: number | null, width: PreviewWidth): number {
  if (!frameWidth || frameWidth <= 0) return 1;
  return Math.min(1, Math.round((frameWidth / PREVIEW_CANVAS_WIDTH[width]) * 1000) / 1000);
}
