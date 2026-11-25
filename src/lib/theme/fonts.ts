// Daftar font terkurasi (T2). Fungsi murni: hanya id → variabel CSS + cadangan, tanpa import Next.
// Instance `next/font` (file font di-host sendiri) ada di src/features/theme/fonts.ts; nama variabel
// CSS di sana harus sama dengan `cssVariable` di sini (dicek fonts.test.ts).

export const FONT_IDS = [
  "inter",
  "inter-tight",
  "geist",
  "plus-jakarta-sans",
  "manrope",
  "dm-sans",
  "space-grotesk",
  "instrument-serif",
] as const;

export type FontId = (typeof FONT_IDS)[number];

const SANS_FALLBACK = "ui-sans-serif, system-ui, sans-serif";
const SERIF_FALLBACK = "ui-serif, Georgia, serif";

export interface FontOption {
  label: string;
  /** Variabel CSS yang dipasang kelas `next/font` di `<html>`. */
  cssVariable: `--font-${string}`;
  kind: "sans" | "serif";
  /** Ketebalan yang tersedia di file font (font variabel: rentang penuh). */
  weights: readonly number[];
}

const VARIABLE_WEIGHTS = [300, 400, 500, 600, 700, 800] as const;

export const FONT_OPTIONS: Record<FontId, FontOption> = {
  inter: { label: "Inter", cssVariable: "--font-inter", kind: "sans", weights: VARIABLE_WEIGHTS },
  "inter-tight": {
    label: "Inter Tight",
    cssVariable: "--font-inter-tight",
    kind: "sans",
    weights: VARIABLE_WEIGHTS,
  },
  geist: { label: "Geist", cssVariable: "--font-geist", kind: "sans", weights: VARIABLE_WEIGHTS },
  "plus-jakarta-sans": {
    label: "Plus Jakarta Sans",
    cssVariable: "--font-plus-jakarta-sans",
    kind: "sans",
    weights: VARIABLE_WEIGHTS,
  },
  manrope: { label: "Manrope", cssVariable: "--font-manrope", kind: "sans", weights: VARIABLE_WEIGHTS },
  "dm-sans": { label: "DM Sans", cssVariable: "--font-dm-sans", kind: "sans", weights: VARIABLE_WEIGHTS },
  "space-grotesk": {
    label: "Space Grotesk",
    cssVariable: "--font-space-grotesk",
    kind: "sans",
    weights: [300, 400, 500, 600, 700],
  },
  "instrument-serif": {
    label: "Instrument Serif",
    cssVariable: "--font-instrument-serif",
    kind: "serif",
    weights: [400],
  },
};

/** Nilai `font-family`: variabel next/font lalu cadangan sistem. */
export function fontStack(id: FontId): string {
  const font = FONT_OPTIONS[id];
  return `var(${font.cssVariable}), ${font.kind === "serif" ? SERIF_FALLBACK : SANS_FALLBACK}`;
}
