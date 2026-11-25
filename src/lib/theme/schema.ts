// Skema token tema (T3-T9). Dipakai client (form menu Tampilan) dan server (aksi simpan, baca DB).
// Semua objek `.strict()`: kunci yang tidak dikenal ditolak, jadi tidak ada teks bebas yang bisa
// menumpang ke CSS. Nilai hanya hex #RRGGBB, angka dalam rentang, boolean, atau enum.

import { z } from "zod";
import { FONT_IDS } from "./fonts";

export const THEME_VERSION = 1;

export const THEME_MODES = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** Kunci warna per mode (T3). Urutan = urutan di menu dan di CSS. */
export const COLOR_KEYS = [
  // Dasar
  "background",
  "surface",
  "text",
  "textMuted",
  "border",
  "input",
  "ring",
  // Aksi dan status
  "primary",
  "primaryText",
  "secondary",
  "secondaryText",
  "accent",
  "accentText",
  "destructive",
  "success",
  "warning",
  // Bento
  "bentoBlue",
  "bentoBlueText",
  "bentoLime",
  "bentoLimeText",
  "bentoPurple",
  "bentoPurpleText",
  "bentoDark",
  "bentoDarkText",
  // Judul dua warna
  "headingSecondary",
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export const TYPE_LEVELS = ["display", "h1", "h2", "h3", "h4", "h5", "h6"] as const;
export type TypeLevel = (typeof TYPE_LEVELS)[number];

export const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800] as const;
export type FontWeight = (typeof FONT_WEIGHTS)[number];

/** Easing dipilih dari daftar (T7), bukan teks bebas. Nilai CSS-nya di `EASINGS`. */
export const EASING_IDS = ["smooth", "standard", "emphasized", "decelerate", "in-out", "linear"] as const;
export type EasingId = (typeof EASING_IDS)[number];

export const EASINGS: Record<EasingId, { label: string; css: string }> = {
  smooth: { label: "Halus (bawaan)", css: "cubic-bezier(0.22, 1, 0.36, 1)" },
  standard: { label: "Standar", css: "cubic-bezier(0.4, 0, 0.2, 1)" },
  emphasized: { label: "Tegas", css: "cubic-bezier(0.2, 0, 0, 1)" },
  decelerate: { label: "Melambat", css: "cubic-bezier(0, 0, 0.2, 1)" },
  "in-out": { label: "Masuk-keluar", css: "cubic-bezier(0.65, 0, 0.35, 1)" },
  linear: { label: "Linear", css: "linear" },
};

/** Rentang angka; dipakai juga oleh input di menu Tampilan (min/max/step). */
export const RANGES = {
  headingSize: { min: 12, max: 200, step: 1 },
  bodySize: { min: 10, max: 32, step: 1 },
  labelSize: { min: 9, max: 20, step: 1 },
  lineHeight: { min: 0.8, max: 2, step: 0.01 },
  letterSpacing: { min: -0.1, max: 0.3, step: 0.005 },
  radius: { min: 0, max: 64, step: 1 },
  durationFast: { min: 0, max: 1000, step: 10 },
  durationBase: { min: 0, max: 1500, step: 10 },
  durationSlow: { min: 0, max: 3000, step: 10 },
} as const;

type Range = { min: number; max: number };

const int = (range: Range) => z.number().int().min(range.min).max(range.max);
const decimal = (range: Range) => z.number().min(range.min).max(range.max);

/** `#RRGGBB`, disimpan huruf besar supaya CSS deterministik. */
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Warna harus berformat #RRGGBB.")
  .transform((value) => value.toUpperCase());

const weightSchema = z
  .number()
  .int()
  .refine((value): value is FontWeight => (FONT_WEIGHTS as readonly number[]).includes(value), {
    message: "Ketebalan tidak dikenal.",
  });

export const colorSetSchema = z
  .object(Object.fromEntries(COLOR_KEYS.map((key) => [key, hexColorSchema])) as Record<
    ColorKey,
    typeof hexColorSchema
  >)
  .strict();

const typeLevelSchema = z
  .object({
    sizeDesktop: int(RANGES.headingSize),
    sizeMobile: int(RANGES.headingSize),
    weight: weightSchema,
    lineHeight: decimal(RANGES.lineHeight),
    letterSpacing: decimal(RANGES.letterSpacing),
  })
  .strict();

const bodySchema = z
  .object({
    sizeLg: int(RANGES.bodySize),
    sizeBase: int(RANGES.bodySize),
    sizeSm: int(RANGES.bodySize),
    sizeCaption: int(RANGES.bodySize),
    weight: weightSchema,
    lineHeight: decimal(RANGES.lineHeight),
    letterSpacing: decimal(RANGES.letterSpacing),
  })
  .strict();

const labelSchema = z
  .object({
    size: int(RANGES.labelSize),
    weight: weightSchema,
    lineHeight: decimal(RANGES.lineHeight),
    letterSpacing: decimal(RANGES.letterSpacing),
    uppercase: z.boolean(),
  })
  .strict();

const shapeSchema = z
  .object({
    card: int(RANGES.radius),
    cardNested: int(RANGES.radius),
    button: int(RANGES.radius),
    buttonPill: z.boolean(),
    input: int(RANGES.radius),
    badge: int(RANGES.radius),
    badgePill: z.boolean(),
    image: int(RANGES.radius),
    dialog: int(RANGES.radius),
  })
  .strict();

const motionSchema = z
  .object({
    fast: int(RANGES.durationFast),
    base: int(RANGES.durationBase),
    slow: int(RANGES.durationSlow),
    easing: z.enum(EASING_IDS),
  })
  .strict();

export const themeTokensSchema = z
  .object({
    version: z.literal(THEME_VERSION),
    defaultMode: z.enum(THEME_MODES),
    colors: z.object({ light: colorSetSchema, dark: colorSetSchema }).strict(),
    typography: z
      .object({
        headingFont: z.enum(FONT_IDS),
        bodyFont: z.enum(FONT_IDS),
        levels: z
          .object(Object.fromEntries(TYPE_LEVELS.map((level) => [level, typeLevelSchema])) as Record<
            TypeLevel,
            typeof typeLevelSchema
          >)
          .strict(),
        body: bodySchema,
        label: labelSchema,
      })
      .strict(),
    shape: shapeSchema,
    motion: motionSchema,
  })
  .strict();

export type ThemeTokens = z.output<typeof themeTokensSchema>;
export type ThemeTokensInput = z.input<typeof themeTokensSchema>;
export type ColorSet = ThemeTokens["colors"]["light"];
export type TypeLevelTokens = ThemeTokens["typography"]["levels"]["h1"];

/** Parse aman dari nilai mentah (JSON string dari DB atau objek dari client). `null` jika tidak valid. */
export function parseThemeTokens(raw: unknown): ThemeTokens | null {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const result = themeTokensSchema.safeParse(value);
  return result.success ? result.data : null;
}
